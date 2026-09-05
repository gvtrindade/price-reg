import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookDetail } from "@/components/book-detail";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; bookId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const { eventId, bookId } = await params;
  const book = await prisma.book.findFirst({
    where: { id: bookId, eventId },
    include: { event: { select: { id: true, status: true } } },
  });
  if (!book) redirect(`/events/${eventId}`);

  return (
    <BookDetail
      book={{
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        conservationState: book.conservationState,
        status: book.status,
        price: book.price === null ? null : String(book.price),
      }}
      eventId={book.event.id}
      eventActive={book.event.status === "ACTIVE"}
      isManager={isManager}
    />
  );
}
