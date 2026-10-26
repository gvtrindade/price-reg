"use client";

import { ProductRow, EventData } from "./event-detail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  PRODUCT_STATUS_LABEL_KEYS,
  ProductStatus,
} from "@/lib/product-status";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const RECENT_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Shows the first and last name from a full name, dropping middle names. */
function formatAddedBy(name: string | null): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function ProductListItem({
  product,
  event,
  canManage,
  isActive,
  t,
  tStatus,
  onDelete,
}: {
  product: ProductRow;
  event: EventData;
  canManage: boolean;
  isActive: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tStatus: (key: "added" | "registered" | "processed" | "error" | "notFound" | "queued" | "printing" | "printed") => string;
  onDelete: (productId: string) => void;
}) {
  const statusKey = PRODUCT_STATUS_LABEL_KEYS[product.status as ProductStatus];
  return (
    <li className="relative flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
      <Link
        href={`/events/${event.id}/products/${product.id}`}
        aria-label={t("openProduct")}
        className="absolute inset-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {product.title ?? product.code ?? "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatAddedBy(product.addedByName)}{" "}
          ·{" "}
          {statusKey
            ? tStatus(statusKey as "added" | "registered" | "processed" | "error" | "notFound" | "queued" | "printing" | "printed")
            : product.status}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums">
        {product.price ?? "—"}
      </span>
      {canManage && isActive && (
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("deleteProduct")}
                />
              }
            >
              <Trash2 />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("deleteProductConfirmTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteProductConfirmDescription", {
                    name: product.title ?? product.code ?? "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(product.id)}
                >
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </li>
  );
}

function ProductList({
  products,
  event,
  canManage,
  isActive,
  t,
  tStatus,
  onDelete,
}: {
  products: ProductRow[];
  event: EventData;
  canManage: boolean;
  isActive: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tStatus: (key: "added" | "registered" | "processed" | "error" | "notFound" | "queued" | "printing" | "printed") => string;
  onDelete: (productId: string) => void;
}) {
  if (products.length === 0) return null;
  return (
    <ul className="divide-y rounded-lg border">
      {products.map((product) => (
        <ProductListItem
          key={product.id}
          product={product}
          event={event}
          canManage={canManage}
          isActive={isActive}
          t={t}
          tStatus={tStatus}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

export function ProcessingTab({
  event,
  products,
  currentUserId,
  canManage,
  isActive,
  t,
  tStatus,
  onDelete,
}: {
  event: EventData;
  products: ProductRow[];
  currentUserId: string;
  canManage: boolean;
  isActive: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tStatus: (key: "added" | "registered" | "processed" | "error" | "notFound" | "queued" | "printing" | "printed") => string;
  onDelete: (productId: string) => void;
}) {
  // Keep the two-hour window moving while the page stays open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const isRecent = (product: ProductRow) =>
    product.addedById === currentUserId &&
    now - new Date(product.createdAt).getTime() < RECENT_WINDOW_MS;

  const recentProducts = products.filter(isRecent);
  const otherProducts = products.filter((product) => !isRecent(product));

  return (
    <div className="space-y-6">
      {products.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{t("recentProducts")}</h2>
            <span className="text-sm text-muted-foreground">
              {t("productCount", { count: recentProducts.length })}
            </span>
          </div>
          {recentProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noRecentProducts")}
            </p>
          ) : (
            <ProductList
              products={recentProducts}
              event={event}
              canManage={canManage}
              isActive={isActive}
              t={t}
              tStatus={tStatus}
              onDelete={onDelete}
            />
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{t("products")}</h2>
          <span className="text-sm text-muted-foreground">
            {t("productCount", { count: otherProducts.length })}
          </span>
        </div>
        {otherProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {event.products.length === 0
              ? t("noProducts")
              : products.length === 0
                ? t("noResults")
                : t("noOtherProducts")}
          </p>
        ) : (
          <ProductList
            products={otherProducts}
            event={event}
            canManage={canManage}
            isActive={isActive}
            t={t}
            tStatus={tStatus}
            onDelete={onDelete}
          />
        )}
      </section>
    </div>
  );
}
