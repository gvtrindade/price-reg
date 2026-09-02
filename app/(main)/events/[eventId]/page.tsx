import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventDetail } from "@/components/event-detail";
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
      books: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          isbn: true,
          conservationState: true,
          status: true,
          price: true,
        },
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
        books: event.books.map((book) => ({
          ...book,
          price: String(book.price),
        })),
      }}
      isManager={isManager}
    />
  );
}
