"use client";

import {
  cancelEventAction,
  deleteProductAction,
  updateEventTitleAction,
} from "@/actions/events";
import { AddProductDrawer } from "./add-product-drawer";
import { EventMembersDialog, type EventMemberUser } from "./event-members-dialog";
import { ProcessingTab } from "./processing-tab";
import { PrintingTab } from "./printing-tab";
import { TotalsTab } from "./totals-tab";
import { InlineEdit } from "@/components/inline-edit";
import { toast } from "@/components/toast";
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
import { Tabs } from "@base-ui/react/tabs";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, RefreshCw } from "lucide-react";
import {
  PROCESSING_STATUSES,
  PRINTING_QUEUED_STATUSES,
  PRINTING_IN_PROGRESS_STATUSES,
  PRINTING_DONE_STATUSES,
} from "@/lib/product-status";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface ProductRow {
  id: string;
  title: string | null;
  author: string | null;
  code: string | null;
  conservationState: string;
  status: string;
  price: string | null;
  addedByName: string | null;
}

export interface EventData {
  id: string;
  title: string;
  status: "ACTIVE" | "INACTIVE";
  hasTemplate: boolean;
  products: ProductRow[];
}

export const CONSERVATION_LABELS: Record<string, string> = {
  "As New": "asNew",
  "Near Fine (FN)": "nearFine",
  "Good (G)": "good",
  Fair: "fair",
};

const tabClass = cn(
  "cursor-pointer rounded-t-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
  "data-[active]:bg-accent data-[active]:text-accent-foreground",
);

export function EventDetail({
  event,
  isManager,
  canManageProducts,
  users,
  assignedUserIds,
}: {
  event: EventData;
  isManager: boolean;
  canManageProducts: boolean;
  users: EventMemberUser[];
  assignedUserIds: string[];
}) {
  const t = useTranslations("EventDetail");
  const tState = useTranslations("ConservationState");
  const tStatus = useTranslations("ProductStatus");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [registeringExternalIds, setRegisteringExternalIds] = useState(false);

  const isActive = event.status === "ACTIVE";

  // Poll for status changes made by print-result webhooks.
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => router.refresh(), 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isActive, router]);

  const filterProducts = (statuses: readonly string[]) => {
    return event.products.filter((product) => statuses.includes(product.status));
  };

  const processingProducts = filterProducts(PROCESSING_STATUSES);
  const queuedProducts = filterProducts(PRINTING_QUEUED_STATUSES);
  const printingProducts = filterProducts(PRINTING_IN_PROGRESS_STATUSES);
  const printedProducts = filterProducts(PRINTING_DONE_STATUSES);

  function refresh() {
    router.refresh();
  }

  async function handleDeleteProduct(productId: string) {
    const res = await deleteProductAction({ productId });
    if (res?.error) setError(res.error);
    else refresh();
  }

  async function handleRegisterExternalIds() {
    if (registeringExternalIds) return;
    setError(null);
    setRegisteringExternalIds(true);
    try {
      const response = await fetch(
        `/api/events/${event.id}/external-ids`,
        { method: "POST" },
      );
      const result = (await response.json().catch(() => null)) as {
        updated?: number;
        remaining?: number;
        error?: string;
      } | null;

      if (!response.ok) {
        const knownErrors: Record<string, string> = {
          priceFinderNotConfigured: tErrors("priceFinderNotConfigured"),
          priceFinderUnreachable: tErrors("priceFinderUnreachable"),
          priceFinderRejected: tErrors("priceFinderRejected"),
          eventNotFound: tErrors("eventNotFound"),
        };
        throw new Error(
          (result?.error && knownErrors[result.error]) ||
            t("externalIdsError"),
        );
      }

      const updated = result?.updated ?? 0;
      const remaining = result?.remaining ?? 0;
      toast.add({
        type: updated > 0 ? "success" : "info",
        title:
          updated > 0
            ? t("externalIdsRegistered", { count: updated })
            : t("noExternalIdsRegistered"),
        description: t("externalIdsRemaining", { count: remaining }),
      });
      refresh();
    } catch (e) {
      toast.add({
        type: "error",
        title: t("externalIdsError"),
        description: e instanceof Error ? e.message : t("externalIdsError"),
      });
    } finally {
      setRegisteringExternalIds(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/events" />}
        nativeButton={false}
      >
        <ArrowLeft />
        {t("backToEvents")}
      </Button>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {!isActive && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t("cancelled")}
            </span>
          )}
          <InlineEdit
            value={event.title}
            editable={isManager && isActive}
            label={t("nameField")}
            className="text-2xl font-semibold"
            inputClassName="text-2xl font-semibold"
            onSave={async (title) => {
              const res = await updateEventTitleAction({
                eventId: event.id,
                title,
              });
              if (res?.error) return res.error;
              refresh();
              return null;
            }}
          />
        </div>
        {isManager && isActive && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("actions")}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/events/${event.id}/template`)
                  }
                >
                  {event.hasTemplate ? t("changeTemplate") : t("newTemplate")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMembersDialogOpen(true)}>
                  {t("manageMembers")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={registeringExternalIds}
                  onClick={handleRegisterExternalIds}
                >
                  <RefreshCw
                    className={registeringExternalIds ? "animate-spin" : ""}
                  />
                  {registeringExternalIds
                    ? t("registeringExternalIds")
                    : t("registerExternalIds")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCancelDialogOpen(true)}>
                  {t("cancelEvent")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog
              open={cancelDialogOpen}
              onOpenChange={setCancelDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("cancelEventConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("cancelEventConfirmDescription", { name: event.title })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const res = await cancelEventAction({
                        eventId: event.id,
                      });
                      if (res?.error) setError(res.error);
                      else {
                        router.push("/events");
                        router.refresh();
                      }
                    }}
                  >
                    {t("cancelEvent")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <EventMembersDialog
              open={membersDialogOpen}
              onOpenChange={setMembersDialogOpen}
              eventId={event.id}
              users={users}
              assignedUserIds={assignedUserIds}
            />
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs.Root defaultValue="processing" className="flex flex-col gap-4">
        <Tabs.List className="flex gap-1 border-b">
          <Tabs.Tab value="processing" className={tabClass}>
            {t("processingTab")}
          </Tabs.Tab>
          <Tabs.Tab value="printing" className={tabClass}>
            {t("printingTab")}
          </Tabs.Tab>
          <Tabs.Tab value="totals" className={tabClass}>
            {t("totalsTab")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="processing">
          <ProcessingTab
            event={event}
            products={processingProducts}
            canManage={canManageProducts}
            isActive={isActive}
            t={t}
            tStatus={tStatus}
            onDelete={handleDeleteProduct}
          />
        </Tabs.Panel>

        <Tabs.Panel value="printing">
          <PrintingTab
            event={event}
            queuedProducts={queuedProducts}
            printingProducts={printingProducts}
            printedProducts={printedProducts}
            canManage={canManageProducts}
            t={t}
          />
        </Tabs.Panel>

        <Tabs.Panel value="totals">
          <TotalsTab
            event={event}
            products={event.products}
            t={t}
            tState={tState}
          />
        </Tabs.Panel>
      </Tabs.Root>

      {isActive && <AddProductDrawer eventId={event.id} />}
    </main>
  );
}
