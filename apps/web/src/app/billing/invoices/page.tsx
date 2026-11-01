"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchBillingCycles } from "@/hooks/use-billing-cycles";
import {
  deleteInvoice,
  generateInvoices,
  updateInvoice,
  useInvoices,
} from "@/hooks/use-invoices";
import { useStaffByRole } from "@/hooks/use-staff";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";
import {
  createEmptyItemRow,
  defaultItemDescription,
  formRowsSubtotal,
  formRowsToPayload,
  INVOICE_ITEM_TYPE_OPTIONS,
  invoiceItemsToFormRows,
  lineItemAmount,
  summarizeInvoiceItems,
  titleCaseItemType,
  type InvoiceItemFormRow,
} from "@/lib/invoice-items";
import type { BillingCycle } from "@/types/billing-cycle";
import type { Invoice, InvoiceItemType, InvoiceStatus } from "@/types/invoice";
import { createPaymentGatewayCheckout } from "@/hooks/use-payment-gateways";

const statusOptions: Array<{ label: string; value: InvoiceStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Issued", value: "issued" },
  { label: "Partially paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

const editStatusOptions: Array<{ label: string; value: InvoiceStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Issued", value: "issued" },
  { label: "Partially paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

const statusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  issued: "bg-sky-50 text-sky-700",
  partially_paid: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [billingCycleId, setBillingCycleId] = useState("");
  const [generateCycleId, setGenerateCycleId] = useState("");
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [editStatus, setEditStatus] = useState<InvoiceStatus>("draft");
  const [editNotes, setEditNotes] = useState("");
  const [editFinanceUserId, setEditFinanceUserId] = useState("");
  const [editItems, setEditItems] = useState<InvoiceItemFormRow[]>([]);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<number | null>(null);

  const query = useMemo(
    () => ({
      search,
      status,
      billingCycleId: billingCycleId ? Number(billingCycleId) : ("" as const),
      page,
      limit: 10,
    }),
    [billingCycleId, page, search, status],
  );
  const { data, loading, error, reload } = useInvoices(query);
  const { staff: financeStaff } = useStaffByRole(STAFF_ROLE_NAMES.FINANCE);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  useEffect(() => {
    fetchBillingCycles({ limit: 100 })
      .then((response) => setCycles(response.items))
      .catch(() => setCycles([]));
  }, []);

  function openGenerate() {
    setGenerateCycleId("");
    setLocalError("");
    setGenerateOpen(true);
  }

  function closeGenerate() {
    setGenerateOpen(false);
    setGenerateCycleId("");
    setLocalError("");
  }

  function canPayOnline(invoice: Invoice) {
    return (
      Number(invoice.balance) > 0 &&
      invoice.status !== "cancelled" &&
      invoice.status !== "draft" &&
      invoice.status !== "paid"
    );
  }

  async function handlePayOnline(invoice: Invoice) {
    setCheckoutLoadingId(invoice.id);
    setLocalError("");
    try {
      const transaction = await createPaymentGatewayCheckout({
        invoiceId: invoice.id,
      });

      if (!transaction.checkoutUrl) {
        throw new Error("Gateway did not return a checkout URL.");
      }

      window.open(transaction.checkoutUrl, "_blank", "noopener,noreferrer");
      setMessage(`Checkout link created for ${invoice.invoiceNumber}.`);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to create checkout link",
      );
    } finally {
      setCheckoutLoadingId(null);
    }
  }

  function openEdit(invoice: Invoice) {
    setEditing(invoice);
    setEditStatus(invoice.status);
    setEditNotes(invoice.notes ?? "");
    setEditFinanceUserId(
      invoice.assignedFinanceUserId ? String(invoice.assignedFinanceUserId) : "",
    );
    setEditItems(invoiceItemsToFormRows(invoice));
    setLocalError("");
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditing(null);
    setEditItems([]);
    setLocalError("");
  }

  function updateEditItem(
    key: string,
    patch: Partial<InvoiceItemFormRow>,
  ) {
    setEditItems((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.itemType && patch.itemType !== row.itemType && !patch.description) {
          next.description = editing
            ? defaultItemDescription(patch.itemType, editing)
            : row.description;
        }
        return next;
      }),
    );
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();

    if (!generateCycleId) {
      setLocalError("Select a billing cycle before generating invoices.");
      return;
    }

    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      const result = await generateInvoices(Number(generateCycleId));
      setBillingCycleId(generateCycleId);
      setPage(1);
      setMessage(
        `${result.message}: created ${result.created}, skipped ${result.skipped}.`,
      );
      closeGenerate();
      await reload();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to generate invoices",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    setMessage("");
    setLocalError("");

    if (!editItems.length) {
      setLocalError("Add at least one line item.");
      setSaving(false);
      return;
    }

    const invalidItem = editItems.find(
      (row) =>
        !row.description.trim() ||
        !Number.isFinite(Number(row.quantity)) ||
        Number(row.quantity) <= 0 ||
        !Number.isFinite(Number(row.unitPrice)),
    );
    if (invalidItem) {
      setLocalError("Each line item needs a description, quantity, and unit price.");
      setSaving(false);
      return;
    }

    try {
      await updateInvoice(editing.id, {
        status: editStatus,
        notes: editNotes.trim() || null,
        assignedFinanceUserId: editFinanceUserId
          ? Number(editFinanceUserId)
          : null,
        items: formRowsToPayload(editItems, editing),
      });
      setMessage(`${editing.invoiceNumber} updated.`);
      closeEdit();
      await reload();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to update invoice",
      );
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
          <h1 className="text-2xl font-semibold text-slate-950">Invoices</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Generate invoices from active subscriptions by billing cycle. Issue and
            due dates come from each subscription billing day and grace period.
          </p>
        </div>
        <button
          type="button"
          onClick={openGenerate}
          className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Generate Invoices
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
              placeholder="Search invoice number, customer, or account number"
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
              setStatus(nextValue as InvoiceStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          <SearchableSelect
            value={billingCycleId}
            onChange={(nextValue) => {
              setBillingCycleId(nextValue);
              setPage(1);
            }}
            includeEmptyOption={false}
            options={[
              { label: "All cycles", value: "" },
              ...cycles.map((cycle) => ({
                label: cycle.name,
                value: String(cycle.id),
              })),
            ]}
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
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Cycle</th>
                <th className="px-4 py-3 font-semibold">Line Items</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {invoice.invoiceNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      Issued {formatDate(invoice.issueDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">
                      {customerDisplayName(invoice.customer)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {invoice.customer.accountNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {invoice.billingCycle.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="max-w-xs text-sm text-slate-900">
                      {summarizeInvoiceItems(invoice)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {invoice.items.length} item{invoice.items.length === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(invoice.total)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(invoice.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[invoice.status]}`}
                    >
                      {titleCase(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(invoice)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      {canPayOnline(invoice) ? (
                        <button
                          type="button"
                          disabled={checkoutLoadingId === invoice.id}
                          onClick={() => void handlePayOnline(invoice)}
                          className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {checkoutLoadingId === invoice.id ? "Creating..." : "Pay Online"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${invoice.invoiceNumber}?`))
                            return;
                          await deleteInvoice(invoice.id);
                          setMessage("Invoice deleted.");
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
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {loading ? "Loading..." : "No invoices found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>
            Page {data.meta.page} of {totalPages} · {data.meta.total} records
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
        open={generateOpen}
        title="Generate Invoices"
        description="Creates one invoice per active subscription for the selected billing cycle."
        onClose={closeGenerate}
        size="xl"
      >
        <form onSubmit={handleGenerate} className="flex flex-col gap-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Generation rules</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Only <strong>active subscriptions</strong> are included.</li>
              <li>Each subscription gets at most <strong>one invoice per billing cycle</strong>.</li>
              <li>
                Billing uses the subscription <strong>billing day</strong> inside the cycle period.
              </li>
              <li>
                Due date = issue date + subscription <strong>grace period</strong> (default 7 days).
              </li>
              <li>
                Mid-month installs are skipped for the install month; subscribers who start on the 1st bill that same month.
              </li>
            </ul>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Billing Cycle</span>
            <SearchableSelect
              value={generateCycleId}
              onChange={setGenerateCycleId}
              emptyOptionLabel="Select billing cycle"
              options={cycles.map((cycle) => ({
                label: `${cycle.name} (${formatDate(cycle.periodStart)} – ${formatDate(cycle.periodEnd)})`,
                value: String(cycle.id),
              }))}
              className="rounded-md border border-slate-200 px-3 py-2.5"
            />
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={closeGenerate}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!generateCycleId || saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {saving ? "Generating..." : "Generate Invoices"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        title={editing ? `Edit ${editing.invoiceNumber}` : "Edit Invoice"}
        description="Manage line items, status, and internal notes."
        onClose={closeEdit}
        size="xl"
      >
        {editing ? (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">
                {customerDisplayName(editing.customer)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {editing.billingCycle.name} · Due {formatDate(editing.dueDate)} ·
                Paid {formatMoney(editing.amountPaid)} · Balance{" "}
                {formatMoney(editing.balance)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Line items</h3>
                  <p className="text-xs text-slate-500">
                    Break down the invoice for transparency — service, repairs,
                    connectors, previous balance, and more.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditItems((current) => [
                      ...current,
                      createEmptyItemRow(editing, "other"),
                    ])
                  }
                  className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Add line item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Description</th>
                      <th className="px-3 py-2 font-semibold">Qty</th>
                      <th className="px-3 py-2 font-semibold">Unit price</th>
                      <th className="px-3 py-2 font-semibold">Amount</th>
                      <th className="px-3 py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((row) => (
                      <tr key={row.key} className="border-t border-slate-100">
                        <td className="px-3 py-2 align-top">
                          <SearchableSelect
                            value={row.itemType}
                            onChange={(nextValue) =>
                              updateEditItem(row.key, {
                                itemType: nextValue as InvoiceItemType,
                              })
                            }
                            includeEmptyOption={false}
                            options={INVOICE_ITEM_TYPE_OPTIONS.map((option) => ({
                              label: option.label,
                              value: option.value,
                            }))}
                            className="w-full min-w-[140px] rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={row.description}
                            onChange={(event) =>
                              updateEditItem(row.key, {
                                description: event.target.value,
                              })
                            }
                            className="w-full min-w-[180px] rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={row.quantity}
                            onChange={(event) =>
                              updateEditItem(row.key, { quantity: event.target.value })
                            }
                            className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unitPrice}
                            onChange={(event) =>
                              updateEditItem(row.key, { unitPrice: event.target.value })
                            }
                            className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2 align-top font-medium text-slate-900">
                          {formatMoney(lineItemAmount(row))}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            disabled={editItems.length <= 1}
                            onClick={() =>
                              setEditItems((current) =>
                                current.filter((item) => item.key !== row.key),
                              )
                            }
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-right font-semibold text-slate-700">
                        Invoice total
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {formatMoney(formRowsSubtotal(editItems))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {editing.items.length ? (
              <div className="rounded-md border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500">
                Current saved breakdown:{" "}
                {editing.items
                  .map(
                    (item) =>
                      `${titleCaseItemType(item.itemType)} (${formatMoney(item.amount)})`,
                  )
                  .join(" · ")}
              </div>
            ) : null}

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <SearchableSelect
                value={editStatus}
                onChange={(nextValue) =>
                  setEditStatus(nextValue as InvoiceStatus)
                }
                includeEmptyOption={false}
                options={editStatusOptions}
                className="rounded-md border border-slate-200 px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Finance Reviewer</span>
              <SearchableSelect
                value={editFinanceUserId}
                onChange={setEditFinanceUserId}
                emptyOptionLabel="Unassigned"
                searchPlaceholder="Search finance staff..."
                options={financeStaff.map((member) => ({
                  label: `${member.name} · ${member.email}`,
                  value: String(member.id),
                }))}
                className="rounded-md border border-slate-200 px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Notes</span>
              <textarea
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                rows={4}
                placeholder="Optional billing notes"
                className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
}
