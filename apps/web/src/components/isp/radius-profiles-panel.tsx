"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export type RadiusProfileWithSync = {
  groupname: string;
  displayName: string | null;
  rateLimit: string | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  dataCapMb: number | null;
  fupEnabled: boolean;
  fupThresholdMb: number | null;
  fupRateLimit: string | null;
  subscriberCount: number;
  attributeCount: number;
  syncStatus: "linked" | "unlinked" | "speed_mismatch";
  linkedServicePlan: {
    id: number;
    code: string;
    name: string;
    downloadMbps: number;
    uploadMbps: number;
    pppoeProfileName: string | null;
  } | null;
};

type RadiusProfilesResponse = {
  items: RadiusProfileWithSync[];
  source: "radius" | "unconfigured";
};

function formatSpeed(profile: RadiusProfileWithSync) {
  if (profile.downloadMbps != null && profile.uploadMbps != null) {
    return `${profile.downloadMbps}/${profile.uploadMbps} Mbps`;
  }

  return profile.rateLimit ?? "—";
}

function SyncBadge({ status }: { status: RadiusProfileWithSync["syncStatus"] }) {
  if (status === "linked") {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        Linked
      </span>
    );
  }

  if (status === "speed_mismatch") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
        Speed mismatch
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
      Not billable
    </span>
  );
}

export function suggestPlanCode(groupname: string) {
  const normalized = groupname
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "RADIUS-PLAN";
}

export function buildRadiusProfileSelectOptions(
  profiles: RadiusProfileWithSync[],
  currentValue?: string | null,
) {
  const options = profiles.map((profile) => {
    const speed = formatSpeed(profile);
    const label = profile.displayName
      ? `${profile.displayName} (${profile.groupname}) — ${speed}`
      : `${profile.groupname} — ${speed}`;

    return {
      label,
      value: profile.groupname,
    };
  });

  const trimmed = currentValue?.trim();
  if (trimmed && !options.some((option) => option.value === trimmed)) {
    options.unshift({
      value: trimmed,
      label: `${trimmed} (not in NDRadius)`,
    });
  }

  return options;
}

export function useRadiusProfiles(refreshKey = 0) {
  const [data, setData] = useState<RadiusProfilesResponse>({
    items: [],
    source: "unconfigured",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<RadiusProfilesResponse>(
        "/service-plans/radius-profiles",
      );
      setData(response);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load RADIUS profiles",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return {
    profiles: data.items,
    source: data.source,
    loading,
    error,
    reload: load,
  };
}

type RadiusProfilesPanelProps = {
  onCreateBillingPlan: (profile: RadiusProfileWithSync) => void;
  refreshKey?: number;
};

export function RadiusProfilesPanel({
  onCreateBillingPlan,
  refreshKey = 0,
}: RadiusProfilesPanelProps) {
  const { profiles, source, loading, error, reload } =
    useRadiusProfiles(refreshKey);

  return (
    <div className="rounded-md border border-violet-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-violet-100 bg-violet-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            NDRadius Profiles
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Live network plans from FreeRADIUS. Link each profile to a billing
            service plan so subscriptions can provision the correct group.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="shrink-0 rounded-md border border-violet-300 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {source === "unconfigured" ? (
        <div className="px-4 py-6 text-sm text-slate-600">
          RADIUS database is not configured. Set `RADIUS_DB_HOST` in
          `.env.docker` to sync profiles from NDRadius.
        </div>
      ) : null}

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Profile</th>
              <th className="px-4 py-3 font-semibold">Display Name</th>
              <th className="px-4 py-3 font-semibold">Speed</th>
              <th className="px-4 py-3 font-semibold">Subscribers</th>
              <th className="px-4 py-3 font-semibold">Data Cap</th>
              <th className="px-4 py-3 font-semibold">FUP</th>
              <th className="px-4 py-3 font-semibold">Billing</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.groupname} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {profile.groupname}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {profile.displayName ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <div>{formatSpeed(profile)}</div>
                  {profile.rateLimit ? (
                    <div className="text-xs text-slate-500">
                      {profile.rateLimit}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {profile.subscriberCount}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {profile.dataCapMb != null
                    ? `${profile.dataCapMb} MB`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {profile.fupEnabled
                    ? profile.fupRateLimit ?? "Enabled"
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <SyncBadge status={profile.syncStatus} />
                    {profile.linkedServicePlan ? (
                      <span className="text-xs text-slate-500">
                        {profile.linkedServicePlan.code}
                      </span>
                    ) : null}
                    {profile.syncStatus === "speed_mismatch" &&
                    profile.linkedServicePlan ? (
                      <span className="text-xs text-amber-700">
                        Billing: {profile.linkedServicePlan.downloadMbps}/
                        {profile.linkedServicePlan.uploadMbps} Mbps
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {profile.syncStatus === "unlinked" ? (
                    <button
                      type="button"
                      onClick={() => onCreateBillingPlan(profile)}
                      className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      Create billing plan
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {profile.syncStatus === "speed_mismatch"
                        ? "Update billing plan speeds"
                        : "Linked"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!profiles.length ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  {loading
                    ? "Loading RADIUS profiles..."
                    : source === "radius"
                      ? "No RADIUS profiles found in radgroupreply."
                      : "RADIUS is not configured."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildServicePlanSeedFromProfile(profile: RadiusProfileWithSync) {
  return {
    code: suggestPlanCode(profile.groupname),
    name: profile.displayName?.trim() || profile.groupname,
    description: profile.rateLimit
      ? `Imported from NDRadius profile ${profile.groupname} (${profile.rateLimit}).`
      : `Imported from NDRadius profile ${profile.groupname}.`,
    downloadMbps: String(profile.downloadMbps ?? ""),
    uploadMbps: String(profile.uploadMbps ?? ""),
    pppoeProfileName: profile.groupname,
    isActive: true,
  };
}
