"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function SearchInput({
  value,
  onValueChange,
  clearLabel,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  clearLabel: string;
}) {
  return (
    <div className="relative">
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn("[&::-webkit-search-cancel-button]:appearance-none pr-9", className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={clearLabel}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-r-lg"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export { SearchInput };
