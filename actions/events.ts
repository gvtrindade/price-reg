"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { webhookToken } from "@/lib/webhook-token";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

async function requireManager() {
  const session = await auth.api.getSession({ headers: await headers() });
  const roles = (session?.user.roles as string[] | undefined) ?? [];
  if (!session?.user || !(roles.includes("MANAGER") || roles.includes("ADMIN")))
    return null;
  return session;
}

export async function createEventAction(data: { title: string }) {
  return Sentry.withServerActionInstrumentation("createEventAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };
    const title = data.title.trim();
    if (!title) return { error: t("eventNameRequired") };

    const event = await prisma.event.create({ data: { title } });
    return { error: null, id: event.id };
  });
}

export async function updateEventTitleAction(data: { eventId: string; title: string }) {
  return Sentry.withServerActionInstrumentation("updateEventTitleAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };
    const title = data.title.trim();
    if (!title) return { error: t("eventNameRequired") };

    const { count } = await prisma.event.updateMany({
      where: { id: data.eventId, status: "ACTIVE" },
      data: { title },
    });
    if (count === 0) return { error: t("eventNotFound") };
    return { error: null };
  });
}

export async function cancelEventAction(data: { eventId: string }) {
  return Sentry.withServerActionInstrumentation("cancelEventAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const { count } = await prisma.event.updateMany({
      where: { id: data.eventId, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
    if (count === 0) return { error: t("eventNotFound") };
    return { error: null };
  });
}

type BookFieldError =
  | "invalidTitle"
  | "invalidAuthor"
  | "invalidPrice"
  | "invalidConservationState"
  | "invalidStatus";

function parseBookData(data: {
  title?: string;
  author?: string;
  price?: string;
  conservationState?: string;
  status?: string;
}) {
  const out: {
    title?: string;
    author?: string;
    price?: number;
    priced?: boolean;
    conservationState?: string;
    status?: string;
  } = {};

  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title) return { error: "invalidTitle" as BookFieldError };
    out.title = title;
  }
  if (data.author !== undefined) {
    const author = data.author.trim();
    if (!author) return { error: "invalidAuthor" as BookFieldError };
    out.author = author;
  }
  if (data.price !== undefined) {
    const price = Number(data.price.replace(",", "."));
    if (!Number.isFinite(price) || price < 0)
      return { error: "invalidPrice" as BookFieldError };
    out.price = Math.round(price * 100) / 100;
    out.priced = out.price > 0;
  }
  if (data.conservationState !== undefined) {
    const cs = data.conservationState.trim();
    if (!cs) return { error: "invalidConservationState" as BookFieldError };
    out.conservationState = cs;
  }
  if (data.status !== undefined) {
    const status = data.status.trim();
    if (!status) return { error: "invalidStatus" as BookFieldError };
    out.status = status;
  }
  return { error: null, data: out };
}

export async function addBookAction(data: {
  eventId: string;
  title?: string;
  author?: string;
  isbn?: string;
  conservationState: string;
}) {
  return Sentry.withServerActionInstrumentation("addBookAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireSession())) return { error: t("sessionExpired") };

    const title = data.title?.trim() || null;
    const author = data.author?.trim() || null;
    const isbn = data.isbn?.trim() || null;
    const conservationState = data.conservationState.trim();

    if (!isbn && !(title && author))
      return { error: t("bookNameOrIsbnRequired") };
    if (!conservationState) return { error: t("invalidConservationState") };

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { status: true },
    });
    if (!event || event.status !== "ACTIVE") return { error: t("eventNotFound") };

    const serviceUrl = process.env.NEXT_BOOK_PRICE_FINDER_URL;
    const webhookBase = process.env.NEXT_APPLICATION_URL;
    if (!serviceUrl || !webhookBase)
      return { error: t("priceFinderNotConfigured") };

    const bookId = crypto.randomUUID();
    const webhookUrl = new URL("/api/webhooks/book-valuation", webhookBase);
    webhookUrl.searchParams.set("bookId", bookId);
    webhookUrl.searchParams.set("eventId", data.eventId);
    webhookUrl.searchParams.set("token", webhookToken(bookId, data.eventId));

    let lookup: Response;
    try {
      lookup = await fetch(new URL("/lookup", serviceUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...(isbn ? { isbn } : {}),
          ...(title ? { title } : {}),
          ...(author ? { author } : {}),
          conservation_state: conservationState,
          webhook_url: webhookUrl.toString(),
        }),
      });
    } catch {
      return { error: t("priceFinderUnreachable") };
    }

    if (!lookup.ok) {
      const detail = await readLookupError(lookup);
      return { error: detail || t("priceFinderRejected") };
    }

    // The service delivers its webhook while this request is still in flight,
    // so the row may already exist (created by the webhook); never clobber it.
    await prisma.book.upsert({
      where: { id: bookId },
      create: {
        id: bookId,
        eventId: data.eventId,
        title,
        author,
        isbn,
        conservationState,
        status: "registered",
      },
      update: {},
    });
    return { error: null, id: bookId };
  });
}

