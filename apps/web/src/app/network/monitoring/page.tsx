"use client";

import { FormEvent, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createNetworkMonitoringTarget,
  deleteNetworkMonitoringTarget,
  recordNetworkMonitoringCheck,
  updateNetworkMonitoringTarget,
  useNetworkMonitoringTargets,
} from "@/hooks/use-network-monitoring";
import { formatDate } from "@/lib/format";
import type {
  NetworkMonitorDeviceType,
  NetworkMonitorMethod,
  NetworkMonitorStatus,
  NetworkMonitoringTarget,
} from "@/types/network-monitoring";

type TargetForm = {
  name: string;
  deviceType: NetworkMonitorDeviceType;
  monitorMethod: NetworkMonitorMethod;
  host: string;
  snmpCommunity: string;
  status: NetworkMonitorStatus;
  latencyMs: string;
  packetLossPercent: string;
  uptimeSeconds: string;
  cpuUsagePercent: string;
  memoryUsagePercent: string;
  interfaceStatus: string;
  interfaceErrors: string;
  lastCheckedAt: string;
  location: string;
  notes: string;
};

type CheckForm = {
  status: NetworkMonitorStatus;
  latencyMs: string;
  packetLossPercent: string;
  uptimeSeconds: string;
  cpuUsagePercent: string;
  memoryUsagePercent: string;
  interfaceStatus: string;
  interfaceErrors: string;
  checkedAt: string;
  notes: string;
};

const emptyTargetForm: TargetForm = {
  name: "",
  deviceType: "other",
  monitorMethod: "icmp",
  host: "",
  snmpCommunity: "",
  status: "unknown",
  latencyMs: "",
  packetLossPercent: "",
  uptimeSeconds: "",
  cpuUsagePercent: "",
  memoryUsagePercent: "",
  interfaceStatus: "",
  interfaceErrors: "",
  lastCheckedAt: "",
  location: "",
  notes: "",
};

const emptyCheckForm: CheckForm = {
  status: "online",
  latencyMs: "",
  packetLossPercent: "",
  uptimeSeconds: "",
  cpuUsagePercent: "",
  memoryUsagePercent: "",
  interfaceStatus: "",
  interfaceErrors: "",
  checkedAt: "",
  notes: "",
};

const statusOptions: Array<{ label: string; value: NetworkMonitorStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Online", value: "online" },
  { label: "Degraded", value: "degraded" },
  { label: "Offline", value: "offline" },
  { label: "Unknown", value: "unknown" },
];

const deviceTypeOptions: Array<{ label: string; value: NetworkMonitorDeviceType | "" }> = [
  { label: "All device types", value: "" },
  { label: "MikroTik Router", value: "mikrotik_router" },
  { label: "OLT Device", value: "olt_device" },
  { label: "ONU Device", value: "onu_device" },
  { label: "Other", value: "other" },
];

