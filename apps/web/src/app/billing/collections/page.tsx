"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createCollectionCase,
  deleteCollectionCase,
  importOverdueCollections,
  updateCollectionCase,
  useCollectionCases,
} from "@/hooks/use-collections";
import { fetchInvoices } from "@/hooks/use-invoices";
import { useStaffByRole } from "@/hooks/use-staff";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import { customerDisplayName, formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { CollectionCase, CollectionCaseStatus, CollectionPriority } from "@/types/collection";
import type { Invoice } from "@/types/invoice";

type CollectionForm = {
  invoiceId: string;
  status: CollectionCaseStatus;
  priority: CollectionPriority;
  assignedCollectorUserId: string;
  assignedFinanceUserId: string;
  lastContactedAt: string;
  nextFollowUpDate: string;
  promiseToPayDate: string;
  notes: string;
};

const emptyForm: CollectionForm = {
  invoiceId: "",
  status: "pending",
  priority: "normal",
  assignedCollectorUserId: "",
  assignedFinanceUserId: "",
  lastContactedAt: "",
  nextFollowUpDate: "",
  promiseToPayDate: "",
  notes: "",
};

const statusOptions: Array<{ label: string; value: CollectionCaseStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Contacted", value: "contacted" },
  { label: "Promised to pay", value: "promised_to_pay" },
  { label: "Escalated", value: "escalated" },
  { label: "Resolved", value: "resolved" },
  { label: "Cancelled", value: "cancelled" },
];

const priorityOptions: Array<{ label: string; value: CollectionPriority | "" }> = [
  { label: "All priorities", value: "" },
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

const statusStyles: Record<CollectionCaseStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  contacted: "bg-sky-50 text-sky-700",
  promised_to_pay: "bg-indigo-50 text-indigo-700",
  escalated: "bg-red-50 text-red-700",
  resolved: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const priorityStyles: Record<CollectionPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-emerald-50 text-emerald-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function daysOverdue(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(Math.floor((today.getTime() - due.getTime()) / 86400000), 0);
}

function toPayload(form: CollectionForm) {
  return {
    invoiceId: Number(form.invoiceId),
    status: form.status,
    priority: form.priority,
    assignedCollectorUserId: form.assignedCollectorUserId
      ? Number(form.assignedCollectorUserId)
      : null,
    assignedFinanceUserId: form.assignedFinanceUserId
      ? Number(form.assignedFinanceUserId)
      : null,
    lastContactedAt: form.lastContactedAt || null,
    nextFollowUpDate: form.nextFollowUpDate || null,
    promiseToPayDate: form.promiseToPayDate || null,
    notes: form.notes || null,
  };
}

export default function CollectionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CollectionCaseStatus | "">("");
  const [priority, setPriority] = useState<CollectionPriority | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionCase | null>(null);
  const [form, setForm] = useState<CollectionForm>(emptyForm);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const query = useMemo(
    () => ({ search, status, priority, page, limit: 10 }),
    [page, priority, search, status],
  );
  const { data, loading, error, reload } = useCollectionCases(query);
  const { staff: collectors } = useStaffByRole(STAFF_ROLE_NAMES.COLLECTOR);
  const { staff: financeStaff } = useStaffByRole(STAFF_ROLE_NAMES.FINANCE);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === form.invoiceId);

  async function loadInvoices() {
    try {
      const response = await fetchInvoices({ limit: 100 });
      setInvoices(
        response.items.filter(
          (invoice) =>
            Number(invoice.balance) > 0 &&
            invoice.status !== "paid" &&
            invoice.status !== "cancelled",
        ),
      );
    } catch {
      setInvoices([]);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadInvoices();
  }

  function openEdit(collectionCase: CollectionCase) {
    setEditing(collectionCase);
    setForm({
      invoiceId: String(collectionCase.invoiceId),
      status: collectionCase.status,
      priority: collectionCase.priority,
      assignedCollectorUserId: collectionCase.assignedCollectorUserId
        ? String(collectionCase.assignedCollectorUserId)
        : "",
      assignedFinanceUserId: collectionCase.assignedFinanceUserId
        ? String(collectionCase.assignedFinanceUserId)
        : "",
      lastContactedAt: collectionCase.lastContactedAt
        ? collectionCase.lastContactedAt.slice(0, 16)
        : "",
      nextFollowUpDate: toDateInputValue(collectionCase.nextFollowUpDate),
      promiseToPayDate: toDateInputValue(collectionCase.promiseToPayDate),
      notes: collectionCase.notes ?? "",
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
        const { invoiceId: _invoiceId, ...payload } = toPayload(form);
        await updateCollectionCase(editing.id, payload);
        setMessage("Collection case updated.");
      } else {
        await createCollectionCase(toPayload(form));
        setMessage("Collection case created.");
      }
      setFormOpen(false);
      await Promise.all([reload(), loadInvoices()]);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save collection case");
    } finally {
      setSaving(false);
    }
  }

  async function handleImportOverdue() {
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      const result = await importOverdueCollections();
      setMessage(
        `${result.message}: scanned ${result.scanned}, created ${result.created}, restored ${result.restored}, skipped ${result.skipped}.`,
      );
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to import overdue invoices");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(collectionCase: CollectionCase, nextStatus: CollectionCaseStatus) {
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await updateCollectionCase(collectionCase.id, {
        status: nextStatus,
        lastContactedAt:
          nextStatus === "contacted" || nextStatus === "promised_to_pay"
            ? new Date().toISOString()
            : undefined,
      });
      setMessage(`${collectionCase.invoice.invoiceNumber} marked ${titleCase(nextStatus)}.`);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to update collection case");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Billing
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Collections</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Track unpaid invoice follow-ups, promises to pay, and escalation work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImportOverdue}
            disabled={saving}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Import Overdue
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create Case
          </button>
        </div>
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
              placeholder="Search invoice, customer, collector, or notes"
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
              setStatus(nextValue as CollectionCaseStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          <SearchableSelect
            value={priority}
            onChange={(nextValue) => {
              setPriority(nextValue as CollectionPriority | "");
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
          <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Aging</th>
                <th className="px-4 py-3 font-semibold">Collector</th>
                <th className="px-4 py-3 font-semibold">Finance</th>
                <th className="px-4 py-3 font-semibold">Follow-up</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((collectionCase) => (
                <tr key={collectionCase.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">
                      {customerDisplayName(collectionCase.customer)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {collectionCase.customer.accountNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{collectionCase.invoice.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">
                      Due {formatDate(collectionCase.invoice.dueDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatMoney(collectionCase.invoice.balance)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {daysOverdue(collectionCase.invoice.dueDate)} days
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {collectionCase.assignedCollectorUser?.name ||
                      collectionCase.assignedCollector ||
                      "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {collectionCase.assignedFinanceUser?.name || "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>Next {formatDate(collectionCase.nextFollowUpDate)}</div>
                    <div className="text-xs text-slate-500">
                      Promise {formatDate(collectionCase.promiseToPayDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityStyles[collectionCase.priority]}`}>
                      {titleCase(collectionCase.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[collectionCase.status]}`}>
                      {titleCase(collectionCase.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {collectionCase.status === "pending" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => quickStatus(collectionCase, "contacted")}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Contacted
                        </button>
                      ) : null}
                      {collectionCase.status !== "resolved" && collectionCase.status !== "cancelled" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => quickStatus(collectionCase, "resolved")}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Resolve
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(collectionCase)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete collection case for ${collectionCase.invoice.invoiceNumber}?`)) return;
                          await deleteCollectionCase(collectionCase.id);
                          setMessage("Collection case deleted.");
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
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? "Loading..." : "No collection cases found."}
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
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "Edit Collection Case" : "Create Collection Case"}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Invoice</span>
            <SearchableSelect
              required
              disabled={Boolean(editing)}
              value={form.invoiceId}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, invoiceId: nextValue }))
              }
              emptyOptionLabel="Select invoice"
              options={[
                ...invoices.map((invoice) => ({
                  label: `${invoice.invoiceNumber} - ${customerDisplayName(invoice.customer)} - ${formatMoney(invoice.balance)}`,
                  value: String(invoice.id),
                })),
                ...(editing
                  ? [{
                      label: `${editing.invoice.invoiceNumber} - ${customerDisplayName(editing.customer)} - ${formatMoney(editing.invoice.balance)}`,
                      value: String(editing.invoiceId),
                    }]
                  : []),
              ]}
              className="rounded-md border px-3 py-2 disabled:bg-slate-100"
            />
          </label>

          {selectedInvoice ? (
            <div className="rounded-md border border-emerald-900/10 bg-emerald-50/60 p-3 text-sm md:col-span-2">
              <div className="font-medium text-slate-900">
                {customerDisplayName(selectedInvoice.customer)}
              </div>
              <div className="text-slate-600">
                Due {formatDate(selectedInvoice.dueDate)} - Balance {formatMoney(selectedInvoice.balance)}
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Status</span>
            <SearchableSelect
              value={form.status}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  status: nextValue as CollectionCaseStatus,
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
                  priority: nextValue as CollectionPriority,
                }))
              }
              includeEmptyOption={false}
              options={priorityOptions.slice(1)}
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Assigned Collector</span>
            <SearchableSelect
              value={form.assignedCollectorUserId}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  assignedCollectorUserId: nextValue,
                }))
              }
              emptyOptionLabel="Unassigned"
              searchPlaceholder="Search collectors..."
              options={collectors.map((collector) => ({
                label: `${collector.name} · ${collector.email}`,
                value: String(collector.id),
              }))}
              className="rounded-md border px-3 py-2"
            />
          </label>

          {form.status === "escalated" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Finance Reviewer</span>
              <SearchableSelect
                value={form.assignedFinanceUserId}
                onChange={(nextValue) =>
                  setForm((current) => ({
                    ...current,
                    assignedFinanceUserId: nextValue,
                  }))
                }
                emptyOptionLabel="Unassigned"
                searchPlaceholder="Search finance staff..."
                options={financeStaff.map((member) => ({
                  label: `${member.name} · ${member.email}`,
                  value: String(member.id),
                }))}
                className="rounded-md border px-3 py-2"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Last Contacted</span>
            <input
              type="datetime-local"
              value={form.lastContactedAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, lastContactedAt: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Next Follow-up</span>
            <input
              type="date"
              value={form.nextFollowUpDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Promise to Pay</span>
            <input
              type="date"
              value={form.promiseToPayDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, promiseToPayDate: event.target.value }))
              }
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
              {editing ? "Save Changes" : "Create Case"}
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
