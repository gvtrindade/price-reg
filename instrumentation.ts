import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
}

export async function onRequestError(err: any, req: any, ctx: any) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { getSessionCookie } = await import("better-auth/cookies")
      const { prisma } = await import("@/lib/prisma")
      const token = getSessionCookie(req)
      if (token) {
        const session = await prisma.session.findUnique({
          where: { token },
          select: { user: { select: { id: true, email: true } } },
        })
        if (session?.user) Sentry.setUser({ id: session.user.id, email: session.user.email })
      }
    } catch {}
  }
  Sentry.captureRequestError(err, req, ctx)
  if (ctx.route === "/api/auth/[...all]") {
    Sentry.captureException(err, { tags: { route: ctx.route, method: req.method } })
  }
}
