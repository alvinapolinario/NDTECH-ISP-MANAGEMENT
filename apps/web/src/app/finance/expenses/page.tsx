"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createExpense,
  deleteExpense,
  fetchExpenseCategories,
  updateExpense,
  useExpenses,
  voidExpense,
} from "@/hooks/use-expenses";
import { fetchSuppliers } from "@/hooks/use-procurement";
import { useStaffByRole } from "@/hooks/use-staff";
import { formatDate, formatMoney } from "@/lib/format";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import type { Expense, ExpenseCategory, ExpenseStatus } from "@/types/expense";
import type { PaymentMethod } from "@/types/payment";
import type { Supplier } from "@/types/procurement";

type ExpenseForm = {
  expenseCategoryId: string;
  supplierId: string;
  expenseDate: string;
  amount: string;
  payee: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  description: string;
  notes: string;
  assignedFinanceUserId: string;
};

const emptyForm: ExpenseForm = {
  expenseCategoryId: "",
  supplierId: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  amount: "",
  payee: "",
  paymentMethod: "cash",
  referenceNumber: "",
  description: "",
  notes: "",
  assignedFinanceUserId: "",
};

const statusOptions: Array<{ label: string; value: ExpenseStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Recorded", value: "recorded" },
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

const formMethodOptions = methodOptions.slice(1);

const statusStyles: Record<ExpenseStatus, string> = {
  recorded: "bg-emerald-50 text-emerald-700",
  voided: "bg-slate-100 text-slate-600",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ExpenseStatus | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const query = useMemo(
    () => ({
      search,
      status,
      paymentMethod,
      expenseCategoryId: expenseCategoryId ? Number(expenseCategoryId) : ("" as const),
      page,
      limit: 10,
    }),
    [expenseCategoryId, page, paymentMethod, search, status],
  );
  const { data, loading, error, reload } = useExpenses(query);
  const { staff: financeStaff } = useStaffByRole(STAFF_ROLE_NAMES.FINANCE);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    try {
      const [categoryResponse, supplierResponse] = await Promise.all([
        fetchExpenseCategories({ filter: "active", limit: 200 }),
        fetchSuppliers({ filter: "active", limit: 200 }),
      ]);
      setCategories(categoryResponse.items);
      setSuppliers(supplierResponse.items);
    } catch {
      setCategories([]);
      setSuppliers([]);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadLookups();
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({
      expenseCategoryId: String(expense.expenseCategoryId),
      supplierId: expense.supplierId ? String(expense.supplierId) : "",
      expenseDate: expense.expenseDate.slice(0, 10),
      amount: String(expense.amount),
      payee: expense.payee,
      paymentMethod: expense.paymentMethod,
      referenceNumber: expense.referenceNumber ?? "",
      description: expense.description,
      notes: expense.notes ?? "",
      assignedFinanceUserId: expense.assignedFinanceUserId
        ? String(expense.assignedFinanceUserId)
        : "",
    });
    setLocalError("");
    setEditOpen(true);
    loadLookups();
  }

  function closeModals() {
    setFormOpen(false);
    setEditOpen(false);
    setEditing(null);
    setLocalError("");
  }

  function selectSupplier(supplierId: string) {
    const supplier = suppliers.find((item) => String(item.id) === supplierId);
    setForm((current) => ({
      ...current,
      supplierId,
      payee: supplier?.name || current.payee,
    }));
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await createExpense({
        expenseCategoryId: Number(form.expenseCategoryId),
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        expenseDate: form.expenseDate,
        amount: Number(form.amount),
        payee: form.payee.trim(),
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber.trim() || null,
        description: form.description.trim(),
        notes: form.notes.trim() || null,
        assignedFinanceUserId: form.assignedFinanceUserId
          ? Number(form.assignedFinanceUserId)
          : null,
      });
      setMessage("Expense recorded.");
      closeModals();
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to record expense");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      await updateExpense(editing.id, {
        expenseCategoryId: Number(form.expenseCategoryId),
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        expenseDate: form.expenseDate,
        amount: Number(form.amount),
        payee: form.payee.trim(),
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber.trim() || null,
        description: form.description.trim(),
        notes: form.notes.trim() || null,
        assignedFinanceUserId: form.assignedFinanceUserId
          ? Number(form.assignedFinanceUserId)
          : null,
      });
      setMessage(`${editing.expenseNumber} updated.`);
      closeModals();
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to update expense");
    } finally {
      setSaving(false);
    }
  }

  const categoryFilterOptions = [
    { label: "All categories", value: "" },
    ...categories.map((category) => ({
      label: category.name,
      value: String(category.id),
    })),
  ];

  const categoryFormOptions = categories.map((category) => ({
    label: category.name,
    value: String(category.id),
  }));

  const supplierFormOptions = [
    { label: "No supplier", value: "" },
    ...suppliers.map((supplier) => ({
      label: `${supplier.code} - ${supplier.name}`,
      value: String(supplier.id),
    })),
  ];

  const financeOptions = [
    { label: "Unassigned", value: "" },
    ...financeStaff.map((user) => ({
      label: user.name,
      value: String(user.id),
    })),
  ];

  function renderForm(onSubmit: (event: FormEvent) => void, submitLabel: string) {
    return (
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Category</span>
          <SearchableSelect
            value={form.expenseCategoryId}
            onChange={(value) =>
              setForm((current) => ({ ...current, expenseCategoryId: value }))
            }
            includeEmptyOption
            emptyOptionLabel="Select category"
            options={categoryFormOptions}
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Supplier (optional)</span>
          <SearchableSelect
            value={form.supplierId}
            onChange={selectSupplier}
            includeEmptyOption={false}
            options={supplierFormOptions}
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Expense Date</span>
          <input
            type="date"
            required
            value={form.expenseDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, expenseDate: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({ ...current, amount: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium">Payee</span>
          <input
            required
            value={form.payee}
            onChange={(event) =>
              setForm((current) => ({ ...current, payee: event.target.value }))
            }
            placeholder="Who received the payment"
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Payment Method</span>
          <SearchableSelect
            value={form.paymentMethod}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                paymentMethod: value as PaymentMethod,
              }))
            }
            includeEmptyOption={false}
            options={formMethodOptions}
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Reference No.</span>
          <input
            value={form.referenceNumber}
            onChange={(event) =>
              setForm((current) => ({ ...current, referenceNumber: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium">Description</span>
          <textarea
            required
            rows={2}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium">Notes</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium">Finance Reviewer</span>
          <SearchableSelect
            value={form.assignedFinanceUserId}
            onChange={(value) =>
              setForm((current) => ({ ...current, assignedFinanceUserId: value }))
            }
            includeEmptyOption={false}
            options={financeOptions}
            className="rounded-md border px-3 py-2"
          />
        </label>

        <div className="flex gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={saving || !form.expenseCategoryId}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {submitLabel}
          </button>
          <button type="button" onClick={closeModals} className="rounded-md border px-4 py-2 text-sm">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Finance
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Expenses</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Record operational spending such as fuel, rent, utilities, salaries, and supplies.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Record Expense
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
              placeholder="Search expense, payee, description, or reference"
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
            onChange={(value) => {
              setStatus(value as ExpenseStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          <SearchableSelect
            value={paymentMethod}
            onChange={(value) => {
              setPaymentMethod(value as PaymentMethod | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={methodOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          <SearchableSelect
            value={expenseCategoryId}
            onChange={(value) => {
              setExpenseCategoryId(value);
              setPage(1);
            }}
            includeEmptyOption={false}
            options={categoryFilterOptions}
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
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Expense</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Payee</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Finance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((expense) => (
                <tr key={expense.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{expense.expenseNumber}</div>
                    <div className="line-clamp-1 text-xs text-slate-500">{expense.description}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{expense.category.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{expense.payee}</div>
                    {expense.supplier ? (
                      <div className="text-xs text-slate-500">{expense.supplier.name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-orange-700">
                    {formatMoney(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {titleCase(expense.paymentMethod)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(expense.expenseDate)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {expense.assignedFinanceUser?.name || "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[expense.status]}`}
                    >
                      {titleCase(expense.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {expense.status === "recorded" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(expense)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={async () => {
                              await voidExpense(expense.id);
                              setMessage(`${expense.expenseNumber} voided.`);
                              await reload();
                            }}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Void
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${expense.expenseNumber}?`)) return;
                          await deleteExpense(expense.id);
                          setMessage("Expense deleted.");
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
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? "Loading..." : "No expenses found."}
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

      <Modal open={formOpen} title="Record Expense" onClose={closeModals}>
        {renderForm(submitCreate, saving ? "Saving..." : "Record Expense")}
      </Modal>

      <Modal
        open={editOpen}
        title={editing ? `Edit ${editing.expenseNumber}` : "Edit Expense"}
        onClose={closeModals}
      >
        {renderForm(submitEdit, saving ? "Saving..." : "Save Changes")}
      </Modal>
    </section>
  );
}
