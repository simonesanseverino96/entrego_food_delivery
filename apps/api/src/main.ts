import './instrument.js'; // Sentry must be imported first

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { getEnv } from './env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'verbose'],
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: process.env['CORS_ORIGINS']?.split(',') ?? [] });
  app.enableShutdownHooks();

  const { PORT } = getEnv();
  await app.listen(PORT);
  Logger.log(`API running on http://localhost:${PORT}`, 'Bootstrap');
}

void bootstrap();
