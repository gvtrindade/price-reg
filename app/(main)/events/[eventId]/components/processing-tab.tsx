"use client";

import { BookRow, EventData, CONSERVATION_LABELS } from "./event-detail";
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
  BOOK_STATUS_LABEL_KEYS,
  BookStatus,
} from "@/lib/book-status";
import Link from "next/link";
import { Trash2 } from "lucide-react";

function BookListItem({
  book,
  event,
  isManager,
  isActive,
  t,
  tState,
  tStatus,
  onDelete,
}: {
  book: BookRow;
  event: EventData;
  isManager: boolean;
  isActive: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tState: (key: "asNew" | "nearFine" | "good" | "fair") => string;
  tStatus: (key: "registered" | "error" | "notFound" | "queued" | "printing" | "printed") => string;
  onDelete: (bookId: string) => void;
}) {
  const statusKey = BOOK_STATUS_LABEL_KEYS[book.status as BookStatus];
  return (
    <li className="relative flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
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
            ? tStatus(statusKey as "registered" | "error" | "notFound" | "queued" | "printing" | "printed")
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
                  onClick={() => onDelete(book.id)}
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

function BookList({
  books,
  event,
  isManager,
  isActive,
  t,
  tState,
  tStatus,
  onDelete,
}: {
  books: BookRow[];
  event: EventData;
  isManager: boolean;
  isActive: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tState: (key: "asNew" | "nearFine" | "good" | "fair") => string;
  tStatus: (key: "registered" | "error" | "notFound" | "queued" | "printing" | "printed") => string;
  onDelete: (bookId: string) => void;
}) {
  if (books.length === 0) return null;
  return (
    <ul className="divide-y rounded-lg border">
      {books.map((book) => (
        <BookListItem
          key={book.id}
          book={book}
          event={event}
          isManager={isManager}
          isActive={isActive}
          t={t}
          tState={tState}
          tStatus={tStatus}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

export function ProcessingTab({
  event,
  books,
  isManager,
  isActive,
  t,
  tState,
  tStatus,
  onDelete,
}: {
  event: EventData;
  books: BookRow[];
  isManager: boolean;
  isActive: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tState: (key: "asNew" | "nearFine" | "good" | "fair") => string;
  tStatus: (key: "registered" | "error" | "notFound" | "queued" | "printing" | "printed") => string;
  onDelete: (bookId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{t("books")}</h2>
        <span className="text-sm text-muted-foreground">
          {t("bookCount", { count: books.length })}
        </span>
      </div>
      {books.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {event.books.length === 0 ? t("noBooks") : t("noResults")}
        </p>
      ) : (
        <BookList
          books={books}
          event={event}
          isManager={isManager}
          isActive={isActive}
          t={t}
          tState={tState}
          tStatus={tStatus}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
