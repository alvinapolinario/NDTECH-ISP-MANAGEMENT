import type { DashboardRevenuePoint } from "@/hooks/use-dashboard-analytics";

type RevenueChartProps = {
  series: DashboardRevenuePoint[];
};

function formatMoneyShort(value: string) {
  const amount = Number(value);
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
}

function formatMoney(value: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function RevenueChart({ series }: RevenueChartProps) {
  if (!series.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
        No billing cycle revenue data yet.
      </div>
    );
  }

  const maxValue = Math.max(
    ...series.flatMap((point) => [
      Number(point.collectable),
      Number(point.collected),
      Number(point.uncollected),
    ]),
    1,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-violet-500" />
          Total Collectable
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          Total Collected
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-orange-500" />
          Total Uncollected
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {series.map((point) => (
          <div
            key={point.billingCycleId}
            className="rounded-lg border border-slate-100 bg-slate-50/80 p-4"
          >
            <div className="mb-3 text-sm font-semibold text-slate-900">
              {point.label}
            </div>

            <div className="flex h-40 items-end gap-2">
              {[
                {
                  key: "collectable",
                  label: "Collectable",
                  value: point.collectable,
                  color: "bg-violet-500",
                },
                {
                  key: "collected",
                  label: "Collected",
                  value: point.collected,
                  color: "bg-emerald-500",
                },
                {
                  key: "uncollected",
                  label: "Uncollected",
                  value: point.uncollected,
                  color: "bg-orange-500",
                },
              ].map((bar) => {
                const height = Math.max(
                  (Number(bar.value) / maxValue) * 100,
                  Number(bar.value) > 0 ? 8 : 0,
                );

                return (
                  <div
                    key={bar.key}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-32 w-full items-end justify-center">
                      <div
                        className={`w-full max-w-12 rounded-t-md ${bar.color}`}
                        style={{ height: `${height}%` }}
                        title={`${bar.label}: ${formatMoney(bar.value)}`}
                      />
                    </div>
                    <div className="text-center text-[11px] font-medium text-slate-600">
                      {formatMoneyShort(bar.value)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
              <div>
                <div className="font-medium text-slate-700">Collectable</div>
                <div>{formatMoney(point.collectable)}</div>
              </div>
              <div>
                <div className="font-medium text-slate-700">Collected</div>
                <div>{formatMoney(point.collected)}</div>
              </div>
              <div>
                <div className="font-medium text-slate-700">Uncollected</div>
                <div>{formatMoney(point.uncollected)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
