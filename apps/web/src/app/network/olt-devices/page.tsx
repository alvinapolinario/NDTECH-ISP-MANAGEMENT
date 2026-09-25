"use client";

import { FormEvent, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createOltDevice,
  deleteOltDevice,
  pollOltDevice,
  testOltSnmp,
  updateOltDevice,
  useOltDevices,
} from "@/hooks/use-olt-devices";
import { formatDate } from "@/lib/format";
import type {
  OltDevice,
  OltDeviceStatus,
  OltPonTechnology,
  SnmpVersion,
} from "@/types/olt-device";

type OltForm = {
  name: string;
  vendor: string;
  model: string;
  host: string;
  managementIp: string;
  ponTechnology: OltPonTechnology;
  ponPortCount: string;
  uplinkPortCount: string;
  snmpVersion: SnmpVersion;
  snmpCommunity: string;
  snmpPort: string;
  status: OltDeviceStatus;
  location: string;
  notes: string;
};

const emptyForm: OltForm = {
  name: "",
  vendor: "",
  model: "",
  host: "",
  managementIp: "",
  ponTechnology: "gpon",
  ponPortCount: "0",
  uplinkPortCount: "0",
  snmpVersion: "v2c",
  snmpCommunity: "",
  snmpPort: "161",
  status: "active",
  location: "",
  notes: "",
};

const statusOptions: Array<{ label: string; value: OltDeviceStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Maintenance", value: "maintenance" },
];

const ponOptions: Array<{ label: string; value: OltPonTechnology | "" }> = [
  { label: "All PON types", value: "" },
  { label: "GPON", value: "gpon" },
  { label: "EPON", value: "epon" },
  { label: "XG-PON", value: "xgpon" },
  { label: "XGS-PON", value: "xgspon" },
  { label: "XPON", value: "xpon" },
];

const snmpOptions: Array<{ label: string; value: SnmpVersion }> = [
  { label: "SNMP v2c", value: "v2c" },
];

function ponLabel(value: OltPonTechnology) {
  return ponOptions.find((option) => option.value === value)?.label ?? value.toUpperCase();
}

function toPayload(form: OltForm) {
  return {
    name: form.name,
    vendor: form.vendor,
    model: form.model || null,
    host: form.host,
    managementIp: form.managementIp || null,
    ponTechnology: form.ponTechnology,
    ponPortCount: Number(form.ponPortCount || 0),
    uplinkPortCount: Number(form.uplinkPortCount || 0),
    snmpVersion: form.snmpVersion,
    snmpCommunity: form.snmpCommunity || null,
    snmpPort: Number(form.snmpPort || 161),
    status: form.status,
    location: form.location || null,
    notes: form.notes || null,
  };
}

