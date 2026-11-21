export const EVENT_TABS = ["processing", "printing", "totals", "stats"] as const;

export type EventTab = (typeof EVENT_TABS)[number];

export const DEFAULT_EVENT_TAB: EventTab = "processing";

/** Returns a valid tab, falling back to processing for unknown values. */
export function normalizeEventTab(value: string | null | undefined): EventTab {
  return EVENT_TABS.includes(value as EventTab)
    ? (value as EventTab)
    : DEFAULT_EVENT_TAB;
}

/** Query string suffix used to remember the active tab in the URL. */
export function eventTabQuery(tab: string | null | undefined): string {
  return tab ? `?tab=${encodeURIComponent(tab)}` : "";
}
