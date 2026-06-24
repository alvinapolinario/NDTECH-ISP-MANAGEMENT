"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchInvoices } from "@/hooks/use-invoices";
import {
  createPayment,
  deletePayment,
  usePayments,
  voidPayment,
} from "@/hooks/use-payments";
import { useStaffByRole } from "@/hooks/use-staff";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";
import type { Invoice } from "@/types/invoice";
import type { PaymentMethod, PaymentStatus } from "@/types/payment";

type PaymentForm = {
  invoiceId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  collectorUserId: string;
  notes: string;
};

const emptyForm: PaymentForm = {
  invoiceId: "",
  amount: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "cash",
  referenceNumber: "",
  collectorUserId: "",
  notes: "",
};

const statusOptions: Array<{ label: string; value: PaymentStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Posted", value: "posted" },
  { label: "Voided", value: "voided" },
];

const methodOptions: Array<{ label: string; value: PaymentMethod | "" }> = [
  { label: "All methods", value: "" },
  { label: "Cash", value: "cash" },
  { label: "GCash", value: "gcash" },
  { label: "Bank transfer", value: "bank_transfer" },
  { label: "Check", value: "check" },
  { label: "Card", value: "card" },
  { label: "Other", value: "other" },
];

const statusStyles: Record<PaymentStatus, string> = {
  posted: "bg-emerald-50 text-emerald-700",
  voided: "bg-slate-100 text-slate-600",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const query = useMemo(
    () => ({ search, status, paymentMethod, page, limit: 10 }),
    [page, paymentMethod, search, status],
  );
  const { data, loading, error, reload } = usePayments(query);
  const { staff: collectors } = useStaffByRole(STAFF_ROLE_NAMES.COLLECTOR);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === form.invoiceId);

  async function loadInvoices() {
    try {
      const response = await fetchInvoices({ limit: 100 });
      setInvoices(
        response.items.filter(
          (invoice) =>
            invoice.status !== "paid" &&
            invoice.status !== "cancelled" &&
            Number(invoice.balance) > 0,
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
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadInvoices();
  }

  function selectInvoice(invoiceId: string) {
    const invoice = invoices.find((item) => String(item.id) === invoiceId);
    setForm((current) => ({
      ...current,
      invoiceId,
      amount: invoice ? String(invoice.balance) : current.amount,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await createPayment({
        invoiceId: Number(form.invoiceId),
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || null,
        collectorUserId: form.collectorUserId ? Number(form.collectorUserId) : null,
        notes: form.notes || null,
      });
      setMessage("Payment posted.");
      setFormOpen(false);
      await Promise.all([reload(), loadInvoices()]);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to post payment");
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
          <h1 className="text-2xl font-semibold text-slate-950">Payments</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Post customer payments against invoices and keep invoice balances updated.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Post Payment
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
              placeholder="Search payment, invoice, customer, reference, or receiver"
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
              setStatus(nextValue as PaymentStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          <SearchableSelect
            value={paymentMethod}
            onChange={(nextValue) => {
              setPaymentMethod(nextValue as PaymentMethod | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={methodOptions}
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
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Collector</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {payment.paymentNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      {payment.referenceNumber || "No reference"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">
                      {customerDisplayName(payment.customer)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {payment.customer.accountNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{payment.invoice.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">
                      Balance {formatMoney(payment.invoice.balance)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {titleCase(payment.paymentMethod)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {payment.collector?.name || payment.receivedBy || "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[payment.status]}`}>
                      {titleCase(payment.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {payment.status === "posted" ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            await voidPayment(payment.id);
                            setMessage(`${payment.paymentNumber} voided.`);
                            await Promise.all([reload(), loadInvoices()]);
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Void
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${payment.paymentNumber}?`)) return;
                          await deletePayment(payment.id);
                          setMessage("Payment deleted.");
                          await Promise.all([reload(), loadInvoices()]);
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
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? "Loading..." : "No payments found."}
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
        title="Post Payment"
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Invoice</span>
            <SearchableSelect
              required
              value={form.invoiceId}
              onChange={(nextValue) => selectInvoice(nextValue)}
              emptyOptionLabel="Select invoice"
              options={invoices.map((invoice) => ({
                label: `${invoice.invoiceNumber} - ${customerDisplayName(invoice.customer)} - ${formatMoney(invoice.balance)}`,
                value: String(invoice.id),
              }))}
              className="rounded-md border px-3 py-2"
            />
          </label>

          {selectedInvoice ? (
            <div className="rounded-md border border-emerald-900/10 bg-emerald-50/60 p-3 text-sm md:col-span-2">
              <div className="font-medium text-slate-900">
                {customerDisplayName(selectedInvoice.customer)}
              </div>
              <div className="text-slate-600">
                Total {formatMoney(selectedInvoice.total)} - Paid {formatMoney(selectedInvoice.amountPaid)} - Balance {formatMoney(selectedInvoice.balance)}
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Amount</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Payment Date</span>
            <input
              required
              type="date"
              value={form.paymentDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, paymentDate: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Payment Method</span>
            <SearchableSelect
              value={form.paymentMethod}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  paymentMethod: nextValue as PaymentMethod,
                }))
              }
              includeEmptyOption={false}
              options={methodOptions.slice(1)}
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Reference Number</span>
            <input
              value={form.referenceNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, referenceNumber: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Collector</span>
            <SearchableSelect
              value={form.collectorUserId}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, collectorUserId: nextValue }))
              }
              emptyOptionLabel="Select collector"
              searchPlaceholder="Search collectors..."
              options={collectors.map((collector) => ({
                label: `${collector.name} · ${collector.email}`,
                value: String(collector.id),
              }))}
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
              Post Payment
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
