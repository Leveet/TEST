import 'dotenv/config';
import { createDatabaseClient } from '../src/database/client.js';
import { profileData } from '../data/profile.js';
import { seedProfile } from './seed-profile.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const client = createDatabaseClient(url);

try {
  await seedProfile(client, profileData);
  console.log('Profile data ready');
} finally {
  await client.$disconnect();
}
