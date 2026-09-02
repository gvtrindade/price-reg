"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  CalendarDays,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

const links = [
  { href: "/events", labelKey: "events", icon: CalendarDays },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Sidebar");
  const tc = useTranslations("Metadata");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label={t("expand")}
        >
          <PanelLeft />
        </Button>
        <Link href="/events" className="truncate text-base font-semibold">
          {tc("appName")}
        </Link>
      </header>

      <div className="flex-1 overflow-auto">{children}</div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background">
            <div className="flex items-center gap-2 p-3">
              <Link
                href="/events"
                className="min-w-0 truncate text-lg font-semibold"
              >
                {tc("appName")}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => setOpen(false)}
                aria-label={t("collapse")}
              >
                <PanelLeftClose />
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
                    }`}
                    title={t(labelKey)}
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{t(labelKey)}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-1 border-t p-2">
              <Button
                variant="ghost"
                className="justify-start gap-3"
                aria-label={t("settings")}
                render={<Link href="/settings" onClick={() => setOpen(false)} />}
                nativeButton={false}
              >
                <Settings className="size-4 shrink-0" />
                <span>{t("settings")}</span>
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-3"
                onClick={handleSignOut}
              >
                <LogOut className="size-4 shrink-0" />
                <span>{t("logout")}</span>
              </Button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
