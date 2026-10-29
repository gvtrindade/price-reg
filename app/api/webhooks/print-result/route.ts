import { prisma } from "@/lib/prisma";
import { verifyPrintResultWebhookToken } from "@/lib/webhook-token";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface PrintResultPayload {
  job_id?: unknown;
  status?: unknown;
  ids?: unknown;
  external_ids?: unknown;
  errors?: unknown;
}

function cleanExternalId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

// Caller product id -> catalog id (Ziontech/megabazar) reserved by the printer
// service. Persisted so the label's {{e_id}}/QR and future reprints reuse it.
function parseExternalIds(value: unknown): Map<string, string> {
  const externalIds = new Map<string, string>();
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return externalIds;
  }
  for (const [productId, raw] of Object.entries(value)) {
    const externalId = cleanExternalId(raw);
    if (productId && externalId) externalIds.set(productId, externalId);
  }
  return externalIds;
}

// Reservation failures carry the caller product id in their error entries, so
// those products can be moved out of "printing" instead of being stuck there.
function parseErrorProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry === "object" && entry !== null) {
      const id = (entry as { id?: unknown }).id;
      if (typeof id === "string" && id) ids.push(id);
    }
  }
  return ids;
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const jobId = searchParams.get("jobId");
  const eventId = searchParams.get("eventId");
  const token = searchParams.get("token");

  if (!jobId || !eventId) {
    return NextResponse.json(
      { error: "jobId and eventId are required" },
      { status: 400 },
    );
  }
  if (!verifyPrintResultWebhookToken(jobId, eventId, token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  let payload: PrintResultPayload;
  try {
    payload = (await request.json()) as PrintResultPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const status = typeof payload.status === "string" ? payload.status : null;
  if (status !== "ok" && status !== "error") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const ids = Array.isArray(payload.ids) ? payload.ids : [];
  const productIds = ids.filter((id): id is string => typeof id === "string");
  const externalIds = parseExternalIds(payload.external_ids);
  const errorProductIds = parseErrorProductIds(payload.errors);

  if (productIds.length === 0 && externalIds.size === 0) {
    // The printer service should echo back the product ids it was sent. If we
    // get here the caller cannot tell which products finished printing.
    console.warn(
      `Print job ${jobId} (event ${eventId}): no usable product ids in payload`,
      { status, ids },
    );
    return NextResponse.json({ ok: true });
  }

  // Store the reserved catalog ids first: this applies to products that were
  // printed and to products whose label failed after the id was reserved (a
  // reprint then reuses the id instead of reserving a duplicate).
  let externalIdCount = 0;
  for (const [productId, externalId] of externalIds) {
    const { count } = await prisma.product.updateMany({
      where: { id: productId, eventId, externalId: null },
      data: { externalId },
    });
    externalIdCount += count;
  }

  // The printer only reports an id once its label was actually sent to the
  // printer, so those are always "printed" even when the overall job reports
  // errors for other products.
  const newStatus = "printed";

  let count = 0;
  if (productIds.length > 0) {
    ({ count } = await prisma.product.updateMany({
      where: { id: { in: productIds }, eventId },
      data: { status: newStatus },
    }));
  }

  if (productIds.length > 0 && count === 0) {
    console.warn(
      `Print job ${jobId} (event ${eventId}): no products matched the reported ids`,
      { status, productIds },
    );
  } else if (count > 0) {
    console.info(
      `Print job ${jobId} (event ${eventId}): marked ${count} product(s) as ${newStatus}`,
    );
  }

  if (errorProductIds.length > 0) {
    const { count: errorCount } = await prisma.product.updateMany({
      where: { id: { in: errorProductIds }, eventId },
      data: { status: "error" },
    });
    if (errorCount > 0) {
      console.info(
        `Print job ${jobId} (event ${eventId}): marked ${errorCount} product(s) as error`,
      );
    }
  }

  if (externalIdCount > 0) {
    console.info(
      `Print job ${jobId} (event ${eventId}): stored ${externalIdCount} external id(s)`,
    );
  }

  if (status === "error" && payload.errors) {
    console.error(`Print job ${jobId} errors:`, payload.errors);
  }

  return NextResponse.json({ ok: true });
}
