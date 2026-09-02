import { CreateEventDialog } from "@/components/create-event-dialog";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function EventsPage() {
  const [session, t] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getTranslations("Events"),
  ]);

  const roles = (session?.user.roles as string[] | undefined) ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const [activeEvents, inactiveEvents] = await Promise.all([
    prisma.event.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { books: true } } },
    }),
    isManager
      ? prisma.event.findMany({
          where: { status: "INACTIVE" },
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { books: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{t("activeTitle")}</h1>
          {isManager && <CreateEventDialog />}
        </div>
        {activeEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noActiveEvents")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {activeEvents.map((event) => (
              <li key={event.id} className="flex items-center justify-between p-4">
                <Link
                  href={`/events/${event.id}`}
                  className="font-medium hover:underline"
                >
                  {event.title}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {t("bookCount", { count: event._count.books })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isManager && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("inactiveTitle")}</h2>
          {inactiveEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noInactiveEvents")}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {inactiveEvents.map((event) => (
              <li key={event.id} className="flex items-center justify-between p-4">
                <Link
                  href={`/events/${event.id}`}
                  className="font-medium hover:underline"
                >
                  {event.title}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {t("bookCount", { count: event._count.books })}
                </span>
              </li>
            ))}
          </ul>
        )}
        </section>
      )}
    </main>
  );
}
