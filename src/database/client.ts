import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export function createDatabaseClient(connectionString: string) {
  const schema = new URL(connectionString).searchParams.get('schema') ?? 'public';
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  }, { schema });
  return new PrismaClient({
    adapter,
    log: [{ level: 'query', emit: 'event' }],
  });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
