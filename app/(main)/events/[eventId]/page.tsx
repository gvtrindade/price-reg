import { auth } from "@/lib/auth";
import { isManagerRole } from "@/lib/event-access";
import { prisma } from "@/lib/prisma";
import { EventDetail } from "./components/event-detail";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const isManager = isManagerRole(roles);

  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      products: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          author: true,
          code: true,
          conservationState: true,
          status: true,
          price: true,
          addedBy: { select: { name: true } },
        },
      },
      printTemplate: {
        select: { id: true },
      },
      eventUsers: isManager
        ? { select: { userId: true } }
        : { where: { userId: session.user.id }, select: { userId: true } },
    },
  });
  if (!event) redirect("/events");

  const assignedUserIds = event.eventUsers.map((eventUser) => eventUser.userId);
  const canManageProducts = isManager || assignedUserIds.includes(session.user.id);

  // Volunteers may only access events they have been assigned to. Managers and
  // admins can access every event, so no assignment is required for them.
  if (!canManageProducts) redirect("/events");
  const users = isManager
    ? await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];

  return (
    <EventDetail
      event={{
        id: event.id,
        title: event.title,
        status: event.status,
        hasTemplate: event.printTemplate !== null,
        products: event.products.map((product) => ({
          ...product,
          price: product.price === null ? null : String(product.price),
          addedByName: product.addedBy?.name ?? null,
        })),
      }}
      isManager={isManager}
      canManageProducts={canManageProducts}
      users={users}
      assignedUserIds={assignedUserIds}
    />
  );
}
