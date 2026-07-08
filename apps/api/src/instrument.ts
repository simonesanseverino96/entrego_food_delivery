import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env['SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0,
    profilesSampleRate: 0.1,
    environment: process.env['NODE_ENV'] ?? 'development',
    beforeSend(event) {
      // Strip PII from logs — SSN/TIN patterns
      if (event.message) {
        event.message = event.message.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
      }
      return event;
    },
  });
}
