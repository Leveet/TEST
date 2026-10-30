import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createDatabaseClient } from './client.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    this.client = createDatabaseClient(url);
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
