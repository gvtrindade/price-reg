"use client";

import {
  upsertPrintTemplateAction,
  deletePrintTemplateAction,
} from "@/actions/events";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface EventInfo {
  id: string;
  title: string;
  status: "ACTIVE" | "INACTIVE";
}

interface TemplateInfo {
  id: string;
  blobUrl: string;
}

export function PrintTemplateDetail({
  event,
  template,
}: {
  event: EventInfo;
  template: TemplateInfo | null;
}) {
  const t = useTranslations("PrintTemplate");
  const [currentTemplate, setCurrentTemplate] = useState<TemplateInfo | null>(template);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.type !== "image/svg+xml") {
      setError(t("invalidSvg"));
      return;
    }
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPendingPreview(url);
    setError(null);
  }, [t]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const clearPending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [pendingPreview]);

  const handleSave = useCallback(async () => {
    if (!pendingFile) return;
    setSaving(true);
    setError(null);
    try {
      const buffer = await pendingFile.arrayBuffer();
      const res = await upsertPrintTemplateAction({
        eventId: event.id,
        blob: new Uint8Array(buffer),
      });
      if (res?.error) {
        setError(res.error);
        setSaving(false);
        return;
      }
      const url = URL.createObjectURL(pendingFile);
      setCurrentTemplate({ id: "current", blobUrl: url });
      clearPending();
    } catch {
      setError(t("saveError"));
    }
    setSaving(false);
  }, [pendingFile, event.id, clearPending, t]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await deletePrintTemplateAction({ eventId: event.id });
      if (res?.error) {
        setError(res.error);
        setSaving(false);
        return;
      }
      if (currentTemplate) URL.revokeObjectURL(currentTemplate.blobUrl);
      setCurrentTemplate(null);
      clearPending();
    } catch {
      setError(t("deleteError"));
    }
    setSaving(false);
  }, [event.id, currentTemplate, clearPending, t]);

  const previewUrl = pendingPreview ?? currentTemplate?.blobUrl ?? null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href={`/events/${event.id}`} />}
        nativeButton={false}
      >
        <ArrowLeft />
        {t("backToEvent")}
      </Button>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {currentTemplate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={saving}
          >
            {t("deleteTemplate")}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div
        className={`flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {previewUrl ? (
          <div className="relative flex w-full flex-col items-center gap-4 p-4">
            {pendingFile && (
              <button
                type="button"
                onClick={clearPending}
                className="absolute right-2 top-2 rounded-full p-1 hover:bg-accent"
                aria-label={t("removeFile")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <img
              src={previewUrl}
              alt={t("templatePreview")}
              className="max-h-[400px] w-full max-w-md object-contain"
            />
            {pendingFile && (
              <p className="text-sm text-muted-foreground">
                {pendingFile.name}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("dropzoneText")}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/svg+xml"
          onChange={handleFileInput}
          className="hidden"
          id="template-file"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          {t("chooseFile")}
        </Button>
        {pendingFile && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        )}
      </div>
    </main>
  );
}
