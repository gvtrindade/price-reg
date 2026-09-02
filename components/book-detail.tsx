"use client";

import { deleteBookAction, updateBookAction } from "@/actions/events";
import { InlineEdit } from "@/components/inline-edit";
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
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookData {
  id: string;
  title: string | null;
  isbn: string | null;
  conservationState: string;
  status: string;
  price: string | null;
}

export function BookDetail({
  book,
  eventId,
  eventActive,
  isManager,
}: {
  book: BookData;
  eventId: string;
  eventActive: boolean;
  isManager: boolean;
}) {
  const t = useTranslations("BookDetail");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canEdit = isManager && eventActive;

  function save(field: "title" | "price" | "conservationState" | "status") {
    return async (value: string) => {
      setError(null);
      const res = await updateBookAction({ bookId: book.id, [field]: value });
      if (res?.error) return res.error;
      router.refresh();
      return null;
    };
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
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

      <div className="flex items-center gap-2">
        <h1 className="min-w-0 flex-1">
          <InlineEdit
            value={book.title ?? ""}
            placeholder={t("unnamed")}
            editable={canEdit}
            label={t("title")}
            className="text-2xl font-semibold"
            inputClassName="text-2xl font-semibold"
            onSave={save("title")}
            onError={setError}
          />
        </h1>
        {isManager && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={t("actions")} />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                {t("deleteBook")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <dl className="space-y-1 rounded-lg border">
        <Field label={t("isbn")}>
          <span className="text-sm tabular-nums">
            {book.isbn || <span className="text-muted-foreground">—</span>}
          </span>
        </Field>
        <Field label={t("price")}>
          <InlineEdit
            value={book.price ?? ""}
            placeholder={t("notPriced")}
            editable={canEdit}
            label={t("price")}
            inputMode="decimal"
            onSave={save("price")}
            onError={setError}
          />
        </Field>
        <Field label={t("conservationState")}>
          <InlineEdit
            value={book.conservationState}
            editable={canEdit}
            label={t("conservationState")}
            onSave={save("conservationState")}
            onError={setError}
          />
        </Field>
        <Field label={t("status")}>
          <InlineEdit
            value={book.status}
            editable={canEdit}
            label={t("status")}
            onSave={save("status")}
            onError={setError}
          />
        </Field>
      </dl>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", {
                name: book.title ?? book.isbn ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const res = await deleteBookAction({ bookId: book.id });
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
