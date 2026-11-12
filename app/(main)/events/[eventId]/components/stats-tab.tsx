"use client";

import { ProductRow } from "./event-detail";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Filter } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type Period = "7d" | "30d" | "90d" | "all";

const PERIODS: readonly Period[] = ["7d", "30d", "90d", "all"];

const PERIOD_LABEL_KEYS: Record<Period, string> = {
  "7d": "last7Days",
  "30d": "last30Days",
  "90d": "last3Months",
  all: "allTime",
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dayKey(date: Date) {
  return startOfDay(date).getTime();
}

interface DayBucket {
  key: number;
  date: Date;
  registrations: number;
  printed: number;
}

export function StatsTab({ products }: { products: ProductRow[] }) {
  const t = useTranslations("StatsTab");
  const locale = useLocale();
  const [period, setPeriod] = useState<Period>("7d");

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
      }),
    [locale],
  );

  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [locale],
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const buckets = useMemo(() => {
    const today = startOfDay(new Date());

    let start = today;
    if (period === "7d") start = addDays(today, -6);
    else if (period === "30d") start = addDays(today, -29);
    else if (period === "90d") start = addDays(today, -89);
    else if (products.length > 0) {
      const earliest = products.reduce((min, product) => {
        const times = [new Date(product.createdAt).getTime()];
        if (product.printedAt) times.push(new Date(product.printedAt).getTime());
        return Math.min(min, ...times);
      }, Number.POSITIVE_INFINITY);
      start = startOfDay(new Date(earliest));
    }

    const registrationsByDay = new Map<number, number>();
    const printedByDay = new Map<number, number>();
    for (const product of products) {
      const created = new Date(product.createdAt);
      if (created >= start && created <= addDays(today, 1)) {
        const key = dayKey(created);
        registrationsByDay.set(key, (registrationsByDay.get(key) ?? 0) + 1);
      }
      if (product.printedAt) {
        const printed = new Date(product.printedAt);
        if (printed >= start && printed <= addDays(today, 1)) {
          const key = dayKey(printed);
          printedByDay.set(key, (printedByDay.get(key) ?? 0) + 1);
        }
      }
    }

    const result: DayBucket[] = [];
    for (
      let date = start;
      date.getTime() <= today.getTime();
      date = addDays(date, 1)
    ) {
      const key = dayKey(date);
      const registrations = registrationsByDay.get(key) ?? 0;
      const printed = printedByDay.get(key) ?? 0;
      // Only days with registrations or prints are charted.
      if (registrations > 0 || printed > 0) {
        result.push({ key, date: new Date(date), registrations, printed });
      }
    }
    return result;
  }, [period, products]);

  const maxCount = Math.max(
    1,
    ...buckets.map((bucket) => Math.max(bucket.registrations, bucket.printed)),
  );
  const totalRegistrations = buckets.reduce(
    (sum, bucket) => sum + bucket.registrations,
    0,
  );
  const totalPrinted = buckets.reduce((sum, bucket) => sum + bucket.printed, 0);

  const rankByCount = useMemo(() => {
    const rows = new Map<string, { id: string; name: string; count: number }>();
    for (const product of products) {
      const key = product.addedById ?? "unknown";
      const current = rows.get(key);
      rows.set(key, {
        id: key,
        name: product.addedByName ?? t("unknownVolunteer"),
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...rows.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [products, t]);

  const rankByValue = useMemo(() => {
    const rows = new Map<string, { id: string; name: string; value: number }>();
    for (const product of products) {
      const key = product.addedById ?? "unknown";
      const price = Number.parseFloat(product.price ?? "0");
      const current = rows.get(key);
      rows.set(key, {
        id: key,
        name: product.addedByName ?? t("unknownVolunteer"),
        value: (current?.value ?? 0) + (Number.isFinite(price) ? price : 0),
      });
    }
    return [...rows.values()].sort(
      (a, b) => b.value - a.value || a.name.localeCompare(b.name),
    );
  }, [products, t]);

  const rankByPrinted = useMemo(() => {
    const rows = new Map<string, { id: string; name: string; count: number }>();
    for (const product of products) {
      if (!product.printedById) continue;
      const current = rows.get(product.printedById);
      rows.set(product.printedById, {
        id: product.printedById,
        name: product.printedByName ?? t("unknownVolunteer"),
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...rows.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [products, t]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("activity")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("activityPerDay")}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Filter />
              {t(PERIOD_LABEL_KEYS[period])}
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PERIODS.map((value) => (
                <DropdownMenuItem key={value} onClick={() => setPeriod(value)}>
                  {t(PERIOD_LABEL_KEYS[value])}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary" />
              {t("registered")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-chart-3" />
              {t("printed")}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex h-44 flex-col justify-between text-xs tabular-nums text-muted-foreground">
              <span>{maxCount}</span>
              <span>0</span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex min-w-full gap-1">
                {buckets.map((bucket) => {
                  const registrationsHeight =
                    bucket.registrations === 0
                      ? 0
                      : Math.max(
                          2,
                          (bucket.registrations / maxCount) * 100,
                        );
                  const printedHeight =
                    bucket.printed === 0
                      ? 0
                      : Math.max(2, (bucket.printed / maxCount) * 100);
                  return (
                    <div
                      key={bucket.key}
                      className="min-w-[28px] flex-1"
                      title={t("dayTooltip", {
                        date: fullDateFormatter.format(bucket.date),
                        registered: bucket.registrations,
                        printed: bucket.printed,
                      })}
                    >
                      <div className="flex h-40 items-end gap-0.5">
                        <div
                          className="w-1/2 rounded-t-sm bg-primary"
                          style={{ height: `${registrationsHeight}%` }}
                        />
                        <div
                          className="w-1/2 rounded-t-sm bg-chart-3"
                          style={{ height: `${printedHeight}%` }}
                        />
                      </div>
                      <div className="mt-1 h-4 truncate text-center text-[10px] text-muted-foreground">
                        {dateFormatter.format(bucket.date)}
                      </div>
                      <div className="text-center text-[10px] font-medium tabular-nums">
                        {bucket.registrations}
                        <span className="text-muted-foreground">/</span>
                        {bucket.printed}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-right text-sm text-muted-foreground">
            <p>{t("registrationsInPeriod", { count: totalRegistrations })}</p>
            <p>{t("printedInPeriod", { count: totalPrinted })}</p>
          </div>
        </div>
        {buckets.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
        )}
      </section>

      <RankSection
        title={t("registrationsByVolunteer")}
        description={t("registrationsByVolunteerDescription")}
        nameHeader={t("volunteer")}
        valueHeader={t("registrationsCount")}
        rows={rankByCount.map((row) => ({
          key: row.id,
          name: row.name,
          value: String(row.count),
        }))}
        emptyLabel={t("noVolunteers")}
      />

      <RankSection
        title={t("printedByVolunteer")}
        description={t("printedByVolunteerDescription")}
        nameHeader={t("volunteer")}
        valueHeader={t("printedCount")}
        rows={rankByPrinted.map((row) => ({
          key: row.id,
          name: row.name,
          value: String(row.count),
        }))}
        emptyLabel={t("noPrintedTags")}
      />

      <RankSection
        title={t("totalValueByVolunteer")}
        description={t("totalValueByVolunteerDescription")}
        nameHeader={t("volunteer")}
        valueHeader={t("totalValue")}
        rows={rankByValue.map((row) => ({
          key: row.id,
          name: row.name,
          value: numberFormatter.format(row.value),
        }))}
        emptyLabel={t("noVolunteers")}
      />
    </div>
  );
}

function RankSection({
  title,
  description,
  nameHeader,
  valueHeader,
  rows,
  emptyLabel,
}: {
  title: string;
  description: string;
  nameHeader: string;
  valueHeader: string;
  rows: { key: string; name: string; value: string }[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span className="w-6 shrink-0 text-center">#</span>
            <span className="min-w-0 flex-1">{nameHeader}</span>
            <span className="shrink-0 text-right">{valueHeader}</span>
          </div>
          <ol className="divide-y">
            {rows.map((row, index) => (
              <li
                key={row.key}
                className="flex items-center gap-4 px-4 py-3"
              >
                <span className="w-6 shrink-0 text-center text-sm tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {row.name}
                </span>
                <span className="shrink-0 text-right text-sm tabular-nums">
                  {row.value}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
