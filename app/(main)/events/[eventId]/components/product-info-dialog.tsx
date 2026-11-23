"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRODUCT_STATUS_LABEL_KEYS, ProductStatus } from "@/lib/product-status";
import type { ProductRow } from "./event-detail";

// How long the pointer has to stay down before the product info modal opens.
const HOLD_DELAY_MS = 400;
// Moving further than this cancels the hold, so scrolling never opens the modal.
const MOVE_TOLERANCE_PX = 10;

const CONSERVATION_LABEL_KEYS: Record<string, string> = {
  "As New": "asNew",
  "Near Fine (FN)": "nearFine",
  "Good (G)": "good",
  Fair: "fair",
};

export type ProductHoldHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void;
};

/**
 * Press-and-hold behaviour for product rows. While the pointer is down for
 * `HOLD_DELAY_MS` the given product is exposed so the caller can show the info
 * modal, and releasing the pointer hides it again. The click that would
 * normally follow a release is swallowed so holding does not also toggle the
 * selection or navigate to the product page.
 */
export function useProductInfoHold(): {
  product: ProductRow | null;
  bind: (product: ProductRow) => ProductHoldHandlers;
  close: () => void;
} {
  const [product, setProduct] = useState<ProductRow | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const heldRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setProduct(null);
  }, [clearTimer]);

  // While the modal is open, releasing the pointer anywhere closes it. Keeping
  // `heldRef` set until the following click lets `onClickCapture` swallow it.
  useEffect(() => {
    if (!product) return;
    const handleRelease = () => close();
    window.addEventListener("pointerup", handleRelease);
    window.addEventListener("pointercancel", handleRelease);
    window.addEventListener("blur", handleRelease);
    return () => {
      window.removeEventListener("pointerup", handleRelease);
      window.removeEventListener("pointercancel", handleRelease);
      window.removeEventListener("blur", handleRelease);
    };
  }, [product, close]);

  useEffect(() => clearTimer, [clearTimer]);

  const bind = useCallback(
    (nextProduct: ProductRow): ProductHoldHandlers => ({
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        heldRef.current = false;
        clearTimer();
        startRef.current = { x: event.clientX, y: event.clientY };
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          heldRef.current = true;
          setProduct(nextProduct);
        }, HOLD_DELAY_MS);
      },
      onPointerMove: (event) => {
        const start = startRef.current;
        if (!start) return;
        const distance = Math.hypot(
          event.clientX - start.x,
          event.clientY - start.y,
        );
        if (distance > MOVE_TOLERANCE_PX) clearTimer();
      },
      onPointerUp: close,
      onPointerCancel: close,
      onPointerLeave: () => {
        // Once the modal opened, keep it until the pointer is released.
        if (!heldRef.current) clearTimer();
      },
      onContextMenu: (event) => {
        // Long-pressing a link on touch devices would otherwise open the
        // browser's context menu right after our hold timer fires.
        if (heldRef.current) event.preventDefault();
      },
      onClickCapture: (event) => {
        if (!heldRef.current) return;
        heldRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    }),
    [clearTimer, close],
  );

  return { product, bind, close };
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">
        {children}
      </dd>
    </div>
  );
}

export function ProductInfoDialog({
  product,
  onClose,
}: {
  product: ProductRow | null;
  onClose: () => void;
}) {
  const t = useTranslations("ProductDetail");
  const tEvent = useTranslations("EventDetail");
  const tState = useTranslations("ConservationState");
  const tStatus = useTranslations("ProductStatus");
  const locale = useLocale();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const formatDate = (date: Date | null) =>
    date ? dateFormatter.format(new Date(date)) : "—";

  const statusKey =
    product && PRODUCT_STATUS_LABEL_KEYS[product.status as ProductStatus];
  const conservationKey =
    product && CONSERVATION_LABEL_KEYS[product.conservationState];

  return (
    <Dialog
      open={product !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        {product && (
          <>
            <DialogHeader>
              <DialogTitle>
                {product.title ?? product.code ?? t("unnamed")}
              </DialogTitle>
              <DialogDescription>
                {product.author ?? t("unknownAuthor")}
              </DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 text-sm">
              <InfoRow label={t("code")}>{product.code ?? "—"}</InfoRow>
              <InfoRow label={t("price")}>
                {product.price ?? t("notPriced")}
              </InfoRow>
              <InfoRow label={t("conservationState")}>
                {conservationKey
                  ? tState(conservationKey)
                  : product.conservationState}
              </InfoRow>
              <InfoRow label={t("status")}>
                {statusKey ? tStatus(statusKey) : product.status}
              </InfoRow>
              <InfoRow label={tEvent("productInfoAddedBy")}>
                {product.addedByName ?? "—"}
              </InfoRow>
              <InfoRow label={tEvent("productInfoAddedAt")}>
                {formatDate(product.createdAt)}
              </InfoRow>
              <InfoRow label={tEvent("productInfoPrintedBy")}>
                {product.printedByName ?? "—"}
              </InfoRow>
              <InfoRow label={tEvent("productInfoPrintedAt")}>
                {product.printedAt
                  ? formatDate(product.printedAt)
                  : tEvent("productInfoNotPrinted")}
              </InfoRow>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
