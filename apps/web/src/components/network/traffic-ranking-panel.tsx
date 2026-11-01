"use client";

import { CircleHelp, Laptop, Link2, Smartphone, UserRound } from "lucide-react";
import type { TrafficRankingEntry } from "@/types/mikrotik";

function formatTrafficSize(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)}GB`;

  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)}MB`;

  const kb = bytes / 1024;
  if (kb >= 1) return `${kb.toFixed(0)}KB`;

  return `${bytes.toFixed(0)}B`;
}

function displayLabel(entry: TrafficRankingEntry) {
  if (entry.customerName?.trim()) {
    return entry.customerName.trim();
  }

  return entry.username;
}

function deviceIcon(entry: TrafficRankingEntry) {
  const label = `${entry.username} ${entry.macAddress ?? ""}`.toLowerCase();

  if (
    label.includes("iphone") ||
    label.includes("android") ||
    label.includes("mobile")
  ) {
    return Smartphone;
  }

  if (
    label.includes("laptop") ||
    label.includes("pc-") ||
    label.includes("desktop") ||
    label.includes("win-")
  ) {
    return Laptop;
  }

  if (entry.customerName) {
    return UserRound;
  }

  if (entry.macAddress) {
    return Link2;
  }

  return UserRound;
}

type TrafficRankingPanelProps = {
  entries: TrafficRankingEntry[];
  loading?: boolean;
};

export function TrafficRankingPanel({
  entries = [],
  loading = false,
}: TrafficRankingPanelProps) {
  const safeEntries = entries ?? [];

  const maxBytes = safeEntries.reduce((max, entry) => {
    const total = Number(entry.totalBytes);
    return Number.isFinite(total) ? Math.max(max, total) : max;
  }, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-base font-semibold text-slate-900">Traffic Ranking</h2>
        <span title="Active RADIUS clients ranked by total upload + download usage.">
          <CircleHelp
            className="h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
        </span>
        <span className="ml-auto text-xs text-slate-500">
          {safeEntries.length} client{safeEntries.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {safeEntries.map((entry) => {
          const Icon = deviceIcon(entry);
          const total = Number(entry.totalBytes);
          const width =
            maxBytes > 0 && Number.isFinite(total)
              ? Math.max((total / maxBytes) * 100, total > 0 ? 4 : 0)
              : 0;

          return (
            <div key={entry.username} className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">
                  {displayLabel(entry)}
                </div>
                {entry.customerName ? (
                  <div className="truncate text-xs text-slate-500">
                    {entry.username}
                  </div>
                ) : null}
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {formatTrafficSize(entry.totalBytes)}
                </div>
                <div className="text-[11px] text-slate-500">
                  ↓ {formatTrafficSize(entry.downloadBytes)} · ↑{" "}
                  {formatTrafficSize(entry.uploadBytes)}
                </div>
              </div>
            </div>
          );
        })}

        {!safeEntries.length ? (
          <div className="py-10 text-center text-sm text-slate-500">
            {loading
              ? "Loading traffic ranking..."
              : "No active RADIUS clients with usage data yet."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
