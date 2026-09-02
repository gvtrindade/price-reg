"use client";

import { addBookAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookScanner } from "@/components/book-scanner";
import { Hand, Plus, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "options" | "manual" | "scan" | "confirm";

export function AddBookDrawer({ eventId }: { eventId: string }) {
  const t = useTranslations("AddBookDrawer");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("options");
  const [title, setTitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [conservationState, setConservationState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function close() {
    setOpen(false);
    setStep("options");
    setTitle("");
    setIsbn("");
    setConservationState("");
    setError(null);
    setPending(false);
  }

  function requestSubmit() {
    if (!title.trim() && !isbn.trim()) {
      setError(t("nameOrIsbnRequired"));
      return;
    }
    if (!conservationState.trim()) {
      setError(t("conservationState"));
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function confirm() {
    setPending(true);
    setError(null);
    const res = await addBookAction({ eventId, title, isbn, conservationState });
    setPending(false);
    if (res?.error) {
      setError(res.error);
      setStep("manual");
      return;
    }
    close();
    router.refresh();
  }

  const displayName = title.trim() || isbn.trim();

  return (
    <Drawer open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <Button
        size="icon-lg"
        className="fixed bottom-4 left-4 z-30 rounded-full shadow-lg"
        aria-label={t("addBook")}
        onClick={() => setOpen(true)}
      >
        <Plus />
      </Button>
      <DrawerContent className="mx-auto max-w-3xl">
        {step === "options" && (
          <div className="flex flex-1 flex-col overflow-auto">
            <DrawerHeader>
              <DrawerTitle>{t("title")}</DrawerTitle>
              <DrawerDescription>{t("description")}</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep("manual")}
                className="flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
              >
                <Hand className="size-5" />
                <span className="font-medium">{t("manual")}</span>
                <span className="text-sm text-muted-foreground">
                  {t("manualDescription")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
              >
                <ScanLine className="size-5" />
                <span className="font-medium">{t("scan")}</span>
                <span className="text-sm text-muted-foreground">
                  {t("scanDescription")}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === "scan" && (
          <div className="flex flex-1 flex-col overflow-auto">
            <DrawerHeader>
              <DrawerTitle>{t("scan")}</DrawerTitle>
              <DrawerDescription>{t("scanHint")}</DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <BookScanner
                onDetected={(isbn) => {
                  setIsbn(isbn);
                  setError(null);
                  setStep("manual");
                }}
                onManualFallback={() => setStep("manual")}
              />
            </div>
            <DrawerFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("options")}
              >
                {t("back")}
              </Button>
            </DrawerFooter>
          </div>
        )}

        {step === "manual" && (
          <form
            className="flex flex-1 flex-col overflow-auto"
            onSubmit={(e) => {
              e.preventDefault();
              requestSubmit();
            }}
          >
            <DrawerHeader>
              <DrawerTitle>{t("manual")}</DrawerTitle>
              <DrawerDescription>{t("manualFormDescription")}</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="book-title">{t("nameField")}</Label>
                <Input
                  id="book-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="book-isbn">{t("isbnField")}</Label>
                <Input
                  id="book-isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder={t("isbnPlaceholder")}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="book-conservation">
                  {t("conservationState")} *
                </Label>
                <Input
                  id="book-conservation"
                  value={conservationState}
                  onChange={(e) => setConservationState(e.target.value)}
                  placeholder={t("conservationPlaceholder")}
                  aria-invalid={!!error}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DrawerFooter>
              <Button type="button" variant="ghost" onClick={close}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("continue")}</Button>
            </DrawerFooter>
          </form>
        )}

        {step === "confirm" && (
          <div className="flex flex-1 flex-col overflow-auto">
            <DrawerHeader>
              <DrawerTitle>{t("confirmTitle")}</DrawerTitle>
              <DrawerDescription>
                {t("confirmDescription", {
                  name: displayName,
                  state: conservationState.trim(),
                })}
              </DrawerDescription>
            </DrawerHeader>
            {error && (
              <p className="px-4 pb-2 text-sm text-destructive">{error}</p>
            )}
            <DrawerFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setStep("manual")}
              >
                {t("back")}
              </Button>
              <Button type="button" disabled={pending} onClick={confirm}>
                {pending ? t("creating") : t("confirm")}
              </Button>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
