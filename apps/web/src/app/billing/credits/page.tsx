"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createBillingAdjustment,
  deleteBillingAdjustment,
  useBillingAdjustments,
  voidBillingAdjustment,
} from "@/hooks/use-billing-adjustments";
import { fetchInvoices } from "@/hooks/use-invoices";
import { useStaffByRole } from "@/hooks/use-staff";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";
import type { BillingAdjustmentStatus, BillingAdjustmentType } from "@/types/billing-adjustment";
import type { Invoice } from "@/types/invoice";

type AdjustmentForm = {
  invoiceId: string;
  adjustmentType: BillingAdjustmentType;
  amount: string;
  reason: string;
  adjustmentDate: string;
  notes: string;
  assignedFinanceUserId: string;
};

const emptyForm: AdjustmentForm = {
  invoiceId: "",
  adjustmentType: "credit",
  amount: "",
  reason: "",
  adjustmentDate: new Date().toISOString().slice(0, 10),
  notes: "",
  assignedFinanceUserId: "",
};

const statusOptions: Array<{ label: string; value: BillingAdjustmentStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Posted", value: "posted" },
  { label: "Voided", value: "voided" },
];

const typeOptions: Array<{ label: string; value: BillingAdjustmentType | "" }> = [
  { label: "All types", value: "" },
  { label: "Credit", value: "credit" },
  { label: "Charge", value: "charge" },
];

const statusStyles: Record<BillingAdjustmentStatus, string> = {
  posted: "bg-emerald-50 text-emerald-700",
  voided: "bg-slate-100 text-slate-600",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CreditsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BillingAdjustmentStatus | "">("");
  const [adjustmentType, setAdjustmentType] = useState<BillingAdjustmentType | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AdjustmentForm>(emptyForm);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const query = useMemo(
    () => ({ search, status, adjustmentType, page, limit: 10 }),
    [adjustmentType, page, search, status],
  );
  const { data, loading, error, reload } = useBillingAdjustments(query);
  const { staff: financeStaff } = useStaffByRole(STAFF_ROLE_NAMES.FINANCE);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === form.invoiceId);

  async function loadInvoices() {
    try {
      const response = await fetchInvoices({ limit: 100 });
      setInvoices(response.items.filter((invoice) => invoice.status !== "cancelled"));
    } catch {
      setInvoices([]);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadInvoices();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await createBillingAdjustment({
        invoiceId: Number(form.invoiceId),
        adjustmentType: form.adjustmentType,
        amount: Number(form.amount),
        reason: form.reason,
        adjustmentDate: form.adjustmentDate,
        notes: form.notes || null,
        assignedFinanceUserId: form.assignedFinanceUserId
          ? Number(form.assignedFinanceUserId)
          : null,
      });
      setMessage("Billing adjustment posted.");
      setFormOpen(false);
      await Promise.all([reload(), loadInvoices()]);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to post adjustment");
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
          <h1 className="text-2xl font-semibold text-slate-950">
            Credits / Adjustments
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Post credits or extra charges against invoices while preserving billing history.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Post Adjustment
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
              placeholder="Search adjustment, invoice, customer, or reason"
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

          <SearchableSelect value={status} onChange={(nextValue) => { setStatus(nextValue as BillingAdjustmentStatus | ""); setPage(1); }} includeEmptyOption={false} options={statusOptions} className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />

          <SearchableSelect value={adjustmentType} onChange={(nextValue) => { setAdjustmentType(nextValue as BillingAdjustmentType | ""); setPage(1); }} includeEmptyOption={false} options={typeOptions} className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </div>

        {message ? <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error || localError ? <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error || localError}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Adjustment</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Finance</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((adjustment) => (
                <tr key={adjustment.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{adjustment.adjustmentNumber}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{customerDisplayName(adjustment.customer)}</div>
                    <div className="text-xs text-slate-500">{adjustment.customer.accountNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{adjustment.invoice.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">Balance {formatMoney(adjustment.invoice.balance)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{titleCase(adjustment.adjustmentType)}</td>
                  <td className={`px-4 py-3 font-medium ${adjustment.adjustmentType === "credit" ? "text-emerald-700" : "text-orange-700"}`}>
                    {adjustment.adjustmentType === "credit" ? "-" : "+"}{formatMoney(adjustment.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{adjustment.reason}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {adjustment.assignedFinanceUser?.name || "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(adjustment.adjustmentDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[adjustment.status]}`}>{titleCase(adjustment.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {adjustment.status === "posted" ? (
                        <button type="button" disabled={saving} onClick={async () => { await voidBillingAdjustment(adjustment.id); setMessage(`${adjustment.adjustmentNumber} voided.`); await Promise.all([reload(), loadInvoices()]); }} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Void
                        </button>
                      ) : null}
                      <button type="button" onClick={async () => { if (!window.confirm(`Delete ${adjustment.adjustmentNumber}?`)) return; await deleteBillingAdjustment(adjustment.id); setMessage("Adjustment deleted."); await Promise.all([reload(), loadInvoices()]); }} className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">{loading ? "Loading..." : "No billing adjustments found."}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      <Modal open={formOpen} title="Post Credit / Adjustment" onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Invoice</span>
            <SearchableSelect required value={form.invoiceId} onChange={(nextValue) => setForm((current) => ({ ...current, invoiceId: nextValue }))} emptyOptionLabel="Select invoice" options={invoices.map((invoice) => ({ label: `${invoice.invoiceNumber} - ${customerDisplayName(invoice.customer)} - Balance ${formatMoney(invoice.balance)}`, value: String(invoice.id) }))} className="rounded-md border px-3 py-2" />
          </label>

          {selectedInvoice ? (
            <div className="rounded-md border border-emerald-900/10 bg-emerald-50/60 p-3 text-sm md:col-span-2">
              <div className="font-medium text-slate-900">{customerDisplayName(selectedInvoice.customer)}</div>
              <div className="text-slate-600">Subtotal {formatMoney(selectedInvoice.subtotal)} - Total {formatMoney(selectedInvoice.total)} - Balance {formatMoney(selectedInvoice.balance)}</div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Type</span>
            <SearchableSelect value={form.adjustmentType} onChange={(nextValue) => setForm((current) => ({ ...current, adjustmentType: nextValue as BillingAdjustmentType }))} includeEmptyOption={false} options={[{ label: "Credit", value: "credit" }, { label: "Charge", value: "charge" }]} className="rounded-md border px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Amount</span>
            <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="rounded-md border px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Date</span>
            <input required type="date" value={form.adjustmentDate} onChange={(event) => setForm((current) => ({ ...current, adjustmentDate: event.target.value }))} className="rounded-md border px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Reason</span>
            <input required value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Downtime credit, promo discount, correction, extra charge" className="rounded-md border px-3 py-2" />
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Finance Reviewer</span>
            <SearchableSelect
              value={form.assignedFinanceUserId}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, assignedFinanceUserId: nextValue }))
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

          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Notes</span>
            <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="rounded-md border px-3 py-2" />
          </label>

          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">Post Adjustment</button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
