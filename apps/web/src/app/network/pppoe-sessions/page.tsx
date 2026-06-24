"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  fetchMikrotikRouters,
  fetchPppoeSessions,
  refreshPppoeSessions,
} from "@/hooks/use-mikrotik";
import { customerDisplayName, formatDate } from "@/lib/format";
import type { MikrotikRouter, PppoeSession } from "@/types/mikrotik";

function formatBytes(value: string) {
  const bytes = Number(value);
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

export default function PppoeSessionsPage() {
  const [routerId, setRouterId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [routers, setRouters] = useState<MikrotikRouter[]>([]);
  const [data, setData] = useState<{ items: PppoeSession[]; meta: { total: number; page: number; limit: number } }>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const query = useMemo(
    () => ({
      routerId: routerId ? Number(routerId) : ("" as const),
      search,
      page,
      limit: 10,
    }),
    [page, routerId, search],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await fetchPppoeSessions(query));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMikrotikRouters({ limit: 100 })
      .then((response) => setRouters(response.items))
      .catch(() => setRouters([]));
  }, []);

  useEffect(() => {
    load();
  }, [query.page, query.routerId, query.search]);

  async function handleRefresh() {
    if (!routerId) {
      setError("Select a router before refreshing sessions.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const result = await refreshPppoeSessions(Number(routerId));
      setMessage(`Loaded ${result.sessions} active sessions from MikroTik /ppp/active.`);
      setPage(1);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to refresh sessions");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Network Operations
        </p>
        <h1 className="text-2xl font-semibold text-slate-950">PPPoE Sessions</h1>
        <p className="text-sm text-slate-600">
          Live view of MikroTik <code>/ppp/active</code> connections for the selected router.
        </p>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
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
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, IP, or MAC"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => { setPage(1); load(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">
            Search
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!routerId || loading}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            Refresh Sessions
          </button>
        </div>

        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Router</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Uptime</th>
                <th className="px-4 py-3">Bytes In</th>
                <th className="px-4 py-3">Bytes Out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Checked</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((session) => (
                <tr key={session.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {session.pppoeAccount?.customer
                      ? customerDisplayName(session.pppoeAccount.customer)
                      : "Unlinked"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {session.username}
                  </td>
                  <td className="px-4 py-3">{session.router.name}</td>
                  <td className="px-4 py-3">{session.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3">{session.uptime ?? "—"}</td>
                  <td className="px-4 py-3">{formatBytes(session.rxBytes)}</td>
                  <td className="px-4 py-3">{formatBytes(session.txBytes)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-4 py-3">{formatDate(session.checkedAt)}</td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    {loading
                      ? "Loading..."
                      : routerId
                        ? "No active PPPoE sessions on this router."
                        : "Select a router to browse live /ppp/active sessions."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600">
          <span>Page {data.meta.page} of {totalPages} · {data.meta.total} records</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}
