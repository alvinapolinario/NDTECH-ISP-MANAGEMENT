"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchCollectionByCollectorReport } from "@/hooks/use-reports";
import { useStaffByRole } from "@/hooks/use-staff";
import { formatMoney, monthBoundsLocal } from "@/lib/format";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import type { ReportSummaryItem } from "@/types/report";

type CollectorRow = {
  collectorUserId: number;
  collectorName: string;
  collectorEmail: string;
  paymentCount: number;
  totalCollected: string;
  cashTotal: string;
  gcashTotal: string;
  otherTotal: string;
  openCaseCount: number;
};

function formatSummaryValue(item: ReportSummaryItem) {
  if (item.format === "money" && typeof item.value === "string") {
    return formatMoney(item.value);
  }
  return String(item.value);
}

export default function CollectionReportsPage() {
  const bounds = monthBoundsLocal();
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [collectorUserId, setCollectorUserId] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CollectorRow[]>([]);
  const [summary, setSummary] = useState<ReportSummaryItem[]>([]);
  const [period, setPeriod] = useState(bounds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { staff: collectors } = useStaffByRole(STAFF_ROLE_NAMES.COLLECTOR);

  const query = useMemo(
    () => ({
      from,
      to,
      search,
      collectorUserId: collectorUserId ? Number(collectorUserId) : ("" as const),
      page: 1,
      limit: 500,
    }),
    [collectorUserId, from, search, to],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchCollectionByCollectorReport(query)
      .then((response) => {
        if (!active) return;
        setItems(response.items as unknown as CollectorRow[]);
        setSummary(response.summary);
        if (response.period) setPeriod(response.period);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load report",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query]);

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Reports
        </p>
        <h1 className="text-2xl font-semibold text-slate-950">
          Collection Reports
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Posted payments grouped by collector for {period.from} to {period.to}.
        </p>
      </header>

      <div className="grid gap-3 rounded-md border border-emerald-900/10 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">From</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">To</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Collector</span>
          <SearchableSelect
            value={collectorUserId}
            onChange={setCollectorUserId}
            emptyOptionLabel="All collectors"
            options={collectors.map((collector) => ({
              label: collector.name,
              value: String(collector.id),
            }))}
            className="rounded-md border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Collector name or email"
            className="rounded-md border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-emerald-900/10 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatSummaryValue(item)}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-emerald-950 text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Collector</th>
              <th className="px-4 py-3 font-semibold">Payments</th>
              <th className="px-4 py-3 font-semibold">Total Collected</th>
              <th className="px-4 py-3 font-semibold">Cash</th>
              <th className="px-4 py-3 font-semibold">GCash</th>
              <th className="px-4 py-3 font-semibold">Other</th>
              <th className="px-4 py-3 font-semibold">Open Cases (now)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.collectorUserId} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {item.collectorName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.collectorEmail}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{item.paymentCount}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {formatMoney(item.totalCollected)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatMoney(item.cashTotal)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatMoney(item.gcashTotal)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatMoney(item.otherTotal)}
                </td>
                <td className="px-4 py-3 text-slate-700">{item.openCaseCount}</td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  {loading
                    ? "Loading..."
                    : "No collector payments found for this period."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
