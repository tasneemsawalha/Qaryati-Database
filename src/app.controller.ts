import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() alive() {
    return { status: 'ok' };
  }
  @Get('ready') async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
