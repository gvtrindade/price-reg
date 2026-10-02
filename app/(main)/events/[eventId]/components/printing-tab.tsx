"use client";

import { BookRow, EventData } from "./event-detail";
import { printBooksAction, updateBookAction } from "@/actions/events";
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
import { BookStatus } from "@/lib/book-status";
import { Ellipsis, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function QueuedBookListItem({
  book,
  event,
  selected,
  onToggle,
  t,
}: {
  book: BookRow;
  event: EventData;
  selected: boolean;
  onToggle: (bookId: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <li className="relative flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
      <div className="relative z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(book.id)}
          className="h-4 w-4 rounded border-gray-300 accent-primary"
        />
      </div>
      <Link
        href={`/events/${event.id}/books/${book.id}`}
        aria-label={t("openBook")}
        className="absolute inset-0 rounded-lg pl-12 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <p className="min-w-0 flex-1 truncate font-medium">
        {book.title ?? book.isbn ?? "—"}
      </p>
    </li>
  );
}

function PrintBookListItem({
  book,
  event,
}: {
  book: BookRow;
  event: EventData;
}) {
  return (
    <li className="flex items-center p-4 transition-colors hover:bg-accent/50">
      <Link
        href={`/events/${event.id}/books/${book.id}`}
        className="block w-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg -m-2 p-2"
      >
        <p className="truncate font-medium">
          {book.title ?? book.isbn ?? "—"}
        </p>
      </Link>
    </li>
  );
}

function PrintBookListItemWithMenu({
  book,
  event,
  t,
  onStopPrint,
}: {
  book: BookRow;
  event: EventData;
  t: (key: string, values?: Record<string, string | number>) => string;
  onStopPrint: (bookId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <li className="relative flex items-center p-4 transition-colors hover:bg-accent/50">
      <Link
        href={`/events/${event.id}/books/${book.id}`}
        className="block min-w-0 flex-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg -m-2 p-2"
      >
        <p className="truncate font-medium">
          {book.title ?? book.isbn ?? "—"}
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
                  name: book.title ?? book.isbn ?? "",
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
                  onStopPrint(book.id);
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

function PrintBookList({
  books,
  event,
  t,
  onStopPrint,
  showMenu,
}: {
  books: BookRow[];
  event: EventData;
  t: (key: string, values?: Record<string, string | number>) => string;
  onStopPrint: (bookId: string) => void;
  showMenu: boolean;
}) {
  if (books.length === 0) return null;
  return (
    <ul className="divide-y rounded-lg border">
      {books.map((book) =>
        showMenu ? (
          <PrintBookListItemWithMenu
            key={book.id}
            book={book}
            event={event}
            t={t}
            onStopPrint={onStopPrint}
          />
        ) : (
          <PrintBookListItem key={book.id} book={book} event={event} />
        )
      )}
    </ul>
  );
}

export function PrintingTab({
  event,
  queuedBooks,
  printingBooks,
  printedBooks,
  t,
}: {
  event: EventData;
  queuedBooks: BookRow[];
  printingBooks: BookRow[];
  printedBooks: BookRow[];
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);

  function refresh() {
    router.refresh();
  }

  const toggleBookSelection = useCallback((bookId: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }, []);

  async function handlePrint() {
    if (selectedBookIds.size === 0) return;
    setIsPrinting(true);
    setError(null);
    const res = await printBooksAction({
      eventId: event.id,
      bookIds: Array.from(selectedBookIds),
    });
    if (res?.error) setError(res.error);
    else {
      setSelectedBookIds(new Set());
      refresh();
    }
    setIsPrinting(false);
  }

  async function handleStopPrint(bookId: string) {
    setError(null);
    const res = await updateBookAction({ bookId, status: BookStatus.QUEUED });
    if (res?.error) setError(res.error);
    else refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{t("queuedToPrint")}</h2>
          <Button
            size="sm"
            onClick={handlePrint}
            disabled={selectedBookIds.size === 0 || isPrinting}
          >
            <Printer />
            {isPrinting ? t("printing") : t("print")}
          </Button>
        </div>
        {queuedBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBooks")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {queuedBooks.map((book) => (
              <QueuedBookListItem
                key={book.id}
                book={book}
                event={event}
                selected={selectedBookIds.has(book.id)}
                onToggle={toggleBookSelection}
                t={t}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("printing")}</h2>
        {printingBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBooks")}</p>
        ) : (
          <PrintBookList
            books={printingBooks}
            event={event}
            t={t}
            onStopPrint={handleStopPrint}
            showMenu
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{t("printed")}</h2>
          <span className="text-sm text-muted-foreground">
            {t("bookCount", { count: printedBooks.length })}
          </span>
        </div>
        {printedBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBooks")}</p>
        ) : (
          <PrintBookList
            books={printedBooks}
            event={event}
            t={t}
            onStopPrint={handleStopPrint}
            showMenu
          />
        )}
      </section>
    </div>
  );
}
