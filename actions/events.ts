"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { REPROCESSABLE_STATUSES } from "@/lib/product-status";
import { prisma } from "@/lib/prisma";
import { webhookToken, printResultWebhookToken } from "@/lib/webhook-token";
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

type ProductFieldError =
  | "invalidTitle"
  | "invalidAuthor"
  | "invalidPrice"
  | "invalidConservationState"
  | "invalidStatus";

function parseProductData(data: {
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
    if (!title) return { error: "invalidTitle" as ProductFieldError };
    out.title = title;
  }
  if (data.author !== undefined) {
    const author = data.author.trim();
    if (!author) return { error: "invalidAuthor" as ProductFieldError };
    out.author = author;
  }
  if (data.price !== undefined) {
    const price = Number(data.price.replace(",", "."));
    if (!Number.isFinite(price) || price < 0)
      return { error: "invalidPrice" as ProductFieldError };
    out.price = Math.round(price * 100) / 100;
    out.priced = out.price > 0;
  }
  if (data.conservationState !== undefined) {
    const cs = data.conservationState.trim();
    if (!cs) return { error: "invalidConservationState" as ProductFieldError };
    out.conservationState = cs;
  }
  if (data.status !== undefined) {
    const status = data.status.trim();
    if (!status) return { error: "invalidStatus" as ProductFieldError };
    out.status = status;
  }
  return { error: null, data: out };
}

export async function addProductAction(data: {
  eventId: string;
  title?: string;
  author?: string;
  code?: string;
  conservationState: string;
}) {
  return Sentry.withServerActionInstrumentation("addProductAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireSession())) return { error: t("sessionExpired") };

    const title = data.title?.trim() || null;
    const author = data.author?.trim() || null;
    const code = data.code?.trim() || null;
    const conservationState = data.conservationState.trim();

    if (!code && !title) return { error: t("productNameOrCodeRequired") };
    if (title && !author) return { error: t("invalidAuthor") };
    if (!conservationState) return { error: t("invalidConservationState") };

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { status: true },
    });
    if (!event || event.status !== "ACTIVE") return { error: t("eventNotFound") };

    const serviceUrl = process.env.NEXT_PRODUCT_PRICE_FINDER_URL;
    const webhookBase = process.env.NEXT_APPLICATION_URL;
    if (!serviceUrl || !webhookBase)
      return { error: t("priceFinderNotConfigured") };

    const productId = crypto.randomUUID();
    const webhookUrl = new URL("/api/webhooks/product-valuation", webhookBase);
    webhookUrl.searchParams.set("productId", productId);
    webhookUrl.searchParams.set("eventId", data.eventId);
    webhookUrl.searchParams.set("token", webhookToken(productId, data.eventId));

    let lookup: Response;
    try {
      lookup = await fetch(new URL("/lookup", serviceUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...(code ? { code } : {}),
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
    await prisma.product.upsert({
      where: { id: productId },
      create: {
        id: productId,
        eventId: data.eventId,
        title,
        author,
        code,
        conservationState,
        status: "added",
      },
      update: {},
    });
    return { error: null, id: productId };
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

export async function updateProductAction(data: {
  productId: string;
  title?: string;
  author?: string;
  price?: string;
  conservationState?: string;
  status?: string;
}) {
  return Sentry.withServerActionInstrumentation("updateProductAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const parsed = parseProductData(data);
    if (parsed.error) return { error: t(parsed.error) };

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, event: { select: { status: true } } },
    });
    if (!product || product.event.status !== "ACTIVE") return { error: t("productNotFound") };

    await prisma.product.update({ where: { id: data.productId }, data: parsed.data });
    return { error: null };
  });
}

