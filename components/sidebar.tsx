"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  CalendarDays,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

const links = [
  { href: "/events", labelKey: "events", icon: CalendarDays },
];

export default function Sidebar() {
  const t = useTranslations("Sidebar");
  const tc = useTranslations("Metadata");
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center gap-2 p-3">
        <Link
          href="/events"
          className={`min-w-0 truncate text-lg font-semibold ${
            collapsed ? "hidden" : ""
          }`}
        >
          {tc("appName")}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={collapsed ? "mx-auto" : "ml-auto"}
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? t("expand") : t("collapse")}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {links.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`}
              title={t(labelKey)}
            >
              <Icon className="size-4 shrink-0" />
              <span className={collapsed ? "sr-only" : "truncate"}>
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t p-2">
        <Button
          variant="ghost"
          className={`justify-start gap-3 ${collapsed ? "justify-center px-2" : ""}`}
          aria-label={t("settings")}
          render={<Link href="/settings" />}
          nativeButton={false}
        >
          <Settings className="size-4 shrink-0" />
          <span className={collapsed ? "sr-only" : ""}>{t("settings")}</span>
        </Button>
        <Button
          variant="ghost"
          className={`justify-start gap-3 ${collapsed ? "justify-center px-2" : ""}`}
          onClick={handleSignOut}
        >
          <LogOut className="size-4 shrink-0" />
          <span className={collapsed ? "sr-only" : ""}>
            {t("logout")}
          </span>
        </Button>
      </div>
    </aside>
  );
}
