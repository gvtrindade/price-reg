"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<string | null>;
  editable?: boolean;
  className?: string;
  inputClassName?: string;
  inputMode?: "text" | "decimal";
  label?: string;
  error?: string | null;
  onError?: (error: string | null) => void;
}

export function InlineEdit({
  value,
  onSave,
  editable = false,
  className,
  inputClassName,
  inputMode = "text",
  label,
  error,
  onError,
}: InlineEditProps) {
  const t = useTranslations("InlineEdit");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [lastSynced, setLastSynced] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!editing && value !== lastSynced) {
    setLastSynced(value);
    setDraft(value);
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function save() {
    const next = draft.trim();
    if (!next || next === value.trim()) {
      cancel();
      return;
    }
    setSaving(true);
    onError?.(null);
    const err = await onSave(next);
    setSaving(false);
    if (err) {
      onError?.(err);
      return;
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    onError?.(null);
  }

  if (!editable) return <span className={className}>{value}</span>;

  if (editing) {
    return (
      <span className="inline-flex flex-col gap-1">
        <input
          ref={inputRef}
          aria-label={label}
          value={draft}
          inputMode={inputMode}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            "w-full max-w-xs rounded-md border border-input bg-transparent px-2 py-1 text-inherit font-inherit outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
            inputClassName,
          )}
        />
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={t("edit")}
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-text rounded-md px-2 py-1 text-left transition-colors hover:bg-accent",
        className,
      )}
    >
      {value}
    </button>
  );
}
