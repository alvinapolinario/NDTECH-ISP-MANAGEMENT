"use client";

import { FormEvent, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createSwitchDevice,
  deleteSwitchDevice,
  pollSwitchDevice,
  testSwitchSnmp,
  updateSwitchDevice,
  useSwitchDevices,
} from "@/hooks/use-switch-devices";
import { formatDate } from "@/lib/format";
import type {
  SwitchDevice,
  SwitchDeviceStatus,
  SwitchVendor,
} from "@/types/switch-device";

type SwitchForm = {
  name: string;
  vendor: SwitchVendor;
  model: string;
  host: string;
  managementIp: string;
  snmpCommunity: string;
  snmpPort: string;
  status: SwitchDeviceStatus;
  location: string;
  notes: string;
};

const emptyForm: SwitchForm = {
  name: "",
  vendor: "mikrotik",
  model: "",
  host: "",
  managementIp: "",
  snmpCommunity: "",
  snmpPort: "161",
  status: "active",
  location: "",
  notes: "",
};

const statusOptions: Array<{ label: string; value: SwitchDeviceStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Maintenance", value: "maintenance" },
];

const vendorOptions: Array<{ label: string; value: SwitchVendor | "" }> = [
  { label: "All vendors", value: "" },
  { label: "MikroTik", value: "mikrotik" },
  { label: "UniFi", value: "unifi" },
  { label: "EdgeSwitch", value: "edgeswitch" },
];

const vendorFormOptions = vendorOptions.filter((option) => option.value) as Array<{
  label: string;
  value: SwitchVendor;
}>;

function vendorLabel(value: SwitchVendor) {
  return vendorFormOptions.find((option) => option.value === value)?.label ?? value;
}

function toPayload(form: SwitchForm) {
  return {
    name: form.name,
    vendor: form.vendor,
    model: form.model || null,
    host: form.host,
    managementIp: form.managementIp || null,
    snmpVersion: "v2c" as const,
    snmpCommunity: form.snmpCommunity || null,
    snmpPort: Number(form.snmpPort || 161),
    status: form.status,
    location: form.location || null,
    notes: form.notes || null,
  };
}

export default function SwitchDevicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SwitchDeviceStatus | "">("");
  const [vendor, setVendor] = useState<SwitchVendor | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SwitchDevice | null>(null);
  const [form, setForm] = useState<SwitchForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const query = useMemo(
    () => ({ search, status, vendor, page, limit: 10 }),
    [page, search, status, vendor],
  );
  const { data, loading, error, reload } = useSwitchDevices(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
  }

  function openEdit(device: SwitchDevice) {
    setEditing(device);
    setForm({
      name: device.name,
      vendor: device.vendor,
      model: device.model ?? "",
      host: device.host,
      managementIp: device.managementIp ?? "",
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
        await updateSwitchDevice(editing.id, toPayload(form));
        setMessage("Switch updated.");
      } else {
        await createSwitchDevice(toPayload(form));
        setMessage("Switch created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save switch");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSnmp(device: SwitchDevice) {
    setActionLoading(device.id);
    setMessage("");
    setLocalError("");
    try {
      const result = await testSwitchSnmp(device.id);
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

  async function handlePoll(device: SwitchDevice) {
    setActionLoading(device.id);
    setMessage("");
    setLocalError("");
    try {
      const result = await pollSwitchDevice(device.id);
      if (result.success) {
        const iface = result.interfaces;
        setMessage(
          `Poll complete (${result.latencyMs}ms). Ports ${iface?.up ?? 0}/${iface?.total ?? 0} up.`,
        );
      } else {
        setLocalError(result.error ?? "Switch poll failed");
      }
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Switch poll failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(device: SwitchDevice) {
    if (!window.confirm(`Delete switch ${device.name}?`)) return;
    setSaving(true);
    try {
      await deleteSwitchDevice(device.id);
      setMessage("Switch deleted.");
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to delete switch");
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
          <h1 className="text-2xl font-semibold text-slate-950">Switches</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Manage MikroTik, UniFi, and EdgeSwitch devices with SNMP v2c polling on real hardware.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add Switch
        </button>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && (setPage(1), reload())}
            placeholder="Search name, host, IP, or location"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <SearchableSelect
            value={status}
            onChange={(nextValue) => {
              setStatus(nextValue as SwitchDeviceStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <SearchableSelect
            value={vendor}
            onChange={(nextValue) => {
              setVendor(nextValue as SwitchVendor | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={vendorOptions}
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
        {localError || error ? (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Management</th>
                <th className="px-4 py-3">Ports</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Polled</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((device) => (
                <tr key={device.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{device.name}</div>
                    <div className="text-xs text-slate-500">{device.model ?? "No model"}</div>
                  </td>
                  <td className="px-4 py-3">{vendorLabel(device.vendor)}</td>
                  <td className="px-4 py-3">
                    <div>{device.host}</div>
                    <div className="text-xs text-slate-500">{device.managementIp ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {device.portsUp}/{device.portCount} up
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-600">
                      CPU {device.cpuUsagePercent ?? "-"}% / MEM {device.memoryUsagePercent ?? "-"}%
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={device.status} />
                  </td>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {loading ? "Loading..." : "No switches found."}
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
        title={editing ? "Edit Switch" : "Add Switch"}
        description="SNMP v2c only. Enable SNMP on the device and allow access from this server."
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
              form="switch-device-form"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {saving ? "Saving..." : "Save Switch"}
            </button>
          </div>
        }
      >
        <form id="switch-device-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2">
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
            <SearchableSelect
              value={form.vendor}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, vendor: nextValue as SwitchVendor }))
              }
              includeEmptyOption={false}
              options={vendorFormOptions}
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
            Host / IP
            <input
              required
              value={form.host}
              onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))}
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
            SNMP Community
            <input
              required
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
                setForm((current) => ({ ...current, status: nextValue as SwitchDeviceStatus }))
              }
              includeEmptyOption={false}
              options={statusOptions.filter((option) => option.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
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
