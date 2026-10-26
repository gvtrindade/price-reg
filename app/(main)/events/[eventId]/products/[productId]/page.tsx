import { auth } from "@/lib/auth";
import { isManagerRole } from "@/lib/event-access";
import { REPROCESSABLE_STATUSES, PROCESSING_STATUSES } from "@/lib/product-status";
import { prisma } from "@/lib/prisma";
import { ProductDetail } from "./components/product-detail";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; productId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const isManager = isManagerRole(roles);

  const { eventId, productId } = await params;
  const product = await prisma.product.findFirst({
    where: { id: productId, eventId },
    include: {
      event: {
        select: {
          id: true,
          status: true,
          eventUsers: {
            where: { userId: session.user.id },
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!product) redirect(`/events/${eventId}`);

  const canManage =
    isManager || product.event.eventUsers.some((u) => u.userId === session.user.id);

  // Volunteers may only access products of events they have been assigned to.
  if (!canManage) redirect("/events");

  const fiveMinutesAgo = new Date(new Date().getTime() - 5 * 60 * 1000);
  const canReprocess =
    REPROCESSABLE_STATUSES.includes(product.status) && product.createdAt <= fiveMinutesAgo;

  // Neighbours within the current user's "last 2 hours" processing list, so the
  // detail page can offer previous/next navigation for recently added products.
  const twoHoursAgo = new Date(new Date().getTime() - 2 * 60 * 60 * 1000);
  const recentProducts = await prisma.product.findMany({
    where: {
      eventId,
      addedById: session.user.id,
      createdAt: { gt: twoHoursAgo },
      status: { in: [...PROCESSING_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const recentIndex = recentProducts.findIndex((p) => p.id === product.id);
  const previousProductId =
    recentIndex > 0 ? recentProducts[recentIndex - 1].id : null;
  const nextProductId =
    recentIndex >= 0 && recentIndex < recentProducts.length - 1
      ? recentProducts[recentIndex + 1].id
      : null;

  return (
    <ProductDetail
      product={{
        id: product.id,
        title: product.title,
        author: product.author,
        code: product.code,
        conservationState: product.conservationState,
        status: product.status,
        price: product.price === null ? null : String(product.price),
      }}
      eventId={product.event.id}
      eventActive={product.event.status === "ACTIVE"}
      canManage={canManage}
      canReprocess={canReprocess}
      previousProductId={previousProductId}
      nextProductId={nextProductId}
    />
  );
}
