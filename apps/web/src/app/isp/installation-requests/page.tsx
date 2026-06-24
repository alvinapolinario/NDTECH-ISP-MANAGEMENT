"use client";

import { FormEvent, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCustomers } from "@/hooks/use-customers";
import {
  createInstallationRequest,
  deleteInstallationRequest,
  updateInstallationRequest,
  useInstallationRequests,
} from "@/hooks/use-installation-requests";
import { useServicePlans } from "@/hooks/use-service-plans";
import { useStaffByRole } from "@/hooks/use-staff";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import { customerDisplayName, formatDate, toDateInputValue } from "@/lib/format";
import type {
  InstallationRequest,
  InstallationRequestPriority,
  InstallationRequestStatus,
} from "@/types/installation-request";

type RequestForm = {
  customerId: string;
  servicePlanId: string;
  status: InstallationRequestStatus;
  priority: InstallationRequestPriority;
  requestedDate: string;
  scheduledDate: string;
  assignedInstallerUserId: string;
  contactNumber: string;
  installationAddress: string;
  mapLocation: string;
  notes: string;
};

const statusOptions: Array<{ label: string; value: InstallationRequestStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const priorityOptions: Array<{ label: string; value: InstallationRequestPriority | "" }> = [
  { label: "All priorities", value: "" },
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

const emptyForm: RequestForm = {
  customerId: "",
  servicePlanId: "",
  status: "pending",
  priority: "normal",
  requestedDate: new Date().toISOString().slice(0, 10),
  scheduledDate: "",
  assignedInstallerUserId: "",
  contactNumber: "",
  installationAddress: "",
  mapLocation: "",
  notes: "",
};

const statusStyles: Record<InstallationRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  scheduled: "bg-sky-50 text-sky-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const priorityStyles: Record<InstallationRequestPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-emerald-50 text-emerald-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toPayload(form: RequestForm) {
  return {
    customerId: Number(form.customerId),
    servicePlanId: form.servicePlanId ? Number(form.servicePlanId) : null,
    status: form.status,
    priority: form.priority,
    requestedDate: form.requestedDate,
    scheduledDate: form.scheduledDate || null,
    assignedInstallerUserId: form.assignedInstallerUserId
      ? Number(form.assignedInstallerUserId)
      : null,
    contactNumber: form.contactNumber || null,
    installationAddress: form.installationAddress,
    mapLocation: form.mapLocation || null,
    notes: form.notes || null,
  };
}

export default function InstallationRequestsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InstallationRequestStatus | "">("");
  const [priority, setPriority] = useState<InstallationRequestPriority | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstallationRequest | null>(null);
  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const query = useMemo(
    () => ({ search, status, priority, page, limit: 10 }),
    [page, priority, search, status],
  );
  const { data, loading, error, reload } = useInstallationRequests(query);
  const { customers } = useCustomers();
  const { plans } = useServicePlans();
  const { staff: installers } = useStaffByRole(STAFF_ROLE_NAMES.INSTALLER);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setLocalError("");
  }

  function openEdit(request: InstallationRequest) {
    setEditing(request);
    setForm({
      customerId: String(request.customerId),
      servicePlanId: request.servicePlanId ? String(request.servicePlanId) : "",
      status: request.status,
      priority: request.priority,
      requestedDate: toDateInputValue(request.requestedDate),
      scheduledDate: request.scheduledDate ? request.scheduledDate.slice(0, 16) : "",
      assignedInstallerUserId: request.assignedInstallerUserId
        ? String(request.assignedInstallerUserId)
        : "",
      contactNumber: request.contactNumber ?? "",
      installationAddress: request.installationAddress,
      mapLocation: request.mapLocation ?? "",
      notes: request.notes ?? "",
    });
    setFormOpen(true);
    setLocalError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      if (editing) {
        await updateInstallationRequest(editing.id, toPayload(form));
        setMessage("Installation request updated.");
      } else {
        await createInstallationRequest(toPayload(form));
        setMessage("Installation request created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to save installation request",
      );
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(
    request: InstallationRequest,
    nextStatus: InstallationRequestStatus,
  ) {
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await updateInstallationRequest(request.id, { status: nextStatus });
      setMessage(`Installation request marked ${titleCase(nextStatus)}.`);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            ISP Services
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Installation Requests
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Track new installation work from request intake through scheduling,
            field assignment, and completion.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Create Request
        </button>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setPage(1);
              }}
              placeholder="Search customer, installer, contact, address, or map location"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setPage(1)}
              className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Search
            </button>
          </div>

          <SearchableSelect
            value={status}
            onChange={(nextValue) => {
              setStatus(nextValue as InstallationRequestStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          <SearchableSelect
            value={priority}
            onChange={(nextValue) => {
              setPriority(nextValue as InstallationRequestPriority | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={priorityOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        {message ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error || localError ? (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || localError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 font-semibold">Installer</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((request) => (
                <tr key={request.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">
                      {customerDisplayName(request.customer)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {request.customer.accountNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {request.servicePlan?.name ?? "Not selected"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>Requested {formatDate(request.requestedDate)}</div>
                    <div className="text-xs text-slate-500">
                      Scheduled {formatDate(request.scheduledDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>
                      {request.assignedInstaller?.name ||
                        request.assignedInstallerName ||
                        "Unassigned"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {request.contactNumber || request.customer.mobileNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="line-clamp-2 max-w-[260px]">
                      {request.installationAddress}
                    </div>
                    <div className="text-xs text-slate-500">
                      {request.mapLocation || "No map location"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityStyles[request.priority]}`}>
                      {titleCase(request.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[request.status]}`}>
                      {titleCase(request.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {request.status === "pending" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => quickStatus(request, "scheduled")}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Schedule
                        </button>
                      ) : null}
                      {request.status === "scheduled" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => quickStatus(request, "in_progress")}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Start
                        </button>
                      ) : null}
                      {request.status === "in_progress" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => quickStatus(request, "completed")}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Complete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(request)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("Delete this installation request?")) return;
                          await deleteInstallationRequest(request.id);
                          setMessage("Installation request deleted.");
                          await reload();
                        }}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? "Loading..." : "No installation requests found."}
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
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "Edit Installation Request" : "Create Installation Request"}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Customer</span>
            <SearchableSelect
              required
              value={form.customerId}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, customerId: nextValue }))
              }
              emptyOptionLabel="Select customer"
              options={customers.map((customer) => ({
                label: customerDisplayName(customer),
                value: String(customer.id),
              }))}
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Requested Plan</span>
            <SearchableSelect
              value={form.servicePlanId}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, servicePlanId: nextValue }))
              }
              emptyOptionLabel="No plan selected"
              options={plans.map((plan) => ({
                label: plan.name,
                value: String(plan.id),
              }))}
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Status</span>
            <SearchableSelect
              value={form.status}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  status: nextValue as InstallationRequestStatus,
                }))
              }
              includeEmptyOption={false}
              options={statusOptions.slice(1)}
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Priority</span>
            <SearchableSelect
              value={form.priority}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  priority: nextValue as InstallationRequestPriority,
                }))
              }
              includeEmptyOption={false}
              options={priorityOptions.slice(1)}
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Requested Date</span>
            <input
              type="date"
              required
              value={form.requestedDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, requestedDate: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Scheduled Date</span>
            <input
              type="datetime-local"
              value={form.scheduledDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, scheduledDate: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Assigned Installer</span>
            <SearchableSelect
              value={form.assignedInstallerUserId}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  assignedInstallerUserId: nextValue,
                }))
              }
              emptyOptionLabel="Unassigned"
              searchPlaceholder="Search installers..."
              options={installers.map((installer) => ({
                label: `${installer.name} · ${installer.email}`,
                value: String(installer.id),
              }))}
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Contact Number</span>
            <input
              value={form.contactNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, contactNumber: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Installation Address</span>
            <textarea
              required
              rows={3}
              value={form.installationAddress}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  installationAddress: event.target.value,
                }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Map Location</span>
            <input
              value={form.mapLocation}
              onChange={(event) =>
                setForm((current) => ({ ...current, mapLocation: event.target.value }))
              }
              placeholder="14.599512,120.984222"
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {editing ? "Save Changes" : "Create Request"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
