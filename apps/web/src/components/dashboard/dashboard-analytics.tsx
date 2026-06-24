"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CircleDollarSign,
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

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
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
    if (!selectedCycleId && data?.billingCycle.id) {
      setSelectedCycleId(String(data.billingCycle.id));
    }
  }, [data?.billingCycle.id, selectedCycleId]);

  const metrics = data?.metrics;
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
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
          hint={data ? `Cycle: ${data.billingCycle.name}` : undefined}
        />
        <StatCard
          label="Online clients"
          value={loading ? "..." : (metrics?.onlineClients ?? 0)}
          icon={Wifi}
          iconClassName="bg-sky-100 text-sky-600"
          valueClassName="text-sky-600"
          href="/network/pppoe-sessions"
        />
        <StatCard
          label="Offline clients"
          value={loading ? "..." : (metrics?.offlineClients ?? 0)}
          icon={WifiOff}
          iconClassName="bg-rose-100 text-rose-600"
          valueClassName="text-rose-600"
          href="/network/pppoe-accounts"
        />
      </section>

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
            {data
              ? `${data.billingCycle.name} · ${new Date(data.billingCycle.periodStart).toLocaleDateString()} – ${new Date(data.billingCycle.periodEnd).toLocaleDateString()}`
              : "Selected billing cycle"}
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
