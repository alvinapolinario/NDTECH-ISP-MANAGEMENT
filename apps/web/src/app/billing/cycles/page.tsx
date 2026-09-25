"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CircleX,
  LockKeyhole,
  Pencil,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  ActionDropdown,
  type ActionDropdownItem,
} from "@/components/ui/action-dropdown";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createBillingCycle,
  deleteBillingCycle,
  updateBillingCycle,
  useBillingCycles,
} from "@/hooks/use-billing-cycles";
import { formatDate, toDateInputValue } from "@/lib/format";
import type { BillingCycle, BillingCycleStatus } from "@/types/billing-cycle";

type CycleForm = {
  name: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: BillingCycleStatus;
  notes: string;
};

const statusOptions: Array<{ label: string; value: BillingCycleStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusStyles: Record<BillingCycleStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  open: "bg-emerald-50 text-emerald-700",
  closed: "bg-indigo-50 text-indigo-700",
  cancelled: "bg-red-50 text-red-700",
};

const emptyForm: CycleForm = {
  name: "",
  periodStart: new Date().toISOString().slice(0, 10),
  periodEnd: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  status: "draft",
  notes: "",
};

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cycleActionItems(
  cycle: BillingCycle,
  handlers: {
    openEdit: (cycle: BillingCycle) => void;
    quickStatus: (cycle: BillingCycle, status: BillingCycleStatus) => void;
    deleteCycle: (cycle: BillingCycle) => void;
  },
): ActionDropdownItem[] {
  const items: ActionDropdownItem[] = [];

  if (cycle.status === "draft") {
    items.push({
      label: "Open",
      icon: UnlockKeyhole,
      tone: "success",
      onClick: () => handlers.quickStatus(cycle, "open"),
    });
  }

  if (cycle.status === "open") {
    items.push({
      label: "Close",
      icon: LockKeyhole,
      tone: "info",
      onClick: () => handlers.quickStatus(cycle, "closed"),
    });
  }

  if (cycle.status !== "closed" && cycle.status !== "cancelled") {
    items.push({
      label: "Cancel",
      icon: CircleX,
      tone: "warning",
      onClick: () => handlers.quickStatus(cycle, "cancelled"),
    });
  }

  items.push({
    label: "Edit",
    icon: Pencil,
    tone: "default",
    onClick: () => handlers.openEdit(cycle),
  });

  items.push({
    label: "Delete",
    icon: Trash2,
    tone: "destructive",
    variant: "destructive",
    onClick: () => handlers.deleteCycle(cycle),
  });

  return items;
}

function toPayload(form: CycleForm) {
  return {
    name: form.name,
    periodStart: form.periodStart,
    periodEnd: form.periodEnd,
    dueDate: form.dueDate,
    status: form.status,
    notes: form.notes || null,
  };
}

export default function BillingCyclesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BillingCycleStatus | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BillingCycle | null>(null);
  const [form, setForm] = useState<CycleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const query = useMemo(
    () => ({ search, status, page, limit: 10 }),
    [page, search, status],
  );
  const { data, loading, error, reload } = useBillingCycles(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
  }

  function openEdit(cycle: BillingCycle) {
    setEditing(cycle);
    setForm({
      name: cycle.name,
      periodStart: toDateInputValue(cycle.periodStart),
      periodEnd: toDateInputValue(cycle.periodEnd),
      dueDate: toDateInputValue(cycle.dueDate),
      status: cycle.status,
      notes: cycle.notes ?? "",
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
        await updateBillingCycle(editing.id, toPayload(form));
        setMessage("Billing cycle updated.");
      } else {
        await createBillingCycle(toPayload(form));
        setMessage("Billing cycle created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save billing cycle");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(cycle: BillingCycle, nextStatus: BillingCycleStatus) {
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await updateBillingCycle(cycle.id, { status: nextStatus });
      setMessage(`Billing cycle marked ${titleCase(nextStatus)}.`);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to update status");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cycle: BillingCycle) {
    if (!window.confirm(`Delete ${cycle.name}?`)) return;

    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await deleteBillingCycle(cycle.id);
      setMessage("Billing cycle deleted.");
      await reload();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to delete billing cycle",
      );
    } finally {
      setSaving(false);
    }
  }

  const actionHandlers = {
    openEdit,
    quickStatus,
    deleteCycle: handleDelete,
  };

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Billing
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Billing Cycles</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Define monthly billing periods before invoice generation. Each invoice
            uses the subscriber billing day and grace period from their subscription
            profile for issue and due dates.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Create Billing Cycle
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
              placeholder="Search billing cycle name or notes"
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
              setStatus(nextValue as BillingCycleStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
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
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Cycle</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((cycle) => (
                <tr key={cycle.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {cycle.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(cycle.periodStart)} to {formatDate(cycle.periodEnd)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(cycle.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[cycle.status]}`}>
                      {titleCase(cycle.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="line-clamp-2 max-w-[260px]">
                      {cycle.notes || "No notes"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ActionDropdown
                      disabled={saving}
                      items={cycleActionItems(cycle, actionHandlers)}
                    />
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? "Loading..." : "No billing cycles found."}
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
        title={editing ? "Edit Billing Cycle" : "Create Billing Cycle"}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Cycle Name</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="June 2026 Billing"
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Period Start</span>
            <input
              type="date"
              required
              value={form.periodStart}
              onChange={(event) =>
                setForm((current) => ({ ...current, periodStart: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Period End</span>
            <input
              type="date"
              required
              value={form.periodEnd}
              onChange={(event) =>
                setForm((current) => ({ ...current, periodEnd: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Due Date</span>
            <input
              type="date"
              required
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, dueDate: event.target.value }))
              }
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
                  status: nextValue as BillingCycleStatus,
                }))
              }
              includeEmptyOption={false}
              options={statusOptions.slice(1)}
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
              {editing ? "Save Changes" : "Create Cycle"}
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
