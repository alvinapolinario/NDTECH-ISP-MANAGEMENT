"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCustomers } from "@/hooks/use-customers";
import { fetchPppoeAccounts } from "@/hooks/use-mikrotik";
import { fetchPppoeAccountOptions } from "@/hooks/use-subscriptions";
import { useServicePlans } from "@/hooks/use-service-plans";
import { customerDisplayName, formatMoney } from "@/lib/format";
import type { PppoeAccountOption } from "@/types/subscription";
import type {
  SubscriptionFormValues,
  SubscriptionStatus,
} from "@/types/subscription";

type SubscriptionFormProps = {
  initialValues?: Partial<SubscriptionFormValues>;
  submitLabel: string;
  loading?: boolean;
  embedded?: boolean;
  excludeSubscriptionId?: number;
  onSubmit: (values: SubscriptionFormValues) => Promise<void>;
  onCancel?: () => void;
};

const defaultValues: SubscriptionFormValues = {
  customerId: "",
  servicePlanId: "",
  pppoeAccountId: "",
  radiusUsername: "",
  label: "",
  monthlyAmount: "",
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

function optionValue(option: PppoeAccountOption) {
  if (option.pppoeAccountId) return `id:${option.pppoeAccountId}`;
  return `user:${option.username}`;
}

function parseLinkValue(value: string): {
  pppoeAccountId: string;
  radiusUsername: string;
} {
  if (!value) return { pppoeAccountId: "", radiusUsername: "" };
  if (value.startsWith("id:")) {
    return { pppoeAccountId: value.slice(3), radiusUsername: "" };
  }
  if (value.startsWith("user:")) {
    return { pppoeAccountId: "", radiusUsername: value.slice(5) };
  }
  // Legacy numeric id from older forms
  return { pppoeAccountId: value, radiusUsername: "" };
}

function currentLinkValue(form: SubscriptionFormValues) {
  if (form.pppoeAccountId) return `id:${form.pppoeAccountId}`;
  if (form.radiusUsername) return `user:${form.radiusUsername}`;
  return "";
}

export function SubscriptionForm({
  initialValues,
  submitLabel,
  loading = false,
  embedded = false,
  excludeSubscriptionId,
  onSubmit,
  onCancel,
}: SubscriptionFormProps) {
  const [form, setForm] = useState<SubscriptionFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [error, setError] = useState("");
  const [options, setOptions] = useState<PppoeAccountOption[]>([]);
  const [optionsSource, setOptionsSource] = useState<"radius" | "local" | "mikrotik">(
    "local",
  );
  const [accountsLoading, setAccountsLoading] = useState(false);
  const { customers, loading: customersLoading } = useCustomers();
  const { plans, loading: plansLoading } = useServicePlans();
  const selectedPlan = plans.find(
    (plan) => String(plan.id) === form.servicePlanId,
  );

  useEffect(() => {
    if (initialValues) {
      setForm((current) => ({ ...current, ...initialValues }));
    }
  }, [initialValues]);

  useEffect(() => {
    let cancelled = false;
    setAccountsLoading(true);

    async function loadOptions() {
      try {
        const response = await fetchPppoeAccountOptions({
          customerId: form.customerId || undefined,
          servicePlanId: form.servicePlanId || undefined,
          excludeSubscriptionId,
          limit: 100,
        });
        if (cancelled) return;
        setOptions(response.items);
        setOptionsSource(response.source);
      } catch {
        try {
          const fallback = await fetchPppoeAccounts({ limit: 100 });
          if (cancelled) return;
          const mapped: PppoeAccountOption[] = fallback.items
            .filter((account) => {
              if (
                form.customerId &&
                account.customerId !== Number(form.customerId)
              ) {
                return false;
              }
              if (
                form.servicePlanId &&
                account.servicePlanId !== Number(form.servicePlanId)
              ) {
                return false;
              }
              return true;
            })
            .map((account) => ({
              username: account.username,
              groupname: account.profileName,
              pppoeAccountId: account.id,
              customerId: account.customerId,
              servicePlanId: account.servicePlanId,
              linkedSubscriptionId: null,
              profileName: account.profileName,
              router: account.router,
              customer: account.customer,
              servicePlan: account.servicePlan,
            }));
          setOptions(mapped);
          setOptionsSource("mikrotik");
        } catch {
          if (!cancelled) {
            setOptions([]);
            setOptionsSource("local");
          }
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [form.customerId, form.servicePlanId, excludeSubscriptionId]);

  const selectOptions = useMemo(() => {
    const current = currentLinkValue(form);
    const items = options.map((option) => {
      const routerLabel = option.router?.name ?? "RADIUS";
      const planLabel =
        option.servicePlan?.name ?? option.profileName ?? option.groupname ?? "—";
      const sessions =
        typeof option.activeSessions === "number" && option.activeSessions > 0
          ? ` · ${option.activeSessions} session(s)`
          : "";
      return {
        label: `${option.username} — ${routerLabel} — ${planLabel}${sessions}`,
        value: optionValue(option),
      };
    });

    // Keep current selection visible while editing even if filters temporarily hide it
    if (
      current &&
      !items.some((item) => item.value === current) &&
      (form.pppoeAccountId || form.radiusUsername)
    ) {
      items.unshift({
        label: form.radiusUsername
          ? `${form.radiusUsername} (current)`
          : `PPPoE #${form.pppoeAccountId} (current)`,
        value: current,
      });
    }

    return items;
  }, [options, form]);

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

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Label / Note</span>
          <input
            type="text"
            maxLength={50}
            value={form.label}
            placeholder="Home, Store, Account1"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                label: event.target.value,
              }))
            }
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
          <span className="text-xs text-slate-500">
            Distinguishes multiple subscriptions for the same customer.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            Custom monthly amount
          </span>
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={form.monthlyAmount}
            placeholder={
              selectedPlan
                ? `Blank = plan rate ${formatMoney(selectedPlan.monthlyPrice)}`
                : "Leave blank to use plan rate"
            }
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                monthlyAmount: event.target.value,
              }))
            }
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
          />
          <span className="text-xs text-slate-500">
            Optional negotiated fee (e.g. 1-user deal). Leave blank to bill the
            service plan catalog price
            {selectedPlan
              ? ` (${formatMoney(selectedPlan.monthlyPrice)})`
              : ""}
            .
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700">
            PPPoE / RADIUS Account
          </span>
          <SearchableSelect
            disabled={accountsLoading}
            value={currentLinkValue(form)}
            onChange={(nextValue) => {
              const parsed = parseLinkValue(nextValue);
              setForm((current) => ({
                ...current,
                pppoeAccountId: parsed.pppoeAccountId,
                radiusUsername: parsed.radiusUsername,
              }));
            }}
            emptyOptionLabel="Not linked"
            options={selectOptions}
            className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
          <span className="text-xs text-slate-500">
            {optionsSource === "radius"
              ? "RADIUS usernames for the selected plan. Already-linked accounts are hidden."
              : optionsSource === "mikrotik"
                ? "Local MikroTik PPPoE list (RADIUS options unavailable)."
                : "Local PPPoE accounts. Already-linked active subscriptions are excluded."}
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
