import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface SalesPayload {
  external_ids?: unknown;
  externalIds?: unknown;
}

const MAX_IDS_PER_REQUEST = 5000;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SALES_SYNC_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  if (!given) return false;

  const expectedBuffer = Buffer.from(expected);
  const givenBuffer = Buffer.from(given);
  return (
    expectedBuffer.length === givenBuffer.length &&
    timingSafeEqual(expectedBuffer, givenBuffer)
  );
}

function cleanExternalId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseExternalIds(payload: SalesPayload): string[] {
  const raw = payload.external_ids ?? payload.externalIds;
  if (!Array.isArray(raw)) return [];

  const ids = new Set<string>();
  for (const value of raw) {
    const externalId = cleanExternalId(value);
    if (externalId) ids.add(externalId);
    if (ids.size >= MAX_IDS_PER_REQUEST) break;
  }
  return [...ids];
}

/**
 * Marks the products sold in the physical store as sold.
 *
 * The price finder polls the Ziontech (megabazar) sales endpoint and calls
 * this route with the catalog ids (``id_produtos``) of the sold copies.
 */
export async function POST(request: NextRequest) {
  if (!process.env.SALES_SYNC_TOKEN) {
    console.error("SALES_SYNC_TOKEN is not configured");
    return NextResponse.json(
      { error: "sales sync is not configured" },
      { status: 503 },
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  let payload: SalesPayload;
  try {
    payload = (await request.json()) as SalesPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const externalIds = parseExternalIds(payload);
  if (externalIds.length === 0) {
    return NextResponse.json(
      { error: "external_ids is required" },
      { status: 400 },
    );
  }

  const { count } = await prisma.product.updateMany({
    where: {
      externalId: { in: externalIds },
      isSold: false,
    },
    data: { isSold: true },
  });

  console.info(
    `Ziontech sales: marked ${count} product(s) as sold ` +
      `(${externalIds.length} catalog id(s) received)`,
  );

  return NextResponse.json({ ok: true, updated: count });
}
