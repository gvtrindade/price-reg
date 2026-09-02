"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTemporaryPasswordEmail } from "@/lib/email";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

const ALL_ROLES = ["VOLUNTEER", "MANAGER", "ADMIN"] as const;
type Role = (typeof ALL_ROLES)[number];

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const roles = (session?.user.roles as string[] | undefined) ?? [];
  if (!session?.user || !roles.includes("ADMIN")) return null;
  return session;
}

function generateTemporaryPassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = lower + upper + digits + symbols;
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (chars.length < 14) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function addUserRoleAction(data: { userId: string; role: string }) {
  return Sentry.withServerActionInstrumentation("addUserRoleAction", async () => {
    const t = await getTranslations("Errors");
    const session = await requireAdmin();
    if (!session) return { error: t("notAdmin") };
    if (!ALL_ROLES.includes(data.role as Role)) return { error: t("invalidRole") };

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return { error: t("userNotFound") };
    if (user.roles.includes(data.role as Role)) return { error: null };

    await prisma.user.update({
      where: { id: data.userId },
      data: { roles: { push: data.role as Role } },
    });
    return { error: null };
  });
}

export async function removeUserRoleAction(data: { userId: string; role: string }) {
  return Sentry.withServerActionInstrumentation("removeUserRoleAction", async () => {
    const t = await getTranslations("Errors");
    const session = await requireAdmin();
    if (!session) return { error: t("notAdmin") };
    if (!ALL_ROLES.includes(data.role as Role)) return { error: t("invalidRole") };
    if (data.userId === session.user.id && data.role === "ADMIN") {
      return { error: t("cannotRemoveOwnAdminRole") };
    }

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return { error: t("userNotFound") };

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        roles: ALL_ROLES.filter(
          (r) => r !== (data.role as Role) && user.roles.includes(r),
        ) as Role[],
      },
    });
    return { error: null };
  });
}

export async function updateUserEmailAction(data: { userId: string; email: string }) {
  return Sentry.withServerActionInstrumentation("updateUserEmailAction", async () => {
    const t = await getTranslations("Errors");
    const session = await requireAdmin();
    if (!session) return { error: t("notAdmin") };

    const email = data.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: t("invalidEmail") };

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return { error: t("userNotFound") };

    try {
      await prisma.user.update({
        where: { id: data.userId },
        data: { email, emailVerified: false },
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        return { error: t("emailInUse") };
      }
      throw err;
    }
    return { error: null };
  });
}

export async function resetUserPasswordAction(data: { userId: string }) {
  return Sentry.withServerActionInstrumentation("resetUserPasswordAction", async () => {
    const t = await getTranslations("Errors");
    const session = await requireAdmin();
    if (!session) return { error: t("notAdmin") };

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return { error: t("userNotFound") };

    const temporaryPassword = generateTemporaryPassword();
    const hashed = await hashPassword(temporaryPassword);

    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashed },
      });
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashed,
        },
      });
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: { mustChangePassword: true },
      }),
    ]);

    await sendTemporaryPasswordEmail({
      to: user.email,
      name: user.name,
      password: temporaryPassword,
    });

    return { error: null };
  });
}
