"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchNetworkMonitoringTargets } from "@/hooks/use-network-monitoring";
import {
  acknowledgeNetworkAlert,
  createNetworkAlert,
  deleteNetworkAlert,
  resolveNetworkAlert,
  updateNetworkAlert,
  useNetworkAlerts,
} from "@/hooks/use-network-alerts";
import { formatDate } from "@/lib/format";
import type {
  NetworkAlert,
  NetworkAlertSeverity,
  NetworkAlertSource,
  NetworkAlertStatus,
} from "@/types/network-alert";
import type { NetworkMonitoringTarget } from "@/types/network-monitoring";

type AlertForm = {
  targetId: string;
  title: string;
  description: string;
  severity: NetworkAlertSeverity;
  status: NetworkAlertStatus;
  source: NetworkAlertSource;
  metric: string;
  threshold: string;
  observedValue: string;
  assignedTo: string;
  occurredAt: string;
};

type ResolveForm = {
  resolvedBy: string;
  resolution: string;
};

const emptyForm: AlertForm = {
  targetId: "",
  title: "",
  description: "",
  severity: "warning",
  status: "open",
  source: "manual",
  metric: "",
  threshold: "",
  observedValue: "",
  assignedTo: "",
  occurredAt: "",
};

const emptyResolveForm: ResolveForm = {
  resolvedBy: "Operations",
  resolution: "",
};

