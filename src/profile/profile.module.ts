import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';
import { ProfileResolver } from './profile.resolver.js';

@Module({
  imports: [DatabaseModule],
  providers: [ProfileRepository, ProfileService, ProfileResolver],
})
export class ProfileModule {}
