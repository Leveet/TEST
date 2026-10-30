import 'reflect-metadata';
import 'dotenv/config';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { createDatabaseClient, type DatabaseClient } from '../src/database/client.js';
import { seedProfile } from '../prisma/seed-profile.js';
import { profileData } from '../data/profile.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a local test PostgreSQL database');

const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: url, max: 1 });
const testUrl = new URL(url);
testUrl.searchParams.set('options', `-c search_path=${schema}`);
testUrl.searchParams.set('schema', schema);
let client: DatabaseClient;
let app: INestApplication | undefined;
let endpoint: string;
let queries: string[] = [];

function migrate() {
  execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: 'pipe',
  });
}

before(async () => {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  migrate();
  client = createDatabaseClient(testUrl.toString());
  client.$on('query', event => { if (/^SELECT\b/i.test(event.query)) queries.push(event.query); });
  await seedProfile(client, profileData);
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({ client })
    .compile();
  app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  endpoint = await app.getUrl();
});

beforeEach(async () => {
  await seedProfile(client, profileData);
  queries = [];
});

after(async () => {
  await app?.close();
  await client?.$disconnect();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});

async function query(source: string) {
  const response = await fetch(`${endpoint}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: source }),
  });
  return { status: response.status, body: await response.json() };
}

const fullQuery = `{
  profile {
    name description links { name url } skills { name }
    experience { company position period achievements }
    projects { name description url }
  }
}`;

test('serves the full profile through HTTP GraphQL', async () => {
  const { status, body } = await query(fullQuery);
  assert.equal(status, 200);
  assert.equal(body.errors, undefined);
  assert.equal(body.data.profile.name, profileData.name);
  assert.deepEqual(body.data.profile.skills.map((x: { name: string }) => x.name), profileData.skills);
  assert.equal(body.data.profile.experience[0].period, '3 года');
  assert.equal(body.data.profile.projects.length, profileData.projects.length);
});

test('seed and migrations can be repeated without changing IDs or duplicating data', async () => {
  const before = await client.profile.findUniqueOrThrow({
    where: { slug: 'main' }, include: { links: true, skills: true, experience: true, projects: true },
  });
  migrate();
  await seedProfile(client, profileData);
  const after = await client.profile.findUniqueOrThrow({
    where: { slug: 'main' }, include: { links: true, skills: true, experience: true, projects: true },
  });
  assert.deepEqual(after, before);
  assert.equal(await client.profile.count(), 1);
});

test('concurrent seeds do not create duplicates', async () => {
  await Promise.all([seedProfile(client, profileData), seedProfile(client, profileData)]);
  assert.equal(await client.profile.count(), 1);
  assert.equal(await client.skill.count(), profileData.skills.length);
  assert.equal(await client.project.count(), profileData.projects.length);
});

test('failed seed rolls back profile changes', async () => {
  const broken = structuredClone(profileData);
  broken.name = 'Must be rolled back';
  broken.projects[0]!.name = null as unknown as string;
  await assert.rejects(seedProfile(client, broken));
  const stored = await client.profile.findUniqueOrThrow({ where: { slug: 'main' } });
  assert.equal(stored.name, profileData.name);
  assert.equal(await client.project.count(), profileData.projects.length);
});

test('seed removes obsolete entries only from its own profile', async () => {
  const other = await client.profile.create({
    data: { slug: 'other', name: 'Other', description: '', skills: { create: { name: 'Keep', sortOrder: 0 } } },
  });
  try {
    await seedProfile(client, { ...profileData, skills: ['Updated skill'] });
    const result = await query('{ profile { skills { name } } }');
    assert.deepEqual(result.body.data.profile.skills, [{ name: 'Updated skill' }]);
    assert.equal(await client.skill.count({ where: { profileId: other.id } }), 1);
  } finally {
    await client.profile.delete({ where: { id: other.id } });
  }
});

test('nested data uses a fixed number of SQL queries as the profile grows', async () => {
  await query(fullQuery);
  const initial = queries.length;
  assert.equal(initial, 5);
  await seedProfile(client, { ...profileData, skills: Array.from({ length: 50 }, (_, i) => `Skill ${i}`) });
  queries = [];
  const result = await query(fullQuery);
  assert.equal(result.body.data.profile.skills.length, 50);
  assert.equal(queries.length, initial);
});

test('GraphQL aliases share loading, while another HTTP request reads again', async () => {
  const result = await query('{ one: profile { name skills { name } } two: profile { name projects { name } } }');
  assert.equal(result.body.errors, undefined);
  assert.equal(queries.length, 5);
  await query('{ profile { name } }');
  assert.equal(queries.length, 10);
});

test('unknown fields are rejected before accessing the database', async () => {
  const result = await query('{ profile { unknownField } }');
  assert.equal(result.status, 400);
  assert.ok(result.body.errors.length);
  assert.equal(queries.length, 0);
});

test('Apollo Sandbox and health endpoint are available', async () => {
  const sandbox = await fetch(`${endpoint}/graphql`, { headers: { accept: 'text/html' } });
  assert.equal(sandbox.status, 200);
  assert.match(await sandbox.text(), /embeddable-sandbox/);
  const health = await fetch(`${endpoint}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
});

test('missing profile makes readiness fail and produces a clear GraphQL error', async () => {
  await client.profile.delete({ where: { slug: 'main' } });
  assert.equal((await fetch(`${endpoint}/health`)).status, 503);
  const { body } = await query('{ profile { name } }');
  assert.equal(body.data, null);
  assert.equal(body.errors[0].message, 'Профиль не найден');
  assert.equal(body.errors[0].extensions.stacktrace, undefined);
});
