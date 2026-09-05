import { createHmac, timingSafeEqual } from "node:crypto";

function sign(bookId: string, eventId: string): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`book-valuation:${bookId}:${eventId}`).digest();
}

export function webhookToken(bookId: string, eventId: string): string {
  return sign(bookId, eventId).toString("hex");
}

export function verifyWebhookToken(
  bookId: string,
  eventId: string,
  token: string | null,
): boolean {
  if (!process.env.BETTER_AUTH_SECRET) return false;
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return false;
  const expected = sign(bookId, eventId);
  const given = Buffer.from(token, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