async function readLookupError(response: Response): Promise<string | null> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        const msg = (item as { msg?: unknown })?.msg;
        return typeof msg === "string" ? msg.replace(/^Value error,\s*/, "") : null;
      })
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  const error = (body as { error?: unknown } | null)?.error;
  return typeof error === "string" ? error : null;
}

export async function updateBookAction(data: {
  bookId: string;
  title?: string;
  author?: string;
  price?: string;
  conservationState?: string;
  status?: string;
}) {
  return Sentry.withServerActionInstrumentation("updateBookAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const parsed = parseBookData(data);
    if (parsed.error) return { error: t(parsed.error) };

    const book = await prisma.book.findUnique({
      where: { id: data.bookId },
      select: { id: true, event: { select: { status: true } } },
    });
    if (!book || book.event.status !== "ACTIVE") return { error: t("bookNotFound") };

    await prisma.book.update({ where: { id: data.bookId }, data: parsed.data });
    return { error: null };
  });
}

export async function reprocessBookAction(data: { bookId: string }) {
  return Sentry.withServerActionInstrumentation("reprocessBookAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const book = await prisma.book.findUnique({
      where: { id: data.bookId },
      include: { event: { select: { id: true, status: true } } },
    });
    if (!book || book.event.status !== "ACTIVE") return { error: t("bookNotFound") };
    if (book.status !== "registered" && book.status !== "error") return { error: t("bookNotRegistered") };

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (book.createdAt > fiveMinutesAgo) return { error: t("bookTooRecent") };

    const serviceUrl = process.env.NEXT_BOOK_PRICE_FINDER_URL;
    const webhookBase = process.env.NEXT_APPLICATION_URL;
    if (!serviceUrl || !webhookBase)
      return { error: t("priceFinderNotConfigured") };

    const webhookUrl = new URL("/api/webhooks/book-valuation", webhookBase);
    webhookUrl.searchParams.set("bookId", book.id);
    webhookUrl.searchParams.set("eventId", book.eventId);
    webhookUrl.searchParams.set("token", webhookToken(book.id, book.eventId));

    let lookup: Response;
    try {
      lookup = await fetch(new URL("/lookup", serviceUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...(book.isbn ? { isbn: book.isbn } : {}),
          ...(book.title ? { title: book.title } : {}),
          ...(book.author ? { author: book.author } : {}),
          conservation_state: book.conservationState,
          webhook_url: webhookUrl.toString(),
        }),
      });
    } catch {
      return { error: t("priceFinderUnreachable") };
    }

    if (!lookup.ok) {
      const detail = await readLookupError(lookup);
      return { error: detail || t("priceFinderRejected") };
    }

    return { error: null };
  });
}

export async function deleteBookAction(data: { bookId: string }) {
  return Sentry.withServerActionInstrumentation("deleteBookAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const { count } = await prisma.book.deleteMany({ where: { id: data.bookId } });
    if (count === 0) return { error: t("bookNotFound") };
    return { error: null };
  });
}
