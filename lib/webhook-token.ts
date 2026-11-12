import { createHmac, timingSafeEqual } from "node:crypto";

function sign(productId: string, eventId: string): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`product-valuation:${productId}:${eventId}`).digest();
}

export function webhookToken(productId: string, eventId: string): string {
  return sign(productId, eventId).toString("hex");
}

export function verifyWebhookToken(
  productId: string,
  eventId: string,
  token: string | null,
): boolean {
  if (!process.env.BETTER_AUTH_SECRET) return false;
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return false;
  const expected = sign(productId, eventId);
  const given = Buffer.from(token, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function signPrintResult(
  jobId: string,
  eventId: string,
  userId: string | null,
): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  // Jobs created before print attribution existed have no user id: keep
  // verifying them with the old subject so an in-flight job is not lost.
  const subject = userId
    ? `print-result:${jobId}:${eventId}:${userId}`
    : `print-result:${jobId}:${eventId}`;
  return createHmac("sha256", secret).update(subject).digest();
}

export function printResultWebhookToken(
  jobId: string,
  eventId: string,
  userId: string,
): string {
  return signPrintResult(jobId, eventId, userId).toString("hex");
}

export function verifyPrintResultWebhookToken(
  jobId: string,
  eventId: string,
  userId: string | null,
  token: string | null,
): boolean {
  if (!process.env.BETTER_AUTH_SECRET) return false;
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return false;
  const expected = signPrintResult(jobId, eventId, userId);
  const given = Buffer.from(token, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