export async function reprocessProductAction(data: { productId: string }) {
  return Sentry.withServerActionInstrumentation("reprocessProductAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: { event: { select: { id: true, status: true } } },
    });
    if (!product || product.event.status !== "ACTIVE") return { error: t("productNotFound") };
    if (!REPROCESSABLE_STATUSES.includes(product.status))
      return { error: t("productNotRegistered") };

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (product.createdAt > fiveMinutesAgo) return { error: t("productTooRecent") };

    const serviceUrl = process.env.NEXT_PRODUCT_PRICE_FINDER_URL;
    const webhookBase = process.env.NEXT_APPLICATION_URL;
    if (!serviceUrl || !webhookBase)
      return { error: t("priceFinderNotConfigured") };

    const webhookUrl = new URL("/api/webhooks/product-valuation", webhookBase);
    webhookUrl.searchParams.set("productId", product.id);
    webhookUrl.searchParams.set("eventId", product.eventId);
    webhookUrl.searchParams.set("token", webhookToken(product.id, product.eventId));

    let lookup: Response;
    try {
      lookup = await fetch(new URL("/lookup", serviceUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...(product.code ? { code: product.code } : {}),
          ...(product.title ? { title: product.title } : {}),
          ...(product.author ? { author: product.author } : {}),
          conservation_state: product.conservationState,
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

export async function deleteProductAction(data: { productId: string }) {
  return Sentry.withServerActionInstrumentation("deleteProductAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const { count } = await prisma.product.deleteMany({ where: { id: data.productId } });
    if (count === 0) return { error: t("productNotFound") };
    return { error: null };
  });
}

export async function upsertPrintTemplateAction(data: {
  eventId: string;
  blob: Uint8Array;
}) {
  return Sentry.withServerActionInstrumentation("upsertPrintTemplateAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true },
    });
    if (!event) return { error: t("eventNotFound") };

    const buffer = Buffer.from(data.blob);
    const content = buffer.toString("utf8", 0, Math.min(1000, buffer.length));
    if (!content.includes("<svg")) {
      return { error: t("invalidSvg") };
    }

    await prisma.printTemplate.upsert({
      where: { eventId: data.eventId },
      create: {
        eventId: data.eventId,
        blob: buffer,
      },
      update: {
        blob: buffer,
      },
    });
    return { error: null };
  });
}

export async function deletePrintTemplateAction(data: { eventId: string }) {
  return Sentry.withServerActionInstrumentation("deletePrintTemplateAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    await prisma.printTemplate.deleteMany({ where: { eventId: data.eventId } });
    return { error: null };
  });
}

export async function printProductsAction(data: { eventId: string; productIds: string[] }) {
  return Sentry.withServerActionInstrumentation("printProductsAction", async () => {
    const t = await getTranslations("Errors");
    if (!(await requireManager())) return { error: t("notManager") };

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        printTemplate: { select: { blob: true } },
        products: {
          where: { id: { in: data.productIds } },
          select: { id: true, title: true, author: true, price: true, externalId: true },
        },
      },
    });
    if (!event) return { error: t("eventNotFound") };
    if (!event.printTemplate) return { error: "noPrintTemplate" };

    const serviceUrl = process.env.NEXT_PRINTER_SERVICE_URL;
    const webhookBase = process.env.NEXT_APPLICATION_URL;
    if (!serviceUrl) return { error: "printServiceNotConfigured" };
    if (!webhookBase) return { error: "printServiceNotConfigured" };

    const jobId = crypto.randomUUID();
    const callbackUrl = new URL("/api/webhooks/print-result", webhookBase);
    callbackUrl.searchParams.set("jobId", jobId);
    callbackUrl.searchParams.set("eventId", data.eventId);
    callbackUrl.searchParams.set("token", printResultWebhookToken(jobId, data.eventId));

    const products = event.products.map((product) => ({
      id: product.id,
      title: product.title ?? "",
      author: product.author ?? "",
      price: product.price !== null ? Number(product.price) : null,
      external_id: product.externalId,
    }));

    try {
      const response = await fetch(new URL("/print", serviceUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          job_id: jobId,
          products,
          template: Buffer.from(event.printTemplate.blob).toString("base64"),
          callback_url: callbackUrl.toString(),
        }),
      });
      if (!response.ok) return { error: "printServiceRejected" };
    } catch {
      return { error: "printServiceUnreachable" };
    }

    await prisma.product.updateMany({
      where: { id: { in: data.productIds } },
      data: { status: "printing" },
    });

    return { error: null };
  });
}
