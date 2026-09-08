# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base

# ---------- Dependencies ----------
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ---------- Build ----------
FROM deps AS builder
WORKDIR /app

# Coolify injects build args by inserting `ARG KEY=value` lines right after
# every FROM. Do NOT redeclare those ARGs here: a later no-value `ARG KEY`
# in the same stage would shadow the injected value and reset it to empty.
# These ENV mappings pick up whatever Coolify injected and keep real values;
# the ${VAR:-default} fallbacks keep the build green when a variable is
# missing or flagged runtime-only in Coolify (placeholders are enough for
# `prisma generate` and `next build`; real values override at runtime).
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_APPLICATION_URL=${NEXT_APPLICATION_URL:-http://localhost:3000} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-build-placeholder-secret} \
    DATABASE_URL=${DATABASE_URL:-postgresql://user:pass@localhost:5432/db} \
    AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID:-} \
    AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET:-} \
    RESEND_API_KEY=${RESEND_API_KEY:-re_build_placeholder} \
    RESEND_SENDER=${RESEND_SENDER:-noreply@localhost} \
    SENTRY_DSN=${SENTRY_DSN:-} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN:-} \
    VERSION=${VERSION:-} \
    NEXT_BOOK_PRICE_FINDER_URL=${NEXT_BOOK_PRICE_FINDER_URL:-http://localhost:8000}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run prisma generate
RUN bun run build

# ---------- Runner ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# The base image already ships a non-root `bun` user (UID/GID 1000), which
# matches Coolify's convention so persistent storage volumes are usable.
COPY --from=builder /app ./
USER bun
EXPOSE 3000

# Run database migrations, then start the Next.js server.
CMD ["sh", "-c", "bun run prisma migrate deploy && bun run start"]