# Next.js project scaffolding

This is a template with basic necessary pieces to skip the setup of a new project. The following technologies were used:

- Next.js
- Tailwind
- Prisma ORM with Postgresql
- Better-auth with Google Provider
- Resend - Email sender
- Serwist - PWA Support
- Next-intl - Internationalization
- Sentry monitoring via GlitchTip
- Shadcn - UI Components

The auth routes are implemented and fully functional, though external configuration is needed for the Google Auth Provider, Resend and GlitchTip services.

## Running the project

To run the project, execute:
```
pnpm dev
```

<br />

Any changes to the prisma schema, need to be generated:
```
pnpm dlx prisma generate
```
And migrated to the local db:
```
pnpm dlx prisma migrate dev
```