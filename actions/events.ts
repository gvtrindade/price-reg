"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  | "invalidPrice"
  | "invalidConservationState"
  | "invalidStatus";

function parseBookData(data: {
  title?: string;
  price?: string;
  conservationState?: string;
  status?: string;
}) {
  const out: {
    title?: string;
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
  isbn?: string;
  conservationState: string;
}) {
  return Sentry.withServerActionInstrumentation("addBookAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireSession())) return { error: t("sessionExpired") };

    const title = data.title?.trim() || null;
    const isbn = data.isbn?.trim() || null;
    const conservationState = data.conservationState.trim();

    if (!title && !isbn) return { error: t("bookNameOrIsbnRequired") };
    if (!conservationState) return { error: t("invalidConservationState") };

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { status: true },
    });
    if (!event || event.status !== "ACTIVE") return { error: t("eventNotFound") };

    const book = await prisma.book.create({
      data: {
        title,
        isbn,
        conservationState,
        status: "registered",
        price: null,
        eventId: data.eventId,
      },
    });
    return { error: null, id: book.id };
  });
}

export async function updateBookAction(data: {
  bookId: string;
  title?: string;
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

export async function deleteBookAction(data: { bookId: string }) {
  return Sentry.withServerActionInstrumentation("deleteBookAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const { count } = await prisma.book.deleteMany({ where: { id: data.bookId } });
    if (count === 0) return { error: t("bookNotFound") };
    return { error: null };
  });
}
