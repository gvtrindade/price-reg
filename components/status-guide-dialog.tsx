"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PRODUCT_STATUS_LABEL_KEYS,
  ProductStatus,
} from "@/lib/product-status";
import { useTranslations } from "next-intl";

const STATUSES: ProductStatus[] = [
  ProductStatus.ADDED,
  ProductStatus.REGISTERED,
  ProductStatus.PROCESSED,
  ProductStatus.ERROR,
  ProductStatus.NOT_FOUND,
  ProductStatus.QUEUED,
  ProductStatus.PRINTING,
  ProductStatus.PRINTED,
];

export function StatusGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("StatusGuide");
  const tStatus = useTranslations("ProductStatus");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-lg border">
          {STATUSES.map((status) => {
            const key = PRODUCT_STATUS_LABEL_KEYS[status];
            return (
              <div key={status} className="space-y-1 p-3">
                <dt className="font-medium">{tStatus(key)}</dt>
                <dd className="text-sm text-muted-foreground">
                  {t(key)}
                </dd>
              </div>
            );
          })}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