const methodOptions: Array<{ label: string; value: NetworkMonitorMethod }> = [
  { label: "ICMP", value: "icmp" },
  { label: "SNMP", value: "snmp" },
  { label: "Manual", value: "manual" },
];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetric(value?: string | number | null, suffix = "") {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString()}${suffix}`;
}

function formatUptime(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const seconds = Number(value);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function toDateTimeInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function nullableNumber(value: string) {
  return value ? Number(value) : null;
}

function toTargetPayload(form: TargetForm) {
  return {
    name: form.name,
    deviceType: form.deviceType,
    monitorMethod: form.monitorMethod,
    host: form.host,
    snmpCommunity: form.snmpCommunity || null,
    status: form.status,
    latencyMs: nullableNumber(form.latencyMs),
    packetLossPercent: nullableNumber(form.packetLossPercent),
    uptimeSeconds: nullableNumber(form.uptimeSeconds),
    cpuUsagePercent: nullableNumber(form.cpuUsagePercent),
    memoryUsagePercent: nullableNumber(form.memoryUsagePercent),
    interfaceStatus: form.interfaceStatus || null,
    interfaceErrors: nullableNumber(form.interfaceErrors),
    lastCheckedAt: form.lastCheckedAt || null,
    location: form.location || null,
    notes: form.notes || null,
  };
}

function toCheckPayload(form: CheckForm) {
  return {
    status: form.status,
    latencyMs: nullableNumber(form.latencyMs),
    packetLossPercent: nullableNumber(form.packetLossPercent),
    uptimeSeconds: nullableNumber(form.uptimeSeconds),
    cpuUsagePercent: nullableNumber(form.cpuUsagePercent),
    memoryUsagePercent: nullableNumber(form.memoryUsagePercent),
    interfaceStatus: form.interfaceStatus || null,
    interfaceErrors: nullableNumber(form.interfaceErrors),
    checkedAt: form.checkedAt || null,
    notes: form.notes || null,
  };
}

export default function NetworkMonitoringPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NetworkMonitorStatus | "">("");
  const [deviceType, setDeviceType] = useState<NetworkMonitorDeviceType | "">("");
  const [page, setPage] = useState(1);
  const [targetOpen, setTargetOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [editing, setEditing] = useState<NetworkMonitoringTarget | null>(null);
  const [checking, setChecking] = useState<NetworkMonitoringTarget | null>(null);
  const [targetForm, setTargetForm] = useState<TargetForm>(emptyTargetForm);
  const [checkForm, setCheckForm] = useState<CheckForm>(emptyCheckForm);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({ search, status, deviceType, page, limit: 10 }),
    [deviceType, page, search, status],
  );
  const { data, loading, error, reload } = useNetworkMonitoringTargets(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  function openCreate() {
    setEditing(null);
    setTargetForm(emptyTargetForm);
    setLocalError("");
    setTargetOpen(true);
  }

  function openEdit(target: NetworkMonitoringTarget) {
    setEditing(target);
    setTargetForm({
      name: target.name,
      deviceType: target.deviceType,
      monitorMethod: target.monitorMethod,
      host: target.host,
      snmpCommunity: target.snmpCommunity ?? "",
      status: target.status,
      latencyMs: target.latencyMs !== null && target.latencyMs !== undefined ? String(target.latencyMs) : "",
      packetLossPercent:
        target.packetLossPercent !== null && target.packetLossPercent !== undefined
          ? String(target.packetLossPercent)
          : "",
      uptimeSeconds:
        target.uptimeSeconds !== null && target.uptimeSeconds !== undefined
          ? String(target.uptimeSeconds)
          : "",
      cpuUsagePercent:
        target.cpuUsagePercent !== null && target.cpuUsagePercent !== undefined
          ? String(target.cpuUsagePercent)
          : "",
      memoryUsagePercent:
        target.memoryUsagePercent !== null && target.memoryUsagePercent !== undefined
          ? String(target.memoryUsagePercent)
          : "",
      interfaceStatus: target.interfaceStatus ?? "",
      interfaceErrors:
        target.interfaceErrors !== null && target.interfaceErrors !== undefined
          ? String(target.interfaceErrors)
          : "",
      lastCheckedAt: toDateTimeInputValue(target.lastCheckedAt),
      location: target.location ?? "",
      notes: target.notes ?? "",
    });
    setLocalError("");
    setTargetOpen(true);
  }

  function openCheck(target: NetworkMonitoringTarget) {
    setChecking(target);
    setCheckForm({
      status: target.status === "unknown" ? "online" : target.status,
      latencyMs: target.latencyMs !== null && target.latencyMs !== undefined ? String(target.latencyMs) : "",
      packetLossPercent:
        target.packetLossPercent !== null && target.packetLossPercent !== undefined
          ? String(target.packetLossPercent)
          : "",
      uptimeSeconds:
        target.uptimeSeconds !== null && target.uptimeSeconds !== undefined
          ? String(target.uptimeSeconds)
          : "",
      cpuUsagePercent:
        target.cpuUsagePercent !== null && target.cpuUsagePercent !== undefined
          ? String(target.cpuUsagePercent)
          : "",
      memoryUsagePercent:
        target.memoryUsagePercent !== null && target.memoryUsagePercent !== undefined
          ? String(target.memoryUsagePercent)
          : "",
      interfaceStatus: target.interfaceStatus ?? "",
      interfaceErrors:
        target.interfaceErrors !== null && target.interfaceErrors !== undefined
          ? String(target.interfaceErrors)
          : "",
      checkedAt: new Date().toISOString().slice(0, 16),
      notes: "",
    });
    setLocalError("");
    setCheckOpen(true);
  }

  async function submitTarget(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      if (editing) {
        await updateNetworkMonitoringTarget(editing.id, toTargetPayload(targetForm));
        setMessage("Monitoring target updated.");
      } else {
        await createNetworkMonitoringTarget(toTargetPayload(targetForm));
        setMessage("Monitoring target created.");
      }
      setTargetOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save monitoring target");
    } finally {
      setSaving(false);
    }
  }

  async function submitCheck(event: FormEvent) {
    event.preventDefault();
    if (!checking) return;
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await recordNetworkMonitoringCheck(checking.id, toCheckPayload(checkForm));
      setMessage("Monitoring check recorded.");
      setCheckOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to record monitoring check");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(target: NetworkMonitoringTarget) {
    if (!window.confirm(`Delete monitoring target ${target.name}?`)) return;
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await deleteNetworkMonitoringTarget(target.id);
      setMessage("Monitoring target deleted.");
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to delete monitoring target");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Network Operations
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Network Monitoring</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Track device availability, latency, packet loss, uptime, resource usage, and interface health.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add Target
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Total", data.summary.total, "text-slate-950"],
          ["Online", data.summary.online, "text-emerald-700"],
          ["Degraded", data.summary.degraded, "text-amber-700"],
          ["Offline", data.summary.offline, "text-red-700"],
          ["Unknown", data.summary.unknown, "text-slate-600"],
        ].map(([label, value, className]) => (
          <div key={label} className="rounded-md border border-emerald-900/10 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className={`mt-2 text-2xl font-semibold ${className}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && (setPage(1), reload())}
            placeholder="Search target, host, interface, or location"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <SearchableSelect
            value={status}
            onChange={(nextValue) => {
              setStatus(nextValue as NetworkMonitorStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <SearchableSelect
            value={deviceType}
            onChange={(nextValue) => {
              setDeviceType(nextValue as NetworkMonitorDeviceType | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={deviceTypeOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              reload();
            }}
            className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700"
          >
            Search
          </button>
        </div>

        {message ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {(localError || error) ? (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Reachability</th>
                <th className="px-4 py-3">Resources</th>
                <th className="px-4 py-3">Interface</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Checked</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((target) => (
                <tr key={target.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{target.name}</div>
                    <div className="text-xs text-slate-500">{target.host}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{titleCase(target.deviceType)}</div>
                    <div className="text-xs text-slate-500">{target.monitorMethod.toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{formatMetric(target.latencyMs, " ms")} latency</div>
                    <div className="text-xs text-slate-500">
                      {formatMetric(target.packetLossPercent, "%")} loss / {formatUptime(target.uptimeSeconds)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>CPU {formatMetric(target.cpuUsagePercent, "%")}</div>
                    <div className="text-xs text-slate-500">
                      Memory {formatMetric(target.memoryUsagePercent, "%")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{target.interfaceStatus ?? "-"}</div>
                    <div className="text-xs text-slate-500">
                      {formatMetric(target.interfaceErrors)} errors
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={target.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div>{formatDate(target.lastCheckedAt)}</div>
                    <div className="text-xs text-slate-500">
                      {target._count?.checks ?? 0} checks
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCheck(target)}
                        className="rounded-md border border-emerald-600 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        Record Check
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(target)}
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(target)}
                        disabled={saving}
                        className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {loading ? "Loading..." : "No monitoring targets found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>
            Page {data.meta.page} of {totalPages} - {data.meta.total} records
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <TargetModal
        open={targetOpen}
        editing={editing}
        form={targetForm}
        setForm={setTargetForm}
        saving={saving}
        onClose={() => setTargetOpen(false)}
        onSubmit={submitTarget}
      />
      <CheckModal
        open={checkOpen}
        target={checking}
        form={checkForm}
        setForm={setCheckForm}
        saving={saving}
        onClose={() => setCheckOpen(false)}
        onSubmit={submitCheck}
      />
    </section>
  );
}

function TargetModal({
  open,
  editing,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: NetworkMonitoringTarget | null;
  form: TargetForm;
  setForm: React.Dispatch<React.SetStateAction<TargetForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Modal
      open={open}
      title={editing ? "Edit Monitoring Target" : "Add Monitoring Target"}
      description="Store the endpoint and latest health snapshot for a monitored network device."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
            Cancel
          </button>
          <button type="submit" form="network-monitoring-target-form" disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
            {saving ? "Saving..." : "Save Target"}
          </button>
        </div>
      }
    >
      <form id="network-monitoring-target-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <TextInput label="Name" required value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <TextInput label="Host" required value={form.host} onChange={(value) => setForm((current) => ({ ...current, host: value }))} />
        <SelectInput
          label="Device Type"
          value={form.deviceType}
          options={deviceTypeOptions.filter((option) => option.value)}
          onChange={(value) => setForm((current) => ({ ...current, deviceType: value as NetworkMonitorDeviceType }))}
        />
        <SelectInput
          label="Monitor Method"
          value={form.monitorMethod}
          options={methodOptions}
          onChange={(value) => setForm((current) => ({ ...current, monitorMethod: value as NetworkMonitorMethod }))}
        />
        <TextInput label="SNMP Community" value={form.snmpCommunity} onChange={(value) => setForm((current) => ({ ...current, snmpCommunity: value }))} />
        <SelectInput
          label="Status"
          value={form.status}
          options={statusOptions.filter((option) => option.value)}
          onChange={(value) => setForm((current) => ({ ...current, status: value as NetworkMonitorStatus }))}
        />
        <NumberInput label="Latency ms" value={form.latencyMs} onChange={(value) => setForm((current) => ({ ...current, latencyMs: value }))} />
        <NumberInput label="Packet Loss %" value={form.packetLossPercent} onChange={(value) => setForm((current) => ({ ...current, packetLossPercent: value }))} />
        <NumberInput label="Uptime Seconds" value={form.uptimeSeconds} onChange={(value) => setForm((current) => ({ ...current, uptimeSeconds: value }))} />
        <NumberInput label="CPU Usage %" value={form.cpuUsagePercent} onChange={(value) => setForm((current) => ({ ...current, cpuUsagePercent: value }))} />
        <NumberInput label="Memory Usage %" value={form.memoryUsagePercent} onChange={(value) => setForm((current) => ({ ...current, memoryUsagePercent: value }))} />
        <NumberInput label="Interface Errors" value={form.interfaceErrors} onChange={(value) => setForm((current) => ({ ...current, interfaceErrors: value }))} />
        <TextInput label="Interface Status" value={form.interfaceStatus} onChange={(value) => setForm((current) => ({ ...current, interfaceStatus: value }))} />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Last Checked
          <input
            type="datetime-local"
            value={form.lastCheckedAt}
            onChange={(event) => setForm((current) => ({ ...current, lastCheckedAt: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <TextInput label="Location" value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Notes
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </form>
    </Modal>
  );
}

function CheckModal({
  open,
  target,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  target: NetworkMonitoringTarget | null;
  form: CheckForm;
  setForm: React.Dispatch<React.SetStateAction<CheckForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Modal
      open={open}
      title="Record Monitoring Check"
      description={target ? `Update latest health snapshot for ${target.name}.` : undefined}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
            Cancel
          </button>
          <button type="submit" form="network-monitoring-check-form" disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
            {saving ? "Saving..." : "Record Check"}
          </button>
        </div>
      }
    >
      <form id="network-monitoring-check-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <SelectInput
          label="Status"
          value={form.status}
          options={statusOptions.filter((option) => option.value)}
          onChange={(value) => setForm((current) => ({ ...current, status: value as NetworkMonitorStatus }))}
        />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Checked At
          <input
            type="datetime-local"
            value={form.checkedAt}
            onChange={(event) => setForm((current) => ({ ...current, checkedAt: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <NumberInput label="Latency ms" value={form.latencyMs} onChange={(value) => setForm((current) => ({ ...current, latencyMs: value }))} />
        <NumberInput label="Packet Loss %" value={form.packetLossPercent} onChange={(value) => setForm((current) => ({ ...current, packetLossPercent: value }))} />
        <NumberInput label="Uptime Seconds" value={form.uptimeSeconds} onChange={(value) => setForm((current) => ({ ...current, uptimeSeconds: value }))} />
        <NumberInput label="CPU Usage %" value={form.cpuUsagePercent} onChange={(value) => setForm((current) => ({ ...current, cpuUsagePercent: value }))} />
        <NumberInput label="Memory Usage %" value={form.memoryUsagePercent} onChange={(value) => setForm((current) => ({ ...current, memoryUsagePercent: value }))} />
        <NumberInput label="Interface Errors" value={form.interfaceErrors} onChange={(value) => setForm((current) => ({ ...current, interfaceErrors: value }))} />
        <TextInput label="Interface Status" value={form.interfaceStatus} onChange={(value) => setForm((current) => ({ ...current, interfaceStatus: value }))} />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Notes
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </form>
    </Modal>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input type="number" step="0.01" min="0" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <SearchableSelect value={value} onChange={onChange} includeEmptyOption={false} options={options} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}
