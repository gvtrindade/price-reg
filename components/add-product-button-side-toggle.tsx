"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

export type AddProductButtonSide = "left" | "right";

const STORAGE_KEY = "addProductButtonSide";
const CHANGE_EVENT = "addproductbuttonsidechange";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): AddProductButtonSide {
  return localStorage.getItem(STORAGE_KEY) === "right" ? "right" : "left";
}

function getServerSnapshot(): AddProductButtonSide {
  return "left";
}

export function useAddProductButtonSide() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function AddProductButtonSideToggle() {
  const t = useTranslations("Sidebar");
  const side = useAddProductButtonSide();

  function toggle() {
    localStorage.setItem(STORAGE_KEY, side === "left" ? "right" : "left");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <Button
      variant="ghost"
      className="justify-start gap-3"
      onClick={toggle}
      aria-label={side === "left" ? t("moveAddButtonRight") : t("moveAddButtonLeft")}
    >
      {side === "left" ? (
        <ArrowRightToLine className="size-4 shrink-0" />
      ) : (
        <ArrowLeftToLine className="size-4 shrink-0" />
      )}
      <span>{side === "left" ? t("moveAddButtonRight") : t("moveAddButtonLeft")}</span>
    </Button>
  );
}
