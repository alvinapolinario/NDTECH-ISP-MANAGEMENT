"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CircleDollarSign,
  Gauge,
  Router,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DashboardShortcuts } from "@/components/dashboard/dashboard-shortcuts";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchBillingCycles } from "@/hooks/use-billing-cycles";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import type { BillingCycle } from "@/types/billing-cycle";
import type { PppoeOnlineSummary } from "@/types/mikrotik";

const routerCardThemes = [
  {
    card: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-50/40",
    badge: "bg-sky-600 text-white",
    title: "text-sky-950",
    meta: "text-sky-700/80",
  },
  {
    card: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50/40",
    badge: "bg-violet-600 text-white",
    title: "text-violet-950",
    meta: "text-violet-700/80",
  },
  {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40",
    badge: "bg-emerald-600 text-white",
    title: "text-emerald-950",
    meta: "text-emerald-700/80",
  },
  {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40",
    badge: "bg-amber-600 text-white",
    title: "text-amber-950",
    meta: "text-amber-800/80",
  },
  {
    card: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/40",
    badge: "bg-rose-600 text-white",
    title: "text-rose-950",
    meta: "text-rose-700/80",
  },
  {
    card: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40",
    badge: "bg-indigo-600 text-white",
    title: "text-indigo-950",
    meta: "text-indigo-700/80",
  },
  {
    card: "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-teal-50/40",
    badge: "bg-teal-600 text-white",
    title: "text-teal-950",
    meta: "text-teal-700/80",
  },
  {
    card: "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-50/40",
    badge: "bg-orange-600 text-white",
    title: "text-orange-950",
    meta: "text-orange-800/80",
  },
] as const;

