import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { ProfileRepository, type PublicProfile } from './profile.repository.js';

@Injectable({ scope: Scope.REQUEST })
export class ProfileService {
  private profile?: Promise<PublicProfile>;

  constructor(private readonly repository: ProfileRepository) {}

  getProfile(): Promise<PublicProfile> {
    // Несколько aliases в одном GraphQL-запросе используют одну загрузку.
    this.profile ??= this.repository.findPublic().then(profile => {
      if (!profile) throw new NotFoundException('Профиль не найден');
      return profile;
    });
    return this.profile;
  }
}
