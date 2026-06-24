"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchCustomers } from "@/hooks/use-customers";
import { fetchOltDevices } from "@/hooks/use-olt-devices";
import {
  createOnuDevice,
  deleteOnuDevice,
  updateOnuDevice,
  useOnuDevices,
} from "@/hooks/use-onu-devices";
import { fetchSubscriptions } from "@/hooks/use-subscriptions";
import { customerDisplayName, formatDate } from "@/lib/format";
import type { CustomerSummary } from "@/types/customer";
import type { OltDevice } from "@/types/olt-device";
import type { OnuDevice, OnuDeviceStatus } from "@/types/onu-device";
import type { Subscription } from "@/types/subscription";

type OnuForm = {
  oltDeviceId: string;
  customerId: string;
  subscriptionId: string;
  name: string;
  serialNumber: string;
  macAddress: string;
  ponPort: string;
  onuId: string;
  vlan: string;
  profileName: string;
  status: OnuDeviceStatus;
  rxPower: string;
  txPower: string;
  distanceMeters: string;
  lastRegisteredAt: string;
  lastDeregisteredAt: string;
  lastDeregisteredReason: string;
  location: string;
  notes: string;
};

const emptyForm: OnuForm = {
  oltDeviceId: "",
  customerId: "",
  subscriptionId: "",
  name: "",
  serialNumber: "",
  macAddress: "",
  ponPort: "",
  onuId: "",
  vlan: "",
  profileName: "",
  status: "pending",
  rxPower: "",
  txPower: "",
  distanceMeters: "",
  lastRegisteredAt: "",
  lastDeregisteredAt: "",
  lastDeregisteredReason: "",
  location: "",
  notes: "",
};

