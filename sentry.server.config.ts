import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.SENTRY_DNS,
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.2,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.prismaIntegration(),
  ],
})

Sentry.setTag("app", "gestao-eventos")
Sentry.setTag("environment", process.env.VERCEL_ENV || process.env.NODE_ENV || "development")
