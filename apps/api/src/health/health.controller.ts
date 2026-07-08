import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health.js';

@Controller('api/v1/health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return { status: 'ok' };
  }

  @Get('db')
  @HealthCheck()
  checkDb() {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
