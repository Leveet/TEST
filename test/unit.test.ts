import 'reflect-metadata';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { ProfileService } from '../src/profile/profile.service.js';
import { ProfileRepository, type PublicProfile } from '../src/profile/profile.repository.js';

const profile: PublicProfile = {
  id: 1, slug: 'main', name: 'Test', description: 'Test profile',
  links: [], skills: [], experience: [], projects: [],
};

function repositoryWith(findPublic: () => Promise<PublicProfile | null>) {
  const repository = Object.create(ProfileRepository.prototype) as ProfileRepository;
  repository.findPublic = mock.fn(findPublic);
  return repository;
}

test('parallel fields in one request reuse the same load', async () => {
  let calls = 0;
  const repository = repositoryWith(async () => { calls++; return profile; });
  const service = new ProfileService(repository);
  const result = await Promise.all([service.getProfile(), service.getProfile()]);
  assert.deepEqual(result, [profile, profile]);
  assert.equal(calls, 1);
});

test('a new request loads fresh data', async () => {
  let calls = 0;
  const repository = repositoryWith(async () => ({ ...profile, name: `Version ${++calls}` }));
  const first = await new ProfileService(repository).getProfile();
  const second = await new ProfileService(repository).getProfile();
  assert.equal(first.name, 'Version 1');
  assert.equal(second.name, 'Version 2');
});

test('missing profile is reported explicitly', async () => {
  const service = new ProfileService(repositoryWith(async () => null));
  await assert.rejects(service.getProfile(), NotFoundException);
});

test('database errors are not replaced with an empty profile', async () => {
  const failure = new Error('Database unavailable');
  const service = new ProfileService(repositoryWith(async () => { throw failure; }));
  await assert.rejects(service.getProfile(), error => error === failure);
});