function routerCardTheme(routerId: number) {
  return routerCardThemes[routerId % routerCardThemes.length];
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

function formatBandwidth(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;

  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;

  const kb = bytes / 1024;
  if (kb >= 1) return `${kb.toFixed(0)} KB`;

  return `${bytes.toFixed(0)} B`;
}

export function DashboardAnalytics() {
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const { data, loading, error } = useDashboardAnalytics(
    selectedCycleId ? Number(selectedCycleId) : undefined,
  );

  useEffect(() => {
    fetchBillingCycles({ page: 1, limit: 100 })
      .then((response) => setCycles(response.items))
      .catch(() => setCycles([]));
  }, []);

  useEffect(() => {
    if (!selectedCycleId && data?.billingCycle?.id) {
      setSelectedCycleId(String(data.billingCycle.id));
    }
  }, [data?.billingCycle?.id, selectedCycleId]);

  const metrics = data?.metrics;
  const onlinePppoeSummary: PppoeOnlineSummary | null =
    data?.onlinePppoeSummary ?? null;
  const topBandwidthClients = data?.topBandwidthClients ?? [];
  const collectionRate =
    metrics && Number(metrics.totalCollectable) > 0
      ? (
          (Number(metrics.collectedAmount) / Number(metrics.totalCollectable)) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Subscriber health, collections, and network connectivity.
          </p>
        </div>

        <div className="w-full md:w-72">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Billing cycle</span>
            <SearchableSelect
              value={selectedCycleId}
              onChange={setSelectedCycleId}
              emptyOptionLabel="Latest billing cycle"
              options={cycles.map((cycle) => ({
                label: cycle.name,
                value: String(cycle.id),
              }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            />
          </label>
        </div>
      </section>

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Unable to load dashboard data</p>
            <p className="mt-1 text-amber-800">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          label="Active clients"
          value={loading ? "..." : (metrics?.totalActiveClients ?? 0)}
          icon={Users}
          iconClassName="bg-emerald-100 text-emerald-600"
          valueClassName="text-emerald-600"
          href="/isp/subscriptions"
          hint="Active subscriptions"
        />
        <StatCard
          label="Clients with overdue"
          value={loading ? "..." : (metrics?.clientsWithOverdue ?? 0)}
          icon={AlertCircle}
          iconClassName="bg-amber-100 text-amber-600"
          valueClassName="text-amber-600"
          href="/billing/collections"
        />
        <StatCard
          label="Collected amount"
          value={loading ? "..." : formatMoney(metrics?.collectedAmount ?? 0)}
          icon={CircleDollarSign}
          iconClassName="bg-violet-100 text-violet-600"
          valueClassName="text-violet-600"
          href="/billing/payments"
          hint={data?.billingCycle ? `Cycle: ${data.billingCycle.name}` : "No billing cycle yet"}
        />
        <StatCard
          label="Online clients"
          value={loading ? "..." : (metrics?.onlineClients ?? 0)}
          icon={Wifi}
          iconClassName="bg-sky-100 text-sky-600"
          valueClassName="text-sky-600"
          href="/network/pppoe-sessions"
          hint="Active MikroTik PPPoE sessions"
        />
        <StatCard
          label="Offline clients"
          value={loading ? "..." : (metrics?.offlineClients ?? 0)}
          icon={WifiOff}
          iconClassName="bg-rose-100 text-rose-600"
          valueClassName="text-rose-600"
          href="/network/pppoe-accounts"
          hint="Linked PPPoE accounts not online"
        />
      </section>

      {onlinePppoeSummary?.routers.length || topBandwidthClients.length || loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <Router className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Online PPPoE by MikroTik
                </h2>
                <p className="text-xs text-slate-500">
                  Same summary as Network → PPPoE Sessions
                </p>
              </div>
            </div>
            <Link
              href="/network/pppoe-sessions"
              className="text-xs font-medium text-violet-600 hover:underline"
            >
              Open PPPoE Sessions
            </Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {onlinePppoeSummary?.routers.map((router) => {
                const theme = routerCardTheme(router.id);

                return (
                  <Link
                    key={router.id}
                    href={`/network/pppoe-sessions?routerId=${router.id}`}
                    className={`rounded-xl border px-3 py-3 transition hover:shadow-sm ${theme.card}`}
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
                  </Link>
                );
              })}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Gauge className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Top 10 heavy usage clients
                  </h3>
                  <p className="text-xs text-slate-500">
                    Active session bandwidth from RADIUS accounting
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading bandwidth data...
                </div>
              ) : topBandwidthClients.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="pb-2 pr-3 font-semibold">#</th>
                        <th className="pb-2 pr-3 font-semibold">Client</th>
                        <th className="pb-2 pr-3 font-semibold">Bandwidth</th>
                        <th className="pb-2 font-semibold">Barangay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {topBandwidthClients.map((client) => (
                        <tr key={`${client.rank}-${client.username}`}>
                          <td className="py-2.5 pr-3 text-xs font-semibold text-slate-400">
                            {client.rank}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="font-medium text-slate-900">
                              {client.customerName}
                            </div>
                            {client.customerName !== client.username ? (
                              <div className="text-xs text-slate-500">
                                {client.username}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2.5 pr-3 font-semibold text-violet-700">
                            {formatBandwidth(client.totalBytes)}
                          </td>
                          <td className="py-2.5 text-slate-600">
                            {client.barangay}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-500">
                  No active bandwidth usage data available.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <DashboardShortcuts />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Revenue chart
              </h2>
              <p className="text-sm text-slate-500">
                Collectable, collected, and uncollected by billing cycle
              </p>
            </div>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Loading revenue data...
            </div>
          ) : (
            <RevenueChart series={data?.revenueSeries ?? []} />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Finance</h2>
          <p className="mt-1 text-sm text-slate-500">
            {data?.billingCycle
              ? `${data.billingCycle.name} · ${new Date(data.billingCycle.periodStart).toLocaleDateString()} – ${new Date(data.billingCycle.periodEnd).toLocaleDateString()}`
              : "Create a billing cycle to see finance metrics"}
          </p>

          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Current cycle
              </div>
              <dl className="space-y-2 text-sm">
                {[
                  ["Total collectable", metrics?.totalCollectable],
                  ["Total collected", metrics?.collectedAmount],
                  ["Total uncollected", metrics?.totalUncollected],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-semibold text-slate-900">
                      {loading ? "..." : formatMoney(value ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-600">
                Collection rate
              </div>
              <div className="mt-2 text-3xl font-bold text-violet-600">
                {loading || !collectionRate ? "—" : `${collectionRate}%`}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
