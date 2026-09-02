"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";

export default function LogoutButton() {
  const t = useTranslations("LogoutButton");
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <Button
      onClick={handleSignOut}
    >
      {t("label")}
    </Button>
  );
}
