"use client";

import { ProductRow, EventData, CONSERVATION_LABELS } from "./event-detail";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export function TotalsTab({
  event,
  products,
  t,
  tState,
}: {
  event: EventData;
  products: ProductRow[];
  t: (key: string, values?: Record<string, string | number>) => string;
  tState: (key: "asNew" | "nearFine" | "good" | "fair") => string;
}) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const totalsProducts = query
    ? products.filter(
        (product) =>
          (product.title ?? "").toLowerCase().includes(query) ||
          (product.author ?? "").toLowerCase().includes(query),
      )
    : products;

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
      />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{t("products")}</h2>
        <span className="text-sm text-muted-foreground">
          {t("productCount", { count: totalsProducts.length })}
        </span>
      </div>
      {totalsProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {products.length === 0 ? t("noProducts") : t("noResults")}
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {totalsProducts.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
              >
                <Link
                  href={`/events/${event.id}/products/${product.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg -m-2 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {product.title ?? product.code ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tState(
                        (CONSERVATION_LABELS[product.conservationState] ??
                          product.conservationState) as
                          | "asNew"
                          | "nearFine"
                          | "good"
                          | "fair",
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    {product.price ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <span className="font-medium">{t("totalValue")}</span>
            <span className="text-sm tabular-nums">
              {totalsProducts
                .reduce((sum, product) => {
                  const price = parseFloat(product.price ?? "0");
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
