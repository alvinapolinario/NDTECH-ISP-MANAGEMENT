"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Router } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TrafficRankingPanel } from "@/components/network/traffic-ranking-panel";
import {
  fetchMikrotikRouters,
  fetchPppoeSessionMonitoring,
  fetchPppoeSessionSummary,
  refreshPppoeSessions,
} from "@/hooks/use-mikrotik";
import { formatDate } from "@/lib/format";
import type {
  MikrotikRouter,
  PppoeOnlineSummary,
  PppoeSessionMonitoring,
  SessionSource,
  UnifiedActiveSession,
} from "@/types/mikrotik";

const PAGE_SIZE = 20;

const routerCardThemes = [
  {
    card: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 hover:border-sky-300 hover:shadow-sm",
    selected: "border-sky-500 ring-2 ring-sky-200 shadow-md",
    badge: "bg-sky-600 text-white",
    title: "text-sky-950",
    meta: "text-sky-700/80",
    subtle: "text-sky-600/70",
  },
  {
    card: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50/40 hover:border-violet-300 hover:shadow-sm",
    selected: "border-violet-500 ring-2 ring-violet-200 shadow-md",
    badge: "bg-violet-600 text-white",
    title: "text-violet-950",
    meta: "text-violet-700/80",
    subtle: "text-violet-600/70",
  },
  {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 hover:border-emerald-300 hover:shadow-sm",
    selected: "border-emerald-500 ring-2 ring-emerald-200 shadow-md",
    badge: "bg-emerald-600 text-white",
    title: "text-emerald-950",
    meta: "text-emerald-700/80",
    subtle: "text-emerald-600/70",
  },
  {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 hover:border-amber-300 hover:shadow-sm",
    selected: "border-amber-500 ring-2 ring-amber-200 shadow-md",
    badge: "bg-amber-600 text-white",
    title: "text-amber-950",
    meta: "text-amber-800/80",
    subtle: "text-amber-700/70",
  },
  {
    card: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 hover:border-rose-300 hover:shadow-sm",
    selected: "border-rose-500 ring-2 ring-rose-200 shadow-md",
    badge: "bg-rose-600 text-white",
    title: "text-rose-950",
    meta: "text-rose-700/80",
    subtle: "text-rose-600/70",
  },
  {
    card: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 hover:border-indigo-300 hover:shadow-sm",
    selected: "border-indigo-500 ring-2 ring-indigo-200 shadow-md",
    badge: "bg-indigo-600 text-white",
    title: "text-indigo-950",
    meta: "text-indigo-700/80",
    subtle: "text-indigo-600/70",
  },
  {
    card: "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-teal-50/40 hover:border-teal-300 hover:shadow-sm",
    selected: "border-teal-500 ring-2 ring-teal-200 shadow-md",
    badge: "bg-teal-600 text-white",
    title: "text-teal-950",
    meta: "text-teal-700/80",
    subtle: "text-teal-600/70",
  },
  {
    card: "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-50/40 hover:border-orange-300 hover:shadow-sm",
    selected: "border-orange-500 ring-2 ring-orange-200 shadow-md",
    badge: "bg-orange-600 text-white",
    title: "text-orange-950",
    meta: "text-orange-800/80",
    subtle: "text-orange-700/70",
  },
] as const;

function routerCardTheme(routerId: number) {
  return routerCardThemes[routerId % routerCardThemes.length];
}

