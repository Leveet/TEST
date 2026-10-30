import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './database/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const profile = await this.prisma.client.profile.findUnique({
      where: { slug: 'main' },
      select: { id: true },
    });
    if (!profile) throw new ServiceUnavailableException('Профиль не подготовлен');
    return { status: 'ok' };
  }
}
