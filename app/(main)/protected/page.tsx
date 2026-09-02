import LogoutButton from "@/components/logout-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function Protected() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const t = await getTranslations("Protected");

  return (
    <>
      <p>{t("title")}</p>
      <LogoutButton />
    </>
  );
}
