import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { getEnv } from './env.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: () => getEnv(),
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
