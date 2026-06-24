"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDate, formatMoney } from "@/lib/format";
import type { ReportQuery } from "@/hooks/use-reports";
import type { ReportResponse, ReportSummaryItem } from "@/types/report";

type Column<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
};

type FilterOption = { label: string; value: string };

type ReportPageProps<T extends Record<string, unknown>> = {
  title: string;
  description: string;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  monthFilter?: boolean;
  columns: Column<T>[];
  load: (query: ReportQuery) => Promise<ReportResponse<T>>;
};

function formatSummaryValue(item: ReportSummaryItem) {
  if (item.format === "money" && typeof item.value === "string") {
    return formatMoney(item.value);
  }
  return String(item.value);
}

export function ReportPage<T extends Record<string, unknown>>({
  title,
  description,
  searchPlaceholder = "Search report",
  filterOptions,
  monthFilter = false,
  columns,
  load,
}: ReportPageProps<T>) {
  const now = new Date();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportResponse<T>>({
    summary: [],
    items: [],
    meta: { total: 0, page: 1, limit: 10, generatedAt: "" },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(
    () => ({
      search,
      filter,
      page,
      limit: 10,
      ...(monthFilter ? { month, year } : {}),
    }),
    [filter, month, monthFilter, page, search, year],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    load(query)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load report");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [load, query]);

  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Reports
        </p>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.summary.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-emerald-900/10 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase text-emerald-700">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">
              {formatSummaryValue(item)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          {filterOptions ? (
            <SearchableSelect
              value={filter}
              onChange={(nextValue) => {
                setFilter(nextValue);
                setPage(1);
              }}
              options={filterOptions}
              includeEmptyOption={false}
              placeholder={filterOptions[0]?.label ?? "All"}
              searchPlaceholder="Search filters..."
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm outline-none focus:border-emerald-500 md:min-w-48"
            />
          ) : null}
          {monthFilter ? (
            <>
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
                className="w-24 rounded-md border px-3 py-2 text-sm"
                placeholder="Month"
              />
              <input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setPage(1);
                }}
                className="w-28 rounded-md border px-3 py-2 text-sm"
                placeholder="Year"
              />
            </>
          ) : null}
        </div>

        {error ? (
          <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={String(item.id ?? index)} className="border-b border-slate-100">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      {column.render
                        ? column.render(item)
                        : String(item[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    {loading ? "Loading report..." : "No records found for this report."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {data.meta.page} of {totalPages} · {data.meta.total} records
            {data.meta.generatedAt
              ? ` · Generated ${formatDate(data.meta.generatedAt)}`
              : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-md border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-md border px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
