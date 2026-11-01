"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw, Wifi } from "lucide-react";
import {
  fetchOnuTr069Status,
  fetchTr069Config,
  fetchTr069LookupBySerial,
  rebootOnuTr069,
  refreshOnuTr069,
  setOnuPppoeTr069,
  setOnuWifiPasswordTr069,
  setOnuWifiSsidTr069,
  type OnuTr069Status,
  type Tr069Config,
} from "@/hooks/use-tr069";

type OnuTr069PanelProps = {
  onuDeviceId?: number;
  serialNumber?: string | null;
};

export function OnuTr069Panel({ onuDeviceId, serialNumber }: OnuTr069PanelProps) {
  const [config, setConfig] = useState<Tr069Config | null>(null);
  const [status, setStatus] = useState<OnuTr069Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ssid, setSsid] = useState("");
  const [ssid5g, setSsid5g] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [pppoeUsername, setPppoeUsername] = useState("");
  const [pppoePassword, setPppoePassword] = useState("");

  const trimmedSerial = serialNumber?.trim() ?? "";
  const canManage = Boolean(onuDeviceId);

  const applyParameterDefaults = useCallback((tr069Status: OnuTr069Status) => {
    const params = tr069Status.device?.parameters;
    if (params?.ssid24 && typeof params.ssid24 === "string") {
      setSsid(params.ssid24);
    }
    if (params?.ssid5 && typeof params.ssid5 === "string") {
      setSsid5g(params.ssid5);
    }
    if (params?.pppoeUsername && typeof params.pppoeUsername === "string") {
      setPppoeUsername(params.pppoeUsername);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const tr069Config = await fetchTr069Config();
      setConfig(tr069Config);

      if (onuDeviceId) {
        const tr069Status = await fetchOnuTr069Status(onuDeviceId);
        setStatus(tr069Status);
        applyParameterDefaults(tr069Status);
        return;
      }

      if (trimmedSerial) {
        const tr069Status = await fetchTr069LookupBySerial(trimmedSerial);
        setStatus({ ...tr069Status, onuDeviceId: undefined });
        applyParameterDefaults(tr069Status);
        return;
      }

      setStatus(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load TR-069 status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [applyParameterDefaults, onuDeviceId, trimmedSerial]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, trimmedSerial && !onuDeviceId ? 400 : 0);

    return () => window.clearTimeout(timer);
  }, [load, onuDeviceId, trimmedSerial]);

  async function runAction(label: string, action: () => Promise<unknown>) {
    if (!onuDeviceId) {
      return;
    }

    setBusy(label);
    setError("");
    setMessage("");

    try {
      await action();
      setMessage(`${label} queued successfully.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${label} failed`);
    } finally {
      setBusy("");
    }
  }

  async function handleSsidSubmit(event: FormEvent) {
    event.preventDefault();
    if (!onuDeviceId) return;
    await runAction("SSID update", () =>
      setOnuWifiSsidTr069(onuDeviceId, { ssid, ssid5g: ssid5g || undefined }),
    );
  }

  async function handleWifiPasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (!onuDeviceId) return;
    await runAction("WiFi password update", () =>
      setOnuWifiPasswordTr069(onuDeviceId, { password: wifiPassword }),
    );
  }

  async function handlePppoeSubmit(event: FormEvent) {
    event.preventDefault();
    if (!onuDeviceId) return;
    await runAction("PPPoE update", () =>
      setOnuPppoeTr069(onuDeviceId, {
        username: pppoeUsername,
        password: pppoePassword,
      }),
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading TR-069 status...
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        TR-069 is disabled. Deploy GenieACS and set GENIEACS_ENABLED=true in the API
        environment.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Radio className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">TR-069 Remote Management</h3>
            <p className="text-xs text-slate-500">
              GenieACS · Serial {trimmedSerial || status?.serialNumber || "—"}
            </p>
            {config.cwmpUrl ? (
              <p className="mt-1 text-xs text-violet-700">ACS URL: {config.cwmpUrl}</p>
            ) : null}
          </div>
        </div>

        {canManage ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => runAction("Refresh", () => refreshOnuTr069(onuDeviceId!))}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => runAction("Reboot", () => rebootOnuTr069(onuDeviceId!))}
              disabled={Boolean(busy)}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              Reboot ONU
            </button>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          {trimmedSerial
            ? "GenieACS status is shown from the serial number. Save the ONU device first to apply WiFi, PPPoE, or reboot actions."
            : "Enter a serial number above to check GenieACS registration, or save the ONU to enable remote actions."}
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {message}
        </div>
      ) : null}

      {trimmedSerial || canManage ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="GenieACS linked" value={status?.linked ? "Yes" : "No"} />
          <Stat label="Manufacturer" value={status?.device?.manufacturer ?? "—"} />
          <Stat label="Model" value={status?.device?.productClass ?? "—"} />
          <Stat
            label="Last inform"
            value={
              status?.device?.lastInform
                ? new Date(status.device.lastInform).toLocaleString()
                : "—"
            }
          />
        </div>
      ) : null}

      {trimmedSerial && status && !status.linked ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ONU not registered in GenieACS yet. Set ACS URL on the ONU to{" "}
          <span className="font-semibold">{config.cwmpUrl ?? "your ACS server"}</span> and wait
          for the next Inform session.
        </div>
      ) : null}

      <div className={`grid gap-4 xl:grid-cols-3 ${canManage ? "" : "opacity-60"}`}>
        <form onSubmit={handleSsidSubmit} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
            <Wifi className="h-4 w-4 text-violet-600" />
            Change SSID
          </div>
          <label className="mb-2 block text-xs text-slate-600">
            2.4GHz SSID
            <input
              value={ssid}
              onChange={(event) => setSsid(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required={canManage}
              disabled={!canManage}
            />
          </label>
          <label className="mb-3 block text-xs text-slate-600">
            5GHz SSID
            <input
              value={ssid5g}
              onChange={(event) => setSsid5g(event.target.value)}
              placeholder={`${ssid || "NDTECH-WiFi"}-5G`}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManage}
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(busy) || !canManage}
            className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy === "SSID update" ? "Applying..." : "Apply SSID"}
          </button>
        </form>

        <form
          onSubmit={handleWifiPasswordSubmit}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="mb-2 text-sm font-medium text-slate-900">Change WiFi Password</div>
          <label className="mb-3 block text-xs text-slate-600">
            New password (min 8 chars)
            <input
              type="password"
              value={wifiPassword}
              onChange={(event) => setWifiPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              minLength={8}
              required={canManage}
              disabled={!canManage}
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(busy) || !canManage}
            className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy === "WiFi password update" ? "Applying..." : "Apply WiFi Password"}
          </button>
        </form>

        <form onSubmit={handlePppoeSubmit} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-sm font-medium text-slate-900">Change PPPoE on ONU</div>
          <label className="mb-2 block text-xs text-slate-600">
            Username
            <input
              value={pppoeUsername}
              onChange={(event) => setPppoeUsername(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required={canManage}
              disabled={!canManage}
            />
          </label>
          <label className="mb-3 block text-xs text-slate-600">
            Password
            <input
              type="password"
              value={pppoePassword}
              onChange={(event) => setPppoePassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required={canManage}
              disabled={!canManage}
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(busy) || !canManage}
            className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy === "PPPoE update" ? "Applying..." : "Apply PPPoE"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