export default function OltDevicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OltDeviceStatus | "">("");
  const [ponTechnology, setPonTechnology] = useState<OltPonTechnology | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OltDevice | null>(null);
  const [form, setForm] = useState<OltForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const query = useMemo(
    () => ({ search, status, ponTechnology, page, limit: 10 }),
    [page, ponTechnology, search, status],
  );
  const { data, loading, error, reload } = useOltDevices(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
  }

  function openEdit(device: OltDevice) {
    setEditing(device);
    setForm({
      name: device.name,
      vendor: device.vendor,
      model: device.model ?? "",
      host: device.host,
      managementIp: device.managementIp ?? "",
      ponTechnology: device.ponTechnology,
      ponPortCount: String(device.ponPortCount),
      uplinkPortCount: String(device.uplinkPortCount),
      snmpVersion: device.snmpVersion,
      snmpCommunity: device.snmpCommunity ?? "",
      snmpPort: String(device.snmpPort ?? 161),
      status: device.status,
      location: device.location ?? "",
      notes: device.notes ?? "",
    });
    setLocalError("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      if (editing) {
        await updateOltDevice(editing.id, toPayload(form));
        setMessage("OLT device updated.");
      } else {
        await createOltDevice(toPayload(form));
        setMessage("OLT device created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save OLT device");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSnmp(device: OltDevice) {
    setActionLoading(device.id);
    setMessage("");
    setLocalError("");
    try {
      const result = await testOltSnmp(device.id);
      if (result.success) {
        setMessage(
          `SNMP OK (${result.latencyMs}ms) — ${result.sysName ?? result.sysDescr ?? "device responded"}`,
        );
      } else {
        setLocalError(result.error ?? "SNMP test failed");
      }
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "SNMP test failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePoll(device: OltDevice) {
    setActionLoading(device.id);
    setMessage("");
    setLocalError("");
    try {
      const result = await pollOltDevice(device.id);
      if (result.success) {
        setMessage(
          `Poll complete (${result.latencyMs}ms). Updated ${result.onuUpdated} ONU(s); ${result.onuReadings.length} reading(s) from OLT.`,
        );
      } else {
        setLocalError(result.error ?? "OLT poll failed");
      }
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "OLT poll failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(device: OltDevice) {
    if (!window.confirm(`Delete OLT device ${device.name}?`)) return;
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await deleteOltDevice(device.id);
      setMessage("OLT device deleted.");
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to delete OLT device");
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
          <h1 className="text-2xl font-semibold text-slate-950">OLT Devices</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Register VSOL and CDATA OLTs with SNMP v2c. Test connectivity and poll ONU optical levels from live devices.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add OLT Device
        </button>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && (setPage(1), reload())}
            placeholder="Search name, vendor, host, IP, or location"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <SearchableSelect
            value={status}
            onChange={(nextValue) => {
              setStatus(nextValue as OltDeviceStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <SearchableSelect
            value={ponTechnology}
            onChange={(nextValue) => {
              setPonTechnology(nextValue as OltPonTechnology | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={ponOptions}
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
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Vendor / Model</th>
                <th className="px-4 py-3">Management</th>
                <th className="px-4 py-3">PON</th>
                <th className="px-4 py-3">Ports</th>
                <th className="px-4 py-3">SNMP</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Last Polled</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((device) => (
                <tr key={device.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{device.name}</div>
                    <div className="text-xs text-slate-500">{device.notes ?? "No notes"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{device.vendor}</div>
                    <div className="text-xs text-slate-500">{device.model ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{device.host}</div>
                    <div className="text-xs text-slate-500">{device.managementIp ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">{ponLabel(device.ponTechnology)}</td>
                  <td className="px-4 py-3">
                    {device.ponPortCount} PON / {device.uplinkPortCount} uplink
                  </td>
                  <td className="px-4 py-3">
                    <div className="uppercase">{device.snmpVersion}</div>
                    <div className="text-xs text-slate-500">
                      {device.snmpCommunity ? "Community set" : "No community"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-4 py-3">{device.location ?? "-"}</td>
                  <td className="px-4 py-3">{formatDate(device.lastPolledAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestSnmp(device)}
                        disabled={actionLoading === device.id}
                        className="rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Test SNMP
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePoll(device)}
                        disabled={actionLoading === device.id}
                        className="rounded-md border border-sky-200 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                      >
                        Poll
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(device)}
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(device)}
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
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    {loading ? "Loading..." : "No OLT devices found."}
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

      <Modal
        open={formOpen}
        title={editing ? "Edit OLT Device" : "Add OLT Device"}
        description="Store the OLT identity, management endpoint, PON capacity, and SNMP details."
        onClose={() => setFormOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="olt-device-form"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {saving ? "Saving..." : "Save OLT Device"}
            </button>
          </div>
        }
      >
        <form id="olt-device-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Vendor
            <input
              required
              value={form.vendor}
              placeholder="VSOL or CDATA"
              onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Model
            <input
              value={form.model}
              onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Host
            <input
              required
              value={form.host}
              onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))}
              placeholder="192.168.1.10 or olt-core.local"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Management IP
            <input
              value={form.managementIp}
              onChange={(event) =>
                setForm((current) => ({ ...current, managementIp: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            PON Technology
            <SearchableSelect
              value={form.ponTechnology}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  ponTechnology: nextValue as OltPonTechnology,
                }))
              }
              includeEmptyOption={false}
              options={ponOptions.filter((option) => option.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            PON Ports
            <input
              type="number"
              min="0"
              value={form.ponPortCount}
              onChange={(event) =>
                setForm((current) => ({ ...current, ponPortCount: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Uplink Ports
            <input
              type="number"
              min="0"
              value={form.uplinkPortCount}
              onChange={(event) =>
                setForm((current) => ({ ...current, uplinkPortCount: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            SNMP Version
            <SearchableSelect
              value={form.snmpVersion}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  snmpVersion: nextValue as SnmpVersion,
                }))
              }
              includeEmptyOption={false}
              options={snmpOptions}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            SNMP Community
            <input
              value={form.snmpCommunity}
              onChange={(event) =>
                setForm((current) => ({ ...current, snmpCommunity: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            SNMP Port
            <input
              type="number"
              min="1"
              value={form.snmpPort}
              onChange={(event) =>
                setForm((current) => ({ ...current, snmpPort: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Status
            <SearchableSelect
              value={form.status}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, status: nextValue as OltDeviceStatus }))
              }
              includeEmptyOption={false}
              options={statusOptions.filter((option) => option.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Location
            <input
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({ ...current, location: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </form>
      </Modal>
    </section>
  );
}
