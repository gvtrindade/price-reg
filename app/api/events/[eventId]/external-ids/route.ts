import { auth } from "@/lib/auth";
import { canManageEvent } from "@/lib/event-access";
import { ProductStatus } from "@/lib/product-status";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// The Ziontech endpoint accepts at most 100 products per registration call.
const BATCH_SIZE = 100;

interface ExternalIdResult {
  product_id?: unknown;
  external_id?: unknown;
}

function cleanExternalId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const roles = (session.user.roles as string[] | undefined) ?? [];
  if (!(await canManageEvent(session.user.id, roles, eventId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event || event.status !== "ACTIVE") {
    return NextResponse.json({ error: "eventNotFound" }, { status: 404 });
  }

  // Only products that were valued but still lack the external id qualify.
  const products = await prisma.product.findMany({
    where: {
      eventId,
      externalId: null,
      status: {
        in: [ProductStatus.REGISTERED, ProductStatus.PROCESSED],
      },
      price: { not: null },
      OR: [{ code: { not: null } }, { title: { not: null } }],
    },
    select: { id: true, code: true, title: true, price: true },
  });

  if (products.length === 0) {
    return NextResponse.json({ updated: 0, total: 0, remaining: 0 });
  }

  const serviceUrl = process.env.NEXT_PRODUCT_PRICE_FINDER_URL;
  if (!serviceUrl) {
    return NextResponse.json(
      { error: "priceFinderNotConfigured" },
      { status: 500 },
    );
  }

  const externalIds = new Map<string, string>();

  for (let start = 0; start < products.length; start += BATCH_SIZE) {
    const batch = products.slice(start, start + BATCH_SIZE);

    let response: Response;
    try {
      response = await fetch(new URL("/external-ids", serviceUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          products: batch.map((product) => ({
            product_id: product.id,
            code: product.code,
            title: product.title,
            price: product.price === null ? null : Number(product.price),
          })),
        }),
      });
    } catch {
      return NextResponse.json(
        { error: "priceFinderUnreachable" },
        { status: 502 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "priceFinderRejected" },
        { status: 502 },
      );
    }

    const body = (await response.json().catch(() => null)) as {
      results?: unknown;
    } | null;
    const results = Array.isArray(body?.results) ? body.results : [];
    for (const result of results as ExternalIdResult[]) {
      const productId = result?.product_id;
      const externalId = cleanExternalId(result?.external_id);
      if (typeof productId === "string" && externalId) {
        externalIds.set(productId, externalId);
      }
    }
  }

  let updated = 0;
  for (const [productId, externalId] of externalIds) {
    const { count } = await prisma.product.updateMany({
      where: { id: productId, eventId, externalId: null },
      data: { externalId, status: ProductStatus.REGISTERED },
    });
    updated += count;
  }

  // Legacy products registered before the external id existed (and products
  // Ziontech failed to register again) must be marked as processed.
  await prisma.product.updateMany({
    where: {
      id: { in: products.map((product) => product.id) },
      eventId,
      externalId: null,
      status: ProductStatus.REGISTERED,
    },
    data: { status: ProductStatus.PROCESSED },
  });

  return NextResponse.json({
    updated,
    total: products.length,
    remaining: products.length - updated,
  });
}
