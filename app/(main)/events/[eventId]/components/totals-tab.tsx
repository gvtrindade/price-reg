"use client";

import { listEventProductsPageAction } from "@/actions/events";
import { CONSERVATION_LABELS } from "./event-detail";
import { SearchInput } from "@/components/ui/search-input";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

interface TotalsProduct {
  id: string;
  title: string | null;
  code: string | null;
  conservationState: string;
  price: string | null;
}

type ConservationKey = "asNew" | "nearFine" | "good" | "fair";

export function TotalsTab({
  eventId,
  t,
  tState,
}: {
  eventId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  tState: (key: ConservationKey) => string;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [products, setProducts] = useState<TotalsProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState("0");
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const requestTokenRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce the search so typing does not fire a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [search]);

  // First page, reloaded whenever the debounced query changes.
  useEffect(() => {
    let cancelled = false;

    // Defer to a task so the reset happens outside the effect body itself.
    const timer = setTimeout(async () => {
      const token = ++requestTokenRef.current;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      setProducts([]);
      setNextOffset(null);

      try {
        const res = await listEventProductsPageAction({
          eventId,
          query: debouncedSearch,
          offset: 0,
          limit: PAGE_SIZE,
        });
        if (cancelled || token !== requestTokenRef.current) return;
        if (res.error) {
          setError(res.error);
          return;
        }
        setProducts(res.products ?? []);
        setTotal(res.total ?? 0);
        setTotalValue(res.totalValue ?? "0");
        setNextOffset(res.nextOffset ?? null);
      } catch {
        if (cancelled || token !== requestTokenRef.current) return;
        setError(t("loadError"));
      } finally {
        if (!cancelled && token === requestTokenRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId, debouncedSearch, t]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || nextOffset === null) return;
    const token = requestTokenRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await listEventProductsPageAction({
        eventId,
        query: debouncedSearch,
        offset: nextOffset,
        limit: PAGE_SIZE,
      });
      if (token !== requestTokenRef.current) return;
      if (res.error) {
        setError(res.error);
        return;
      }
      const nextProducts = res.products ?? [];
      setProducts((previous) => [...previous, ...nextProducts]);
      setTotal(res.total ?? 0);
      setTotalValue(res.totalValue ?? "0");
      setNextOffset(res.nextOffset ?? null);
    } catch {
      if (token !== requestTokenRef.current) return;
      setError(t("loadError"));
    } finally {
      if (token === requestTokenRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [debouncedSearch, eventId, nextOffset, t]);

  // Infinite scroll: fetch the next page when the sentinel becomes visible.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || nextOffset === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, nextOffset]);

  const numericTotal = Number(totalValue);
  const formattedTotal = Number.isFinite(numericTotal)
    ? numericTotal.toFixed(2)
    : "0.00";

  return (
    <div className="space-y-3">
      <SearchInput
        value={search}
        onValueChange={setSearch}
        clearLabel={t("clearSearch")}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
      />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{t("products")}</h2>
        <span className="text-sm text-muted-foreground">
          {t("productCount", { count: total })}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {products.length === 0 ? (
        loading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {debouncedSearch ? t("noResults") : t("noProducts")}
          </p>
        )
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
              >
                <Link
                  href={`/events/${eventId}/products/${product.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg -m-2 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {product.title ?? product.code ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tState(
                        (CONSERVATION_LABELS[product.conservationState] ??
                          product.conservationState) as ConservationKey,
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
          {nextOffset !== null && (
            <div
              ref={sentinelRef}
              className="py-2 text-center text-sm text-muted-foreground"
            >
              {loading ? t("loadingMore") : null}
            </div>
          )}
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <span className="font-medium">{t("totalValue")}</span>
            <span className="text-sm tabular-nums">{formattedTotal}</span>
          </div>
        </>
      )}
    </div>
  );
}
