"use client";

import { FormEvent, useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCustomers } from "@/hooks/use-customers";
import { fetchPppoeAccounts } from "@/hooks/use-mikrotik";
import { useServicePlans } from "@/hooks/use-service-plans";
import { customerDisplayName } from "@/lib/format";
import type { PppoeAccount } from "@/types/mikrotik";
import type {
  SubscriptionFormValues,
  SubscriptionStatus,
} from "@/types/subscription";

type SubscriptionFormProps = {
  initialValues?: Partial<SubscriptionFormValues>;
  submitLabel: string;
  loading?: boolean;
  embedded?: boolean;
  onSubmit: (values: SubscriptionFormValues) => Promise<void>;
  onCancel?: () => void;
};

const defaultValues: SubscriptionFormValues = {
  customerId: "",
  servicePlanId: "",
  pppoeAccountId: "",
  billingDay: "1",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  status: "active",
  autoSuspendEnabled: true,
  gracePeriodDays: "7",
};

const statusOptions: SubscriptionStatus[] = [
  "active",
  "suspended",
  "cancelled",
  "terminated",
];

export function SubscriptionForm({
  initialValues,
  submitLabel,
  loading = false,
  embedded = false,
  onSubmit,
  onCancel,
}: SubscriptionFormProps) {
  const [form, setForm] = useState<SubscriptionFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [error, setError] = useState("");
  const [pppoeAccounts, setPppoeAccounts] = useState<PppoeAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const { customers, loading: customersLoading } = useCustomers();
  const { plans, loading: plansLoading } = useServicePlans();

  useEffect(() => {
    if (initialValues) {
      setForm((current) => ({ ...current, ...initialValues }));
    }
  }, [initialValues]);

  useEffect(() => {
    setAccountsLoading(true);
    fetchPppoeAccounts({ limit: 100 })
      .then((response) => setPppoeAccounts(response.items))
      .catch(() => setPppoeAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, []);

  const availablePppoeAccounts = pppoeAccounts.filter((account) => {
    if (form.customerId && account.customerId !== Number(form.customerId)) {
      return false;
    }

    if (
      form.servicePlanId &&
      account.servicePlanId !== Number(form.servicePlanId)
    ) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (
      form.pppoeAccountId &&
      !availablePppoeAccounts.some(
        (account) => String(account.id) === form.pppoeAccountId,
      )
    ) {
      setForm((current) => ({ ...current, pppoeAccountId: "" }));
    }
  }, [availablePppoeAccounts, form.pppoeAccountId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      await onSubmit(form);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save subscription",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={embedded ? "" : "rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm"}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Customer</span>
          <SearchableSelect
            required
            disabled={customersLoading}
            value={form.customerId}
            onChange={(nextValue) =>
              setForm((current) => ({
                ...current,
                customerId: nextValue,
              }))
            }
            emptyOptionLabel="Select customer"
            options={customers.map((customer) => ({
              label: `${customerDisplayName(customer)} (${customer.accountNumber})`,
              value: String(customer.id),
            }))}
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Service Plan</span>
          <SearchableSelect
            required
            disabled={plansLoading}
            value={form.servicePlanId}
            onChange={(nextValue) =>
              setForm((current) => ({
                ...current,
                servicePlanId: nextValue,
              }))
            }
            emptyOptionLabel="Select plan"
            options={plans.map((plan) => ({
              label: `${plan.name} (${plan.code})`,
              value: String(plan.id),
            }))}
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700">PPPoE Account</span>
          <SearchableSelect
            disabled={accountsLoading}
            value={form.pppoeAccountId}
            onChange={(nextValue) =>
              setForm((current) => ({
                ...current,
                pppoeAccountId: nextValue,
              }))
            }
            emptyOptionLabel="Not linked"
            options={availablePppoeAccounts.map((account) => ({
              label: `${account.username} - ${account.router.name} - ${account.servicePlan?.name ?? account.profileName}`,
              value: String(account.id),
            }))}
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
          <span className="text-xs text-slate-500">
            Options are filtered by selected customer and service plan.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Billing Day</span>
          <input
            type="number"
            min={1}
            max={31}
            required
            value={form.billingDay}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                billingDay: event.target.value,
              }))
            }
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Start Date</span>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">End Date</span>
          <input
            type="date"
            value={form.endDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Grace Period (days)</span>
          <input
            type="number"
            min={0}
            required
            value={form.gracePeriodDays}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                gracePeriodDays: event.target.value,
              }))
            }
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <SearchableSelect
            value={form.status}
            onChange={(nextValue) =>
              setForm((current) => ({
                ...current,
                status: nextValue as SubscriptionStatus,
              }))
            }
            includeEmptyOption={false}
            options={statusOptions.map((status) => ({
              label: status.charAt(0).toUpperCase() + status.slice(1),
              value: status,
            }))}
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="flex items-center gap-3 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.autoSuspendEnabled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                autoSuspendEnabled: event.target.checked,
              }))
            }
            className="h-5 w-5 rounded border-slate-300 text-emerald-600"
          />
          <span className="font-medium text-slate-700">
            Enable auto-suspend when billing is overdue
          </span>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
