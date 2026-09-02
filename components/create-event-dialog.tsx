"use client";

import { createEventAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateEventDialog() {
  const t = useTranslations("CreateEventDialog");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function close() {
    setOpen(false);
    setStep("form");
    setTitle("");
    setError(null);
    setPending(false);
  }

  function requestSubmit() {
    if (!title.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function confirm() {
    setPending(true);
    setError(null);
    const res = await createEventAction({ title });
    setPending(false);
    if (res?.error) {
      setError(res.error);
      setStep("form");
      return;
    }
    close();
    router.push(`/events/${res.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <Button onClick={() => setOpen(true)}>{t("addEvent")}</Button>
      <DialogContent showCloseButton={false}>
        {step === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="event-name">{t("nameLabel")}</Label>
              <Input
                id="event-name"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("namePlaceholder")}
                aria-invalid={!!error}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("continue")}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle>{t("confirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("confirmDescription", { name: title.trim() })}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p className="py-2 text-sm text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setStep("form")}
              >
                {t("back")}
              </Button>
              <Button type="button" disabled={pending} onClick={confirm}>
                {pending ? t("creating") : t("confirm")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
