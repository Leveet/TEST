import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

const relations = {
  links: { orderBy: { sortOrder: 'asc' } },
  skills: { orderBy: { sortOrder: 'asc' } },
  experience: { orderBy: { sortOrder: 'asc' } },
  projects: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProfileInclude;

export type PublicProfile = Prisma.ProfileGetPayload<{ include: typeof relations }>;

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublic(): Promise<PublicProfile | null> {
    return this.prisma.client.profile.findUnique({
      where: { slug: 'main' },
      include: relations,
    });
  }
}
