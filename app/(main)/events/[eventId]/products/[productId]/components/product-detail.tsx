"use client";

import { deleteProductAction, duplicateProductAction, printProductsAction, reprocessProductAction, updateProductAction } from "@/actions/events";
import { InlineEdit } from "@/components/inline-edit";
import {
  PRODUCT_STATUS_LABEL_KEYS,
  EDITABLE_PRODUCT_STATUSES,
  PRINTING_QUEUED_STATUSES,
  ProductStatus,
} from "@/lib/product-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, ChevronRight, CopyPlus, MoreHorizontal, Printer, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CONSERVATION_OPTIONS = [
  { value: "As New", labelKey: "asNew" },
  { value: "Near Fine (FN)", labelKey: "nearFine" },
  { value: "Good (G)", labelKey: "good" },
  { value: "Fair", labelKey: "fair" },
] as const;

const STATUS_OPTIONS = EDITABLE_PRODUCT_STATUSES.map((value) => ({
  value,
  labelKey: PRODUCT_STATUS_LABEL_KEYS[value as ProductStatus],
}));

interface ProductData {
  id: string;
  title: string | null;
  author: string | null;
  code: string | null;
  conservationState: string;
  status: string;
  price: string | null;
}

export function ProductDetail({
  product,
  eventId,
  eventActive,
  canManage,
  canReprocess,
  previousProductId,
  nextProductId,
}: {
  product: ProductData;
  eventId: string;
  eventActive: boolean;
  canManage: boolean;
  canReprocess: boolean;
  previousProductId: string | null;
  nextProductId: string | null;
}) {
  const t = useTranslations("ProductDetail");
  const tState = useTranslations("ConservationState");
  const tStatus = useTranslations("ProductStatus");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [printing, setPrinting] = useState(false);

  const canEdit = canManage && eventActive;
  const canPrint = canManage && PRINTING_QUEUED_STATUSES.includes(product.status);

  async function handlePrint() {
    setError(null);
    setPrinting(true);
    const res = await printProductsAction({ eventId, productIds: [product.id] });
    setPrinting(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  function save(
    field: "title" | "author" | "price" | "conservationState" | "status",
  ) {
    return async (value: string) => {
      setError(null);
      const res = await updateProductAction({ productId: product.id, [field]: value });
      if (res?.error) return res.error;
      router.refresh();
      return null;
    };
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      {previousProductId && (
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={t("previousProduct")}
          className="fixed top-1/2 left-2 z-20 -translate-y-1/2 rounded-full shadow-sm md:left-6"
          render={
            <Link
              href={`/events/${eventId}/products/${previousProductId}`}
            />
          }
          nativeButton={false}
        >
          <ChevronLeft />
        </Button>
      )}
      {nextProductId && (
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={t("nextProduct")}
          className="fixed top-1/2 right-2 z-20 -translate-y-1/2 rounded-full shadow-sm md:right-6"
          render={
            <Link href={`/events/${eventId}/products/${nextProductId}`} />
          }
          nativeButton={false}
        >
          <ChevronRight />
        </Button>
      )}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href={`/events/${eventId}`} />}
          nativeButton={false}
        >
          <ArrowLeft />
          {t("backToEvent")}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 flex-1">
          <InlineEdit
            value={product.title ?? ""}
            placeholder={t("unnamed")}
            editable={canEdit}
            label={t("title")}
            className="text-2xl font-semibold"
            inputClassName="text-2xl font-semibold"
            onSave={save("title")}
            onError={setError}
          />
        </h1>
        {canPrint && (
          <Button size="sm" onClick={handlePrint} disabled={printing}>
            <Printer />
            {printing ? t("printingEllipsis") : t("print")}
          </Button>
        )}
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={t("actions")} />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canReprocess && (
                <DropdownMenuItem
                  disabled={reprocessing}
                  onClick={async () => {
                    setError(null);
                    setReprocessing(true);
                    const res = await reprocessProductAction({ productId: product.id });
                    setReprocessing(false);
                    if (res?.error) setError(res.error);
                    else router.refresh();
                  }}
                >
                  <RefreshCw className={reprocessing ? "animate-spin" : ""} />
                  {reprocessing ? t("reprocessing") : t("reprocess")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={duplicating}
                onClick={async () => {
                  setError(null);
                  setDuplicating(true);
                  const res = await duplicateProductAction({ productId: product.id });
                  setDuplicating(false);
                  if (res?.error) setError(res.error);
                  else if (res?.id) {
                    router.push(`/events/${eventId}/products/${res.id}`);
                    router.refresh();
                  }
                }}
              >
                <CopyPlus />
                {duplicating ? t("duplicating") : t("duplicate")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                {t("deleteProduct")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <dl className="space-y-1 rounded-lg border">
        <Field label={t("code")}>
          <span className="text-sm tabular-nums">
            {product.code || <span className="text-muted-foreground">—</span>}
          </span>
        </Field>
        <Field label={t("author")}>
          <InlineEdit
            value={product.author ?? ""}
            placeholder={t("unknownAuthor")}
            editable={canEdit}
            label={t("author")}
            onSave={save("author")}
            onError={setError}
          />
        </Field>
        <Field label={t("price")}>
          <InlineEdit
            value={product.price ?? ""}
            placeholder={t("notPriced")}
            editable={canEdit}
            label={t("price")}
            inputMode="decimal"
            min={2}
            step="0.01"
            onSave={save("price")}
            onError={setError}
          />
        </Field>
        <Field label={t("conservationState")}>
          <InlineEdit
            value={product.conservationState}
            editable={canEdit}
            label={t("conservationState")}
            onSave={save("conservationState")}
            onError={setError}
            options={CONSERVATION_OPTIONS.map((o) => ({
              value: o.value,
              label: tState(o.labelKey as "asNew" | "nearFine" | "good" | "fair"),
            }))}
          />
        </Field>
        <Field label={t("status")}>
          <InlineEdit
            value={product.status}
            editable={canEdit}
            label={t("status")}
            onSave={save("status")}
            onError={setError}
            options={STATUS_OPTIONS.map((o) => ({
              value: o.value,
              label: tStatus(o.labelKey as "added" | "registered" | "processed" | "error" | "notFound"),
            }))}
          />
        </Field>
      </dl>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", {
                name: product.title ?? product.code ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const res = await deleteProductAction({ productId: product.id });
                if (res?.error) setError(res.error);
                else {
                  router.push(`/events/${eventId}`);
                  router.refresh();
                }
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b px-4 py-2 last:border-b-0",
        className,
      )}
    >
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}
