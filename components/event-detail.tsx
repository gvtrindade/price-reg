"use client";

import {
  cancelEventAction,
  deleteBookAction,
  updateEventTitleAction,
} from "@/actions/events";
import { AddBookDrawer } from "@/components/add-book-drawer";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Trash2 } from "lucide-react";
import { BOOK_STATUS_LABEL_KEYS, type BookStatus } from "@/lib/book-status";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookRow {
  id: string;
  title: string | null;
  isbn: string | null;
  conservationState: string;
  status: string;
  price: string | null;
}

interface EventData {
  id: string;
  title: string;
  status: "ACTIVE" | "INACTIVE";
  books: BookRow[];
}

const CONSERVATION_LABELS: Record<string, string> = {
  "As New": "asNew",
  "Near Fine (FN)": "nearFine",
  "Good (G)": "good",
  Fair: "fair",
};

export function EventDetail({
  event,
  isManager,
}: {
  event: EventData;
  isManager: boolean;
}) {
  const t = useTranslations("EventDetail");
  const tState = useTranslations("ConservationState");
  const tStatus = useTranslations("BookStatus");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const isActive = event.status === "ACTIVE";
  const query = search.trim().toLowerCase();
  const books = query
    ? event.books.filter(
        (book) =>
          (book.title ?? "").toLowerCase().includes(query) ||
          (book.isbn ?? "").toLowerCase().includes(query),
      )
    : event.books;

  function refresh() {
    router.refresh();
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
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{t("books")}</h2>
          <span className="text-sm text-muted-foreground">
            {t("bookCount", { count: event.books.length })}
          </span>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {event.books.length === 0 ? t("noBooks") : t("noResults")}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {books.map((book) => {
              const statusKey = BOOK_STATUS_LABEL_KEYS[book.status as BookStatus];
              return (
                <li
                  key={book.id}
                  className="relative flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
                >
                  <Link
                    href={`/events/${event.id}/books/${book.id}`}
                    aria-label={t("openBook")}
                    className="absolute inset-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {book.title ?? book.isbn ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tState(
                        (CONSERVATION_LABELS[book.conservationState] ??
                          book.conservationState) as
                          | "asNew"
                          | "nearFine"
                          | "good"
                          | "fair",
                      )}{" "}
                      ·{" "}
                      {statusKey
                        ? tStatus(statusKey as "registered" | "error" | "notFound")
                        : book.status}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    {book.price ?? "—"}
                  </span>
                  {isManager && isActive && (
                    <div className="relative z-10 flex shrink-0 items-center gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("deleteBook")}
                            />
                          }
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("deleteBookConfirmTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteBookConfirmDescription", {
                                name: book.title ?? book.isbn ?? "",
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                const res = await deleteBookAction({
                                  bookId: book.id,
                                });
                                if (res?.error) setError(res.error);
                                else refresh();
                              }}
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
            })}
          </ul>
        )}
      </section>

      {isActive && <AddBookDrawer eventId={event.id} />}
    </main>
  );
}
