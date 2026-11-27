"use server";

import { MEGA_BAZAR_EVENT_TITLE } from "@/lib/mega-bazar";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

export interface MegaBazarBook {
  id: string;
  title: string | null;
  author: string | null;
  price: string | null;
}

export interface MegaBazarBooksResult {
  books: MegaBazarBook[];
  total: number;
  nextOffset: number | null;
}

const EMPTY_RESULT: MegaBazarBooksResult = {
  books: [],
  total: 0,
  nextOffset: null,
};

/**
 * Public catalog query for the Mega Bazar event. Unlike the event actions,
 * this one deliberately does not require a session because the route is
 * meant to be shared with customers.
 */
export async function listMegaBazarBooksAction(data: {
  query?: string;
  offset?: number;
  limit?: number;
}): Promise<MegaBazarBooksResult> {
  const event = await prisma.event.findFirst({
    where: {
      title: MEGA_BAZAR_EVENT_TITLE,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!event) return EMPTY_RESULT;

  const limit = Math.min(Math.max(data.limit ?? 25, 1), 100);
  const offset = Math.max(data.offset ?? 0, 0);
  const query = data.query?.trim() ?? "";

  const where: Prisma.ProductWhereInput = {
    eventId: event.id,
    price: { not: null },
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { author: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [books, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ title: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        author: true,
        price: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  const nextOffset = offset + books.length;
  return {
    books: books.map((book) => ({
      ...book,
      price: book.price === null ? null : String(book.price),
    })),
    total,
    nextOffset: nextOffset < total ? nextOffset : null,
  };
}