const statusOptions: Array<{ label: string; value: NetworkAlertStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Open", value: "open" },
  { label: "Acknowledged", value: "acknowledged" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
];

const severityOptions: Array<{ label: string; value: NetworkAlertSeverity | "" }> = [
  { label: "All severities", value: "" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Info", value: "info" },
];

const sourceOptions: Array<{ label: string; value: NetworkAlertSource }> = [
  { label: "Manual", value: "manual" },
  { label: "Monitoring", value: "monitoring" },
  { label: "System", value: "system" },
];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toDateTimeInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function toPayload(form: AlertForm) {
  return {
    targetId: form.targetId ? Number(form.targetId) : null,
    title: form.title,
    description: form.description || null,
    severity: form.severity,
    status: form.status,
    source: form.source,
    metric: form.metric || null,
    threshold: form.threshold || null,
    observedValue: form.observedValue || null,
    assignedTo: form.assignedTo || null,
    occurredAt: form.occurredAt || null,
  };
}

export default function NetworkAlertsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NetworkAlertStatus | "">("");
  const [severity, setSeverity] = useState<NetworkAlertSeverity | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [editing, setEditing] = useState<NetworkAlert | null>(null);
  const [resolving, setResolving] = useState<NetworkAlert | null>(null);
  const [form, setForm] = useState<AlertForm>(emptyForm);
  const [resolveForm, setResolveForm] = useState<ResolveForm>(emptyResolveForm);
  const [targets, setTargets] = useState<NetworkMonitoringTarget[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({ search, status, severity, page, limit: 10 }),
    [page, search, severity, status],
  );
  const { data, loading, error, reload } = useNetworkAlerts(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadTargets() {
    try {
      const response = await fetchNetworkMonitoringTargets({ limit: 200 });
      setTargets(response.items);
    } catch {
      setTargets([]);
    }
  }

  useEffect(() => {
    loadTargets();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadTargets();
  }

  function openEdit(alert: NetworkAlert) {
    setEditing(alert);
    setForm({
      targetId: alert.targetId ? String(alert.targetId) : "",
      title: alert.title,
      description: alert.description ?? "",
      severity: alert.severity,
      status: alert.status,
      source: alert.source,
      metric: alert.metric ?? "",
      threshold: alert.threshold ?? "",
      observedValue: alert.observedValue ?? "",
      assignedTo: alert.assignedTo ?? "",
      occurredAt: toDateTimeInputValue(alert.occurredAt),
    });
    setLocalError("");
    setFormOpen(true);
    loadTargets();
  }

  function openResolve(alert: NetworkAlert) {
    setResolving(alert);
    setResolveForm(emptyResolveForm);
    setLocalError("");
    setResolveOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      if (editing) {
        await updateNetworkAlert(editing.id, toPayload(form));
        setMessage("Network alert updated.");
      } else {
        await createNetworkAlert(toPayload(form));
        setMessage("Network alert created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save network alert");
    } finally {
      setSaving(false);
    }
  }

  async function handleAcknowledge(alert: NetworkAlert) {
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await acknowledgeNetworkAlert(alert.id);
      setMessage("Alert acknowledged.");
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to acknowledge alert");
    } finally {
      setSaving(false);
    }
  }

  async function submitResolve(event: FormEvent) {
    event.preventDefault();
    if (!resolving) return;
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await resolveNetworkAlert(resolving.id, resolveForm);
      setMessage("Alert resolved.");
      setResolveOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to resolve alert");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(alert: NetworkAlert) {
    if (!window.confirm(`Delete alert ${alert.title}?`)) return;
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await deleteNetworkAlert(alert.id);
      setMessage("Network alert deleted.");
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to delete network alert");
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
          <h1 className="text-2xl font-semibold text-slate-950">Network Alerts</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Track actionable network issues from monitoring checks, manual reports, and operations follow-up.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Create Alert
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Open", data.summary.open, "text-red-700"],
          ["Acknowledged", data.summary.acknowledged, "text-sky-700"],
          ["Resolved", data.summary.resolved, "text-emerald-700"],
          ["Critical Active", data.summary.severity.critical, "text-red-700"],
          ["Warning Active", data.summary.severity.warning, "text-amber-700"],
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
            placeholder="Search alert, metric, assignee, target, or host"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <SearchableSelect
            value={status}
            onChange={(nextValue) => {
              setStatus(nextValue as NetworkAlertStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <SearchableSelect
            value={severity}
            onChange={(nextValue) => {
              setSeverity(nextValue as NetworkAlertSeverity | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={severityOptions}
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
          <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Alert</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Occurred</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((alert) => (
                <tr key={alert.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{alert.title}</div>
                    <div className="text-xs text-slate-500">{alert.description ?? "No description"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{alert.target?.name ?? "Unlinked"}</div>
                    <div className="text-xs text-slate-500">{alert.target?.host ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{alert.metric ?? "-"}</div>
                    <div className="text-xs text-slate-500">
                      {alert.observedValue ?? "-"} / {alert.threshold ?? "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={alert.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div>{alert.assignedTo ?? "-"}</div>
                    <div className="text-xs text-slate-500">
                      {alert.acknowledgedBy ? `Ack: ${alert.acknowledgedBy}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{formatDate(alert.occurredAt)}</div>
                    <div className="text-xs text-slate-500">{titleCase(alert.source)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {alert.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(alert)}
                          disabled={saving}
                          className="rounded-md border border-sky-600 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                        >
                          Acknowledge
                        </button>
                      ) : null}
                      {alert.status !== "resolved" && alert.status !== "dismissed" ? (
                        <button
                          type="button"
                          onClick={() => openResolve(alert)}
                          className="rounded-md border border-emerald-600 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Resolve
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(alert)}
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(alert)}
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
                    {loading ? "Loading..." : "No network alerts found."}
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
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </div>

      <AlertFormModal
        open={formOpen}
        editing={editing}
        form={form}
        targets={targets}
        saving={saving}
        setForm={setForm}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
      />
      <ResolveModal
        open={resolveOpen}
        alert={resolving}
        form={resolveForm}
        saving={saving}
        setForm={setResolveForm}
        onClose={() => setResolveOpen(false)}
        onSubmit={submitResolve}
      />
    </section>
  );
}

function AlertFormModal({
  open,
  editing,
  form,
  targets,
  saving,
  setForm,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: NetworkAlert | null;
  form: AlertForm;
  targets: NetworkMonitoringTarget[];
  saving: boolean;
  setForm: React.Dispatch<React.SetStateAction<AlertForm>>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Modal
      open={open}
      title={editing ? "Edit Network Alert" : "Create Network Alert"}
      description="Capture the issue, affected target, severity, ownership, and threshold context."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
            Cancel
          </button>
          <button type="submit" form="network-alert-form" disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
            {saving ? "Saving..." : "Save Alert"}
          </button>
        </div>
      }
    >
      <form id="network-alert-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Title
          <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Monitoring Target
          <SearchableSelect value={form.targetId} onChange={(nextValue) => setForm((current) => ({ ...current, targetId: nextValue }))} emptyOptionLabel="Unlinked" options={targets.map((target) => ({ label: `${target.name} (${target.host})`, value: String(target.id) }))} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <SelectField label="Severity" value={form.severity} options={severityOptions.filter((option) => option.value)} onChange={(value) => setForm((current) => ({ ...current, severity: value as NetworkAlertSeverity }))} />
        <SelectField label="Status" value={form.status} options={statusOptions.filter((option) => option.value)} onChange={(value) => setForm((current) => ({ ...current, status: value as NetworkAlertStatus }))} />
        <SelectField label="Source" value={form.source} options={sourceOptions} onChange={(value) => setForm((current) => ({ ...current, source: value as NetworkAlertSource }))} />
        <TextField label="Assigned To" value={form.assignedTo} onChange={(value) => setForm((current) => ({ ...current, assignedTo: value }))} />
        <TextField label="Metric" value={form.metric} onChange={(value) => setForm((current) => ({ ...current, metric: value }))} />
        <TextField label="Observed Value" value={form.observedValue} onChange={(value) => setForm((current) => ({ ...current, observedValue: value }))} />
        <TextField label="Threshold" value={form.threshold} onChange={(value) => setForm((current) => ({ ...current, threshold: value }))} />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Occurred At
          <input type="datetime-local" value={form.occurredAt} onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </form>
    </Modal>
  );
}

function ResolveModal({
  open,
  alert,
  form,
  saving,
  setForm,
  onClose,
  onSubmit,
}: {
  open: boolean;
  alert: NetworkAlert | null;
  form: ResolveForm;
  saving: boolean;
  setForm: React.Dispatch<React.SetStateAction<ResolveForm>>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Modal
      open={open}
      title="Resolve Alert"
      description={alert ? `Close out ${alert.title}.` : undefined}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
            Cancel
          </button>
          <button type="submit" form="network-alert-resolve-form" disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
            {saving ? "Saving..." : "Resolve Alert"}
          </button>
        </div>
      }
    >
      <form id="network-alert-resolve-form" onSubmit={onSubmit} className="grid gap-4">
        <TextField label="Resolved By" value={form.resolvedBy} onChange={(value) => setForm((current) => ({ ...current, resolvedBy: value }))} />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Resolution
          <textarea value={form.resolution} onChange={(event) => setForm((current) => ({ ...current, resolution: event.target.value }))} rows={4} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </form>
    </Modal>
  );
}

function TextField({
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
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}

function SelectField({
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
