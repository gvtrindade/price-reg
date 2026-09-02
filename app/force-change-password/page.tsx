import { ChangePasswordForm } from "@/components/change-password-form";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ForceChangePasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (!session.user.mustChangePassword) redirect("/events");

  const t = await getTranslations("ForceChangePassword");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
      <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm text-amber-600">
        {t("notice")}
      </p>
      <ChangePasswordForm mode="forced" />
    </main>
  );
}
