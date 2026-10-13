import { auth } from "@/lib/auth";
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
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

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
        },
      },
      printTemplate: {
        select: { id: true },
      },
    },
  });
  if (!event) redirect("/events");

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
        })),
      }}
      isManager={isManager}
    />
  );
}
