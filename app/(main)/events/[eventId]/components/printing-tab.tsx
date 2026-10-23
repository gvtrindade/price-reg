"use client";

import { ProductRow, EventData } from "./event-detail";
import { printProductsAction, updateProductAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ProductStatus } from "@/lib/product-status";
import { Ellipsis, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function QueuedProductListItem({
  product,
  selected,
  onToggle,
}: {
  product: ProductRow;
  selected: boolean;
  onToggle: (productId: string) => void;
}) {
  return (
    <li
      role="checkbox"
      aria-checked={selected}
      aria-label={product.title ?? product.code ?? product.id}
      tabIndex={0}
      onClick={() => onToggle(product.id)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle(product.id);
        }
      }}
      className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-accent/50 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <input
        type="checkbox"
        checked={selected}
        readOnly
        tabIndex={-1}
        className="pointer-events-none h-4 w-4 rounded border-gray-300 accent-primary"
      />
      <p className="min-w-0 flex-1 truncate font-medium">
        {product.title ?? product.code ?? "—"}
      </p>
    </li>
  );
}

function PrintProductListItem({
  product,
  event,
}: {
  product: ProductRow;
  event: EventData;
}) {
  return (
    <li className="flex items-center p-4 transition-colors hover:bg-accent/50">
      <Link
        href={`/events/${event.id}/products/${product.id}`}
        className="block w-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg -m-2 p-2"
      >
        <p className="truncate font-medium">
          {product.title ?? product.code ?? "—"}
        </p>
      </Link>
    </li>
  );
}

function PrintProductListItemWithMenu({
  product,
  event,
  t,
  onStopPrint,
}: {
  product: ProductRow;
  event: EventData;
  t: (key: string, values?: Record<string, string | number>) => string;
  onStopPrint: (productId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <li className="relative flex items-center p-4 transition-colors hover:bg-accent/50">
      <Link
        href={`/events/${event.id}/products/${product.id}`}
        className="block min-w-0 flex-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg -m-2 p-2"
      >
        <p className="truncate font-medium">
          {product.title ?? product.code ?? "—"}
        </p>
      </Link>
      <div className="relative z-10 flex shrink-0 items-center">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("actions")}
              />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setMenuOpen(false); setDrawerOpen(true); }}>
              {t("stopPrint")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("stopPrintConfirmTitle")}</DrawerTitle>
              <DrawerDescription>
                {t("stopPrintConfirmDescription", {
                  name: product.title ?? product.code ?? "",
                })}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button
                variant="outline"
                onClick={() => setDrawerOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={() => {
                  onStopPrint(product.id);
                  setDrawerOpen(false);
                }}
              >
                {t("stopPrint")}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </li>
  );
}

function PrintProductList({
  products,
  event,
  t,
  onStopPrint,
  showMenu,
}: {
  products: ProductRow[];
  event: EventData;
  t: (key: string, values?: Record<string, string | number>) => string;
  onStopPrint: (productId: string) => void;
  showMenu: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <ul className="divide-y rounded-lg border">
      {products.map((product) =>
        showMenu ? (
          <PrintProductListItemWithMenu
            key={product.id}
            product={product}
            event={event}
            t={t}
            onStopPrint={onStopPrint}
          />
        ) : (
          <PrintProductListItem key={product.id} product={product} event={event} />
        )
      )}
    </ul>
  );
}

export function PrintingTab({
  event,
  queuedProducts,
  printingProducts,
  printedProducts,
  canManage,
  t,
}: {
  event: EventData;
  queuedProducts: ProductRow[];
  printingProducts: ProductRow[];
  printedProducts: ProductRow[];
  canManage: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);

  const query = search.trim().toLowerCase();
  const filteredQueuedProducts = query
    ? queuedProducts.filter(
        (product) =>
          (product.title ?? "").toLowerCase().includes(query) ||
          (product.code ?? "").toLowerCase().includes(query),
      )
    : queuedProducts;

  function refresh() {
    router.refresh();
  }

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  async function handlePrint() {
    if (selectedProductIds.size === 0) return;
    setIsPrinting(true);
    setError(null);
    const res = await printProductsAction({
      eventId: event.id,
      productIds: Array.from(selectedProductIds),
    });
    if (res?.error) setError(res.error);
    else {
      setSelectedProductIds(new Set());
      refresh();
    }
    setIsPrinting(false);
  }

  async function handleStopPrint(productId: string) {
    setError(null);
    const res = await updateProductAction({ productId, status: ProductStatus.QUEUED });
    if (res?.error) setError(res.error);
    else refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{t("queuedToPrint")}</h2>
          {canManage && (
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={selectedProductIds.size === 0 || isPrinting}
            >
              <Printer />
              {isPrinting ? t("printingEllipsis") : t("print")}
            </Button>
          )}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchQueuePlaceholder")}
          aria-label={t("searchQueuePlaceholder")}
        />
        {queuedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
        ) : filteredQueuedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {filteredQueuedProducts.map((product) => (
              <QueuedProductListItem
                key={product.id}
                product={product}
                selected={selectedProductIds.has(product.id)}
                onToggle={toggleProductSelection}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("printing")}</h2>
        {printingProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
        ) : (
          <PrintProductList
            products={printingProducts}
            event={event}
            t={t}
            onStopPrint={handleStopPrint}
            showMenu={canManage}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{t("printed")}</h2>
          <span className="text-sm text-muted-foreground">
            {t("productCount", { count: printedProducts.length })}
          </span>
        </div>
        {printedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
        ) : (
          <PrintProductList
            products={printedProducts}
            event={event}
            t={t}
            onStopPrint={handleStopPrint}
            showMenu={canManage}
          />
        )}
      </section>
    </div>
  );
}