function formatBytes(value: string | null | undefined) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function SourceBadge({ source }: { source: SessionSource }) {
  const styles: Record<SessionSource, string> = {
    both: "bg-emerald-100 text-emerald-800",
    mikrotik: "bg-sky-100 text-sky-800",
    radius: "bg-violet-100 text-violet-800",
  };
  const labels: Record<SessionSource, string> = {
    both: "Both",
    mikrotik: "MikroTik",
    radius: "RADIUS",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[source]}`}
    >
      {labels[source]}
    </span>
  );
}

function SourceBadges({ sources }: { sources: SessionSource[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((source) => (
        <SourceBadge key={source} source={source} />
      ))}
    </div>
  );
}

function matchesSearch(session: UnifiedActiveSession, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return [
    session.username,
    session.customerName,
    session.ipAddress,
    session.macAddress,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(needle));
}

function PppoeSessionsPage() {
  const searchParams = useSearchParams();
  const [routerId, setRouterId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [routers, setRouters] = useState<MikrotikRouter[]>([]);
  const [onlineSummary, setOnlineSummary] = useState<PppoeOnlineSummary | null>(
    null,
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [monitoring, setMonitoring] = useState<PppoeSessionMonitoring | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rankingEntries = useMemo(() => {
    if (!monitoring) return [];

    const trafficRanking =
      monitoring.trafficRanking ??
      (
        monitoring as PppoeSessionMonitoring & {
          topBandwidthUsers?: PppoeSessionMonitoring["trafficRanking"];
        }
      ).topBandwidthUsers ??
      [];

    return trafficRanking;
  }, [monitoring]);

  const filteredRanking = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rankingEntries;

    return rankingEntries.filter((entry) =>
      [
        entry.username,
        entry.customerName,
        entry.ipAddress,
        entry.macAddress,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [rankingEntries, search]);

  const filteredSessions = useMemo(() => {
    if (!monitoring) return [];
    return monitoring.sessions.filter((session) => matchesSearch(session, search));
  }, [monitoring, search]);

  const totalPages = Math.max(
    Math.ceil(filteredSessions.length / PAGE_SIZE),
    1,
  );

  const pageSessions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, page]);

  async function loadOnlineSummary() {
    setSummaryLoading(true);

    try {
      setOnlineSummary(await fetchPppoeSessionSummary());
    } catch {
      setOnlineSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadMonitoring(selectedRouterId = routerId) {
    if (!selectedRouterId) {
      setMonitoring(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      setMonitoring(await fetchPppoeSessionMonitoring(Number(selectedRouterId)));
    } catch (caught) {
      setMonitoring(null);
      setError(
        caught instanceof Error ? caught.message : "Unable to load sessions",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMikrotikRouters({ limit: 100 })
      .then((response) => setRouters(response.items))
      .catch(() => setRouters([]));
    void loadOnlineSummary();
  }, []);

  useEffect(() => {
    const requestedRouterId = searchParams.get("routerId");
    if (requestedRouterId) {
      setRouterId(requestedRouterId);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
    void loadMonitoring();
  }, [routerId]);

  async function handleRefresh() {
    if (!routerId) {
      setError("Select a router before refreshing sessions.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await refreshPppoeSessions(Number(routerId));
      const updated = await fetchPppoeSessionMonitoring(Number(routerId));
      setMonitoring(updated);
      setMessage(
        `MikroTik /ppp/active: ${result.sessions} sessions. RADIUS radacct: ${updated.summary.radiusActive} active.`,
      );
      setPage(1);
      await loadOnlineSummary();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to refresh sessions",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Network Operations
        </p>
        <h1 className="text-2xl font-semibold text-slate-950">PPPoE Sessions</h1>
        <p className="text-sm text-slate-600">
          Combined monitoring from MikroTik <code>/ppp/active</code> and RADIUS{" "}
          <code>radacct</code>. Refresh to update MikroTik snapshot; RADIUS data
          is read live from the accounting database.
        </p>
      </header>

      <section className="rounded-md border border-emerald-900/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Online PPPoE Summary
            </h2>
            <p className="text-xs text-slate-500">
              MikroTik /ppp/active counts from the latest refresh on each router.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadOnlineSummary()}
            disabled={summaryLoading}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {summaryLoading ? "Refreshing..." : "Refresh Summary"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr]">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <Activity className="h-4 w-4" />
              Total Online
            </div>
            <div className="mt-2 text-3xl font-semibold text-emerald-950">
              {summaryLoading ? "…" : (onlineSummary?.totalOnline ?? 0)}
            </div>
            {onlineSummary?.generatedAt ? (
              <div className="mt-1 text-xs text-emerald-700">
                Updated {formatDate(onlineSummary.generatedAt)}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <Router className="h-4 w-4" />
              MikroTik Routers With Active Sessions
            </div>

            {summaryLoading ? (
              <p className="text-sm text-slate-500">Loading summary...</p>
            ) : onlineSummary?.routers.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {onlineSummary.routers.map((router) => {
                  const theme = routerCardTheme(router.id);
                  const selected = routerId === String(router.id);

                  return (
                    <button
                      key={router.id}
                      type="button"
                      onClick={() => {
                        setRouterId(String(router.id));
                        setPage(1);
                      }}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        selected ? theme.selected : theme.card
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`truncate text-sm font-semibold ${theme.title}`}>
                            {router.name}
                          </div>
                          <div className={`truncate text-xs ${theme.meta}`}>
                            {router.host}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${theme.badge}`}
                        >
                          {router.onlineCount}
                        </span>
                      </div>
                      {router.lastRefreshedAt ? (
                        <div className={`mt-2 text-[11px] ${theme.subtle}`}>
                          Refreshed {formatDate(router.lastRefreshedAt)}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No routers currently have cached online sessions. Select a router
                and click Refresh Sessions to populate this summary.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchableSelect
              value={routerId}
              onChange={(nextValue) => {
                setRouterId(nextValue);
                setPage(1);
              }}
              emptyOptionLabel="Select a router"
              options={routers.map((router) => ({
                label: `${router.name} (${router.host})`,
                value: String(router.id),
              }))}
              className="w-full rounded-md border px-3 py-2 text-sm sm:max-w-md"
            />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={!routerId || loading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300 sm:ml-auto sm:shrink-0"
            >
              Refresh Sessions
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search username, customer, IP, or MAC"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPage(1)}
              className="rounded-md border border-emerald-600 px-4 py-2 text-sm text-emerald-700 sm:shrink-0"
            >
              Filter
            </button>
          </div>
        </div>

        {message ? (
          <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {monitoring ? (
          <>
            <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["MikroTik active", monitoring.summary.mikrotikActive],
                ["RADIUS active", monitoring.summary.radiusActive],
                ["Matched", monitoring.summary.matched],
                ["MikroTik only", monitoring.summary.mikrotikOnly],
                ["RADIUS only", monitoring.summary.radiusOnly],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {label}
                  </div>
                  <div className="text-xl font-semibold text-slate-900">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {!monitoring.radiusConfigured ? (
              <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-900">
                RADIUS database is not configured. Only MikroTik /ppp/active data
                will appear.
              </div>
            ) : null}

            <div className="border-b p-4">
              <TrafficRankingPanel
                entries={filteredRanking}
                loading={loading}
              />
            </div>
          </>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Uptime</th>
                <th className="px-4 py-3">RADIUS ↓</th>
                <th className="px-4 py-3">RADIUS ↑</th>
                <th className="px-4 py-3">MikroTik In</th>
                <th className="px-4 py-3">MikroTik Out</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {pageSessions.map((session) => (
                <tr
                  key={`${session.username}-${session.ipAddress ?? "no-ip"}`}
                  className="border-b border-slate-100"
                >
                  <td className="px-4 py-3">
                    {session.customerName ?? "Unlinked"}
                  </td>
                  <td className="px-4 py-3 font-medium">{session.username}</td>
                  <td className="px-4 py-3">{session.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3">{session.uptime ?? "—"}</td>
                  <td className="px-4 py-3">
                    {formatBytes(session.radiusDownloadBytes)}
                  </td>
                  <td className="px-4 py-3">
                    {formatBytes(session.radiusUploadBytes)}
                  </td>
                  <td className="px-4 py-3">
                    {formatBytes(session.mikrotikRxBytes)}
                  </td>
                  <td className="px-4 py-3">
                    {formatBytes(session.mikrotikTxBytes)}
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadges sources={session.sources} />
                  </td>
                  <td className="px-4 py-3">
                    {session.acctUpdateTime
                      ? formatDate(session.acctUpdateTime)
                      : session.checkedAt
                        ? formatDate(session.checkedAt)
                        : "—"}
                  </td>
                </tr>
              ))}
              {!pageSessions.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    {loading
                      ? "Loading..."
                      : routerId
                        ? "No active sessions match the current filter."
                        : "Select a router, then refresh to load MikroTik and RADIUS sessions."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} · {filteredSessions.length} records
            {monitoring ? ` · Updated ${formatDate(monitoring.generatedAt)}` : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-md border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
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

export default function PppoeSessionsRoute() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-slate-600">Loading PPPoE sessions...</p>
      }
    >
      <PppoeSessionsPage />
    </Suspense>
  );
}
