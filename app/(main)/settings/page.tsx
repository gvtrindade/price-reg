import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsTabs } from "@/components/settings-tabs";
import { UserTable } from "@/components/user-table";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const isAdmin = roles.includes("ADMIN");

  const t = await getTranslations("Settings");
  const tu = await getTranslations("UserTable");

  const users = isAdmin
    ? await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, roles: true },
      })
    : [];

  const profile = (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t("nameLabel")}</p>
          <p className="font-medium">{session.user.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t("emailLabel")}</p>
          <p className="font-medium">{session.user.email}</p>
        </div>
        <Button
          className="w-full"
          render={<Link href="/settings/change-password" />}
          nativeButton={false}
        >
          {t("changePassword")}
        </Button>
      </CardContent>
    </Card>
  );

  const usersPanel = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{tu("title")}</h2>
        <p className="text-sm text-muted-foreground">{tu("description")}</p>
      </div>
      <UserTable users={users} currentUserId={session.user.id} />
    </div>
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <SettingsTabs
        profileLabel={t("profile")}
        usersLabel={t("users")}
        isAdmin={isAdmin}
        profile={profile}
        users={usersPanel}
      />
    </main>
  );
}
