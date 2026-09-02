import { sendResetPasswordEmail, sendVerificationEmail } from "@/lib/email";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  basePath: "/api/auth",
  baseURL: process.env.APPLICATION_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      roles: {
        type: "string[]",
        required: true,
        defaultValue: [],
        input: false,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({ to: user.email, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, token }) => {
      const verifyUrl = `${process.env.APPLICATION_URL}/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent("/email-verified")}`;
      await sendVerificationEmail({ to: user.email, url: verifyUrl });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    },
  },
});
