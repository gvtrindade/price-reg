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
  count: number;
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
      const earliest = products.reduce(
        (min, product) =>
          Math.min(min, new Date(product.createdAt).getTime()),
        Number.POSITIVE_INFINITY,
      );
      start = startOfDay(new Date(earliest));
    }

    const counts = new Map<number, number>();
    for (const product of products) {
      const created = new Date(product.createdAt);
      if (created < start) continue;
      if (created > addDays(today, 1)) continue;
      const key = dayKey(created);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const result: DayBucket[] = [];
    for (
      let date = start;
      date.getTime() <= today.getTime();
      date = addDays(date, 1)
    ) {
      const key = dayKey(date);
      const count = counts.get(key) ?? 0;
      // Only days that actually had registrations are charted.
      if (count > 0) result.push({ key, date: new Date(date), count });
    }
    return result;
  }, [period, products]);

  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const totalRegistrations = buckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );

  const labelEvery = Math.max(1, Math.ceil(buckets.length / 10));

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

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("registrations")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("registeredProductsPerDay")}
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
          <div className="flex gap-3">
            <div className="flex h-44 flex-col justify-between text-xs tabular-nums text-muted-foreground">
              <span>{maxCount}</span>
              <span>0</span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex min-w-full gap-1">
                {buckets.map((bucket, index) => {
                  const height =
                    bucket.count === 0
                      ? 0
                      : Math.max(2, (bucket.count / maxCount) * 100);
                  const showLabel =
                    buckets.length <= 14 || index % labelEvery === 0;
                  return (
                    <div
                      key={bucket.key}
                      className="min-w-[8px] flex-1"
                      title={t("dayTooltip", {
                        date: fullDateFormatter.format(bucket.date),
                        count: bucket.count,
                      })}
                    >
                      <div className="flex h-40 items-end">
                        <div
                          className="w-full rounded-t-sm bg-primary"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="mt-1 h-4 truncate text-center text-[10px] text-muted-foreground">
                        {showLabel ? dateFormatter.format(bucket.date) : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-2 text-right text-sm text-muted-foreground">
            {t("registrationsInPeriod", { count: totalRegistrations })}
          </p>
        </div>
        {buckets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("noRegistrations")}
          </p>
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