const statusOptions: Array<{ label: string; value: OnuDeviceStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Online", value: "online" },
  { label: "Offline", value: "offline" },
  { label: "LOS", value: "los" },
  { label: "Disabled", value: "disabled" },
  { label: "Pending", value: "pending" },
];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSignal(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toFixed(2)} dBm`;
}

function toDateTimeInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function toPayload(form: OnuForm) {
  return {
    oltDeviceId: Number(form.oltDeviceId),
    customerId: form.customerId ? Number(form.customerId) : null,
    subscriptionId: form.subscriptionId ? Number(form.subscriptionId) : null,
    name: form.name || null,
    serialNumber: form.serialNumber,
    macAddress: form.macAddress || null,
    ponPort: form.ponPort,
    onuId: form.onuId,
    vlan: form.vlan ? Number(form.vlan) : null,
    profileName: form.profileName || null,
    status: form.status,
    rxPower: form.rxPower ? Number(form.rxPower) : null,
    txPower: form.txPower ? Number(form.txPower) : null,
    distanceMeters: form.distanceMeters ? Number(form.distanceMeters) : null,
    lastRegisteredAt: form.lastRegisteredAt || null,
    lastDeregisteredAt: form.lastDeregisteredAt || null,
    lastDeregisteredReason: form.lastDeregisteredReason || null,
    location: form.location || null,
    notes: form.notes || null,
  };
}

export default function OnuDevicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OnuDeviceStatus | "">("");
  const [oltDeviceId, setOltDeviceId] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OnuDevice | null>(null);
  const [form, setForm] = useState<OnuForm>(emptyForm);
  const [olts, setOlts] = useState<OltDevice[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({
      search,
      status,
      oltDeviceId: oltDeviceId ? Number(oltDeviceId) : ("" as const),
      page,
      limit: 10,
    }),
    [oltDeviceId, page, search, status],
  );
  const { data, loading, error, reload } = useOnuDevices(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const selectedCustomerSubscriptions = form.customerId
    ? subscriptions.filter((subscription) => String(subscription.customerId) === form.customerId)
    : subscriptions;

  async function loadLookups() {
    try {
      const [oltResponse, customerResponse, subscriptionResponse] = await Promise.all([
        fetchOltDevices({ limit: 100 }),
        fetchCustomers("", 100),
        fetchSubscriptions({ limit: 100 }),
      ]);
      setOlts(oltResponse.items);
      setCustomers(customerResponse.items);
      setSubscriptions(subscriptionResponse.items);
    } catch {
      setOlts([]);
      setCustomers([]);
      setSubscriptions([]);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadLookups();
  }

  function openEdit(device: OnuDevice) {
    setEditing(device);
    setForm({
      oltDeviceId: String(device.oltDeviceId),
      customerId: device.customerId ? String(device.customerId) : "",
      subscriptionId: device.subscriptionId ? String(device.subscriptionId) : "",
      name: device.name ?? "",
      serialNumber: device.serialNumber,
      macAddress: device.macAddress ?? "",
      ponPort: device.ponPort,
      onuId: device.onuId,
      vlan: device.vlan ? String(device.vlan) : "",
      profileName: device.profileName ?? "",
      status: device.status,
      rxPower: device.rxPower !== null && device.rxPower !== undefined ? String(device.rxPower) : "",
      txPower: device.txPower !== null && device.txPower !== undefined ? String(device.txPower) : "",
      distanceMeters: device.distanceMeters ? String(device.distanceMeters) : "",
      lastRegisteredAt: toDateTimeInputValue(device.lastRegisteredAt),
      lastDeregisteredAt: toDateTimeInputValue(device.lastDeregisteredAt),
      lastDeregisteredReason: device.lastDeregisteredReason ?? "",
      location: device.location ?? "",
      notes: device.notes ?? "",
    });
    setLocalError("");
    setFormOpen(true);
    loadLookups();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      if (editing) {
        await updateOnuDevice(editing.id, toPayload(form));
        setMessage("ONU device updated.");
      } else {
        await createOnuDevice(toPayload(form));
        setMessage("ONU device created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save ONU device");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(device: OnuDevice) {
    if (!window.confirm(`Delete ONU device ${device.serialNumber}?`)) return;
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await deleteOnuDevice(device.id);
      setMessage("ONU device deleted.");
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to delete ONU device");
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
          <h1 className="text-2xl font-semibold text-slate-950">ONU Devices</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Track subscriber ONUs by OLT, PON port, serial number, signal levels, and assignment.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add ONU Device
        </button>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && (setPage(1), reload())}
            placeholder="Search serial, customer, OLT, PON, profile, or location"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <SearchableSelect
            value={status}
            onChange={(nextValue) => {
              setStatus(nextValue as OnuDeviceStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <SearchableSelect
            value={oltDeviceId}
            onChange={(nextValue) => {
              setOltDeviceId(nextValue);
              setPage(1);
            }}
            includeEmptyOption={false}
            options={[
              { label: "All OLTs", value: "" },
              ...olts.map((olt) => ({
                label: olt.name,
                value: String(olt.id),
              })),
            ]}
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
          <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">ONU</th>
                <th className="px-4 py-3">OLT</th>
                <th className="px-4 py-3">PON</th>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Last Registered</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((device) => (
                <tr key={device.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {device.customer ? (
                      <>
                        <div className="font-medium text-slate-950">
                          {customerDisplayName(device.customer)}
                        </div>
                        <div className="text-xs text-slate-500">{device.customer.accountNumber}</div>
                      </>
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">
                      {device.name || device.serialNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      SN {device.serialNumber}
                      {device.macAddress ? ` / ${device.macAddress}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{device.oltDevice.name}</div>
                    <div className="text-xs text-slate-500">{device.oltDevice.host}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {device.ponPort}:{device.onuId}
                    </div>
                    <div className="text-xs text-slate-500">
                      {device.vlan ? `VLAN ${device.vlan}` : "No VLAN"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>RX {formatSignal(device.rxPower)}</div>
                    <div className="text-xs text-slate-500">
                      TX {formatSignal(device.txPower)}
                      {device.distanceMeters ? ` / ${device.distanceMeters}m` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{device.profileName ?? "-"}</div>
                    <div className="text-xs text-slate-500">
                      {device.subscription
                        ? `${device.subscription.servicePlan.code} - ${titleCase(device.subscription.status)}`
                        : "No subscription"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-4 py-3">{device.location ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div>{formatDate(device.lastRegisteredAt)}</div>
                    {device.lastDeregisteredReason ? (
                      <div className="text-xs text-slate-500">{device.lastDeregisteredReason}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
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
                    {loading ? "Loading..." : "No ONU devices found."}
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
        title={editing ? "Edit ONU Device" : "Add ONU Device"}
        description="Assign an ONU to an OLT PON port and optionally link it to a customer subscription."
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
              form="onu-device-form"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {saving ? "Saving..." : "Save ONU Device"}
            </button>
          </div>
        }
      >
        <form id="onu-device-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            OLT Device
            <SearchableSelect
              required
              value={form.oltDeviceId}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, oltDeviceId: nextValue }))
              }
              emptyOptionLabel="Select OLT"
              options={olts.map((olt) => ({
                label: `${olt.name} (${olt.host})`,
                value: String(olt.id),
              }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Customer
            <SearchableSelect
              value={form.customerId}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  customerId: nextValue,
                  subscriptionId: "",
                }))
              }
              emptyOptionLabel="Unassigned"
              options={customers.map((customer) => ({
                label: `${customerDisplayName(customer)} (${customer.accountNumber})`,
                value: String(customer.id),
              }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Subscription
            <SearchableSelect
              value={form.subscriptionId}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, subscriptionId: nextValue }))
              }
              emptyOptionLabel="No subscription"
              options={selectedCustomerSubscriptions.map((subscription) => ({
                label: `#${subscription.id} - ${subscription.servicePlan.code} (${titleCase(subscription.status)})`,
                value: String(subscription.id),
              }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Display Name
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Serial Number
            <input
              required
              value={form.serialNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, serialNumber: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            MAC Address
            <input
              value={form.macAddress}
              onChange={(event) =>
                setForm((current) => ({ ...current, macAddress: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            PON Port
            <input
              required
              value={form.ponPort}
              onChange={(event) => setForm((current) => ({ ...current, ponPort: event.target.value }))}
              placeholder="0/1, PON1, or GPON0/1"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            ONU ID
            <input
              required
              value={form.onuId}
              onChange={(event) => setForm((current) => ({ ...current, onuId: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            VLAN
            <input
              type="number"
              min="1"
              value={form.vlan}
              onChange={(event) => setForm((current) => ({ ...current, vlan: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Profile
            <input
              value={form.profileName}
              onChange={(event) =>
                setForm((current) => ({ ...current, profileName: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Status
            <SearchableSelect
              value={form.status}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, status: nextValue as OnuDeviceStatus }))
              }
              includeEmptyOption={false}
              options={statusOptions.filter((option) => option.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            RX Power
            <input
              type="number"
              step="0.01"
              value={form.rxPower}
              onChange={(event) => setForm((current) => ({ ...current, rxPower: event.target.value }))}
              placeholder="-22.50"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            TX Power
            <input
              type="number"
              step="0.01"
              value={form.txPower}
              onChange={(event) => setForm((current) => ({ ...current, txPower: event.target.value }))}
              placeholder="2.10"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Distance Meters
            <input
              type="number"
              min="0"
              value={form.distanceMeters}
              onChange={(event) =>
                setForm((current) => ({ ...current, distanceMeters: event.target.value }))
              }
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
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Last Registered
            <input
              type="datetime-local"
              value={form.lastRegisteredAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, lastRegisteredAt: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Last Deregistered
            <input
              type="datetime-local"
              value={form.lastDeregisteredAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, lastDeregisteredAt: event.target.value }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Last Deregister Reason
            <input
              value={form.lastDeregisteredReason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lastDeregisteredReason: event.target.value,
                }))
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
