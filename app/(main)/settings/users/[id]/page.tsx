import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserDetail } from "@/components/user-detail";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[] | undefined) ?? [];
  if (!roles.includes("ADMIN")) redirect("/settings");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/settings");

  const t = await getTranslations("UserDetail");

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-2xl font-semibold">{user.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("memberSince", {
        date: new Intl.DateTimeFormat("default").format(user.createdAt),
      })}</p>
      <UserDetail user={user} />
    </main>
  );
}
