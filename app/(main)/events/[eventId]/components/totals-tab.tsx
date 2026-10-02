"use client";

import { BookRow, EventData, CONSERVATION_LABELS } from "./event-detail";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export function TotalsTab({
  event,
  books,
  t,
  tState,
}: {
  event: EventData;
  books: BookRow[];
  t: (key: string, values?: Record<string, string | number>) => string;
  tState: (key: "asNew" | "nearFine" | "good" | "fair") => string;
}) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const totalsBooks = query
    ? books.filter(
        (book) =>
          (book.title ?? "").toLowerCase().includes(query) ||
          (book.author ?? "").toLowerCase().includes(query),
      )
    : books;

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
      />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{t("books")}</h2>
        <span className="text-sm text-muted-foreground">
          {t("bookCount", { count: totalsBooks.length })}
        </span>
      </div>
      {totalsBooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {books.length === 0 ? t("noBooks") : t("noResults")}
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {totalsBooks.map((book) => (
              <li
                key={book.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
              >
                <Link
                  href={`/events/${event.id}/books/${book.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg -m-2 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {book.title ?? book.isbn ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tState(
                        (CONSERVATION_LABELS[book.conservationState] ??
                          book.conservationState) as
                          | "asNew"
                          | "nearFine"
                          | "good"
                          | "fair",
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    {book.price ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <span className="font-medium">{t("totalValue")}</span>
            <span className="text-sm tabular-nums">
              {totalsBooks
                .reduce((sum, book) => {
                  const price = parseFloat(book.price ?? "0");
                  return sum + (isNaN(price) ? 0 : price);
                }, 0)
                .toFixed(2)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
