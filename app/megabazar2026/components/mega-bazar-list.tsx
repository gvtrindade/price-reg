"use client";

import { SearchInput } from "@/components/ui/search-input";
import { formatPrice } from "@/lib/mega-bazar";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listMegaBazarBooksAction,
  type MegaBazarBook,
} from "../actions";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

export function MegaBazarList() {
  const t = useTranslations("MegaBazar");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [books, setBooks] = useState<MegaBazarBook[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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

    const timer = setTimeout(async () => {
      const token = ++requestTokenRef.current;
      loadingRef.current = true;
      setLoading(true);
      setError(false);
      setBooks([]);
      setNextOffset(null);

      try {
        const res = await listMegaBazarBooksAction({
          query: debouncedSearch,
          offset: 0,
          limit: PAGE_SIZE,
        });
        if (cancelled || token !== requestTokenRef.current) return;
        setBooks(res.books);
        setNextOffset(res.nextOffset);
      } catch {
        if (cancelled || token !== requestTokenRef.current) return;
        setError(true);
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
  }, [debouncedSearch]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || nextOffset === null) return;
    const token = requestTokenRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      const res = await listMegaBazarBooksAction({
        query: debouncedSearch,
        offset: nextOffset,
        limit: PAGE_SIZE,
      });
      if (token !== requestTokenRef.current) return;
      setBooks((previous) => [...previous, ...res.books]);
      setNextOffset(res.nextOffset);
    } catch {
      if (token !== requestTokenRef.current) return;
      setError(true);
    } finally {
      if (token === requestTokenRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [debouncedSearch, nextOffset]);

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

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-10 sm:pt-14">
      <h1 className="text-center text-2xl font-semibold tracking-tight">
        Mega Bazar 2026
      </h1>

      <div className="mt-6">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          clearLabel={t("clearSearch")}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
      </div>

      <div className="mt-4">
        {error ? (
          <p className="py-4 text-center text-sm text-destructive">
            {t("loadError")}
          </p>
        ) : books.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {loading ? t("loading") : t("noBooks")}
          </p>
        ) : (
          <>
            <ul className="divide-y rounded-xl border">
              {books.map((book) => (
                <li
                  key={book.id}
                  className="flex items-start gap-4 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium break-words">
                      {book.title ?? "—"}
                    </p>
                    {book.author && (
                      <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                        {book.author}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 pt-0.5 text-base font-medium tabular-nums">
                    {book.price === null ? "—" : formatPrice(book.price)}
                  </span>
                </li>
              ))}
            </ul>
            {nextOffset !== null && (
              <div
                ref={sentinelRef}
                className="py-4 text-center text-sm text-muted-foreground"
              >
                {loading ? t("loading") : null}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
