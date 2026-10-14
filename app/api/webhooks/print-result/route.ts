import { prisma } from "@/lib/prisma";
import { verifyPrintResultWebhookToken } from "@/lib/webhook-token";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface PrintResultPayload {
  job_id?: unknown;
  status?: unknown;
  ids?: unknown;
  errors?: unknown;
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

  if (productIds.length === 0) {
    // The printer service should echo back the product ids it was sent. If we
    // get here the caller cannot tell which products finished printing.
    console.warn(
      `Print job ${jobId} (event ${eventId}): no usable product ids in payload`,
      { status, ids },
    );
    return NextResponse.json({ ok: true });
  }

  const newStatus = status === "ok" ? "printed" : "error";

  const { count } = await prisma.product.updateMany({
    where: { id: { in: productIds }, eventId },
    data: { status: newStatus },
  });

  if (count === 0) {
    console.warn(
      `Print job ${jobId} (event ${eventId}): no products matched the reported ids`,
      { status, productIds },
    );
  } else {
    console.info(
      `Print job ${jobId} (event ${eventId}): marked ${count} product(s) as ${newStatus}`,
    );
  }

  if (status === "error" && payload.errors) {
    console.error(`Print job ${jobId} errors:`, payload.errors);
  }

  return NextResponse.json({ ok: true });
}
