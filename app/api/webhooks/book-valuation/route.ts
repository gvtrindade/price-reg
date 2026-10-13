import { prisma } from "@/lib/prisma";
import { verifyWebhookToken } from "@/lib/webhook-token";
import { Prisma } from "@/prisma/generated/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface ValuationPayload {
  title?: unknown;
  author?: unknown;
  isbn?: unknown;
  conservation_state?: unknown;
  estimated_value?: unknown;
  status?: unknown;
  error?: unknown;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function cleanPrice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return null;
  return Math.round(value * 100) / 100;
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bookId = searchParams.get("bookId");
  const eventId = searchParams.get("eventId");
  const token = searchParams.get("token");

  if (!bookId || !eventId) {
    return NextResponse.json(
      { error: "bookId and eventId are required" },
      { status: 400 },
    );
  }
  if (!verifyWebhookToken(bookId, eventId, token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  let payload: ValuationPayload;
  try {
    payload = (await request.json()) as ValuationPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const title = cleanText(payload.title);
  const author = cleanText(payload.author);
  const isbn = cleanText(payload.isbn);
  const estimatedValue = cleanPrice(payload.estimated_value);
  const status = cleanText(payload.status);
  const errorMessage = cleanText(payload.error);
  const isError = status === "error";
  const isNotFound = status === "not_found";

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    // The service delivers its webhook while the registering request is still
    // in flight. Without a valuation or error there is nothing worth persisting yet:
    // the registering action creates the row itself.
    if (estimatedValue === null && !isError && !isNotFound) {
      return NextResponse.json({ error: "book not found" }, { status: 404 });
    }
    try {
      await prisma.book.create({
        data: {
          id: bookId,
          eventId,
          title,
          author,
          isbn,
          conservationState: cleanText(payload.conservation_state) ?? "unknown",
          status: isError ? "error" : isNotFound ? "not_found" : "registered",
          price: estimatedValue,
          priced: estimatedValue !== null,
        },
      });
      if (isError && errorMessage) {
        console.error(`Book valuation error for ${bookId}: ${errorMessage}`);
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (
        !(
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        )
      )
        throw e;
    }
  }

  const target = book ?? (await prisma.book.findUnique({ where: { id: bookId } }));
  if (!target) return NextResponse.json({ error: "book not found" }, { status: 404 });

  const data: Prisma.BookUpdateInput = {};
  if (isError) {
    data.status = "error";
    if (errorMessage) {
      console.error(`Book valuation error for ${bookId}: ${errorMessage}`);
    }
  } else if (isNotFound) {
    data.status = "not_found";
  } else {
    if (estimatedValue !== null) {
      data.price = estimatedValue;
      data.priced = true;
    }
    // A valuation that succeeded after a previous error/not-found must clear it.
    if (target.status === "error" || target.status === "not_found") {
      data.status = "registered";
    }
  }
  if (title && title !== target.title) data.title = title;
  if (author && author !== target.author) data.author = author;
  if (isbn && isbn !== target.isbn) data.isbn = isbn;

  if (Object.keys(data).length > 0) {
    await prisma.book.update({ where: { id: bookId }, data });
  }
  return NextResponse.json({ ok: true });
}
