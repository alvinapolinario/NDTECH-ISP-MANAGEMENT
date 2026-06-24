"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SubscriptionForm } from "@/components/isp/subscription-form";
import { SubscriptionStatusBadge } from "@/components/isp/subscription-status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createSubscription,
  fetchSubscription,
  updateSubscription,
  useSubscriptions,
} from "@/hooks/use-subscriptions";
import { useServicePlans } from "@/hooks/use-service-plans";
import {
  toCreateSubscriptionPayload,
  toUpdateSubscriptionPayload,
} from "@/lib/subscription-payload";
import { customerDisplayName, formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { Subscription, SubscriptionFormValues, SubscriptionStatus } from "@/types/subscription";

const statusOptions: Array<{ label: string; value: SubscriptionStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Terminated", value: "terminated" },
];

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Loading subscriptions...</p>}>
      <SubscriptionsPageContent />
    </Suspense>
  );
}

function SubscriptionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [servicePlanId, setServicePlanId] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const query = useMemo(
    () => ({
      search,
      status,
      servicePlanId: servicePlanId ? Number(servicePlanId) : ("" as const),
      page,
      limit: 10,
    }),
    [page, search, servicePlanId, status],
  );

  const { data, loading, error, reload } = useSubscriptions(query);
  const { plans } = useServicePlans();
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  const editInitialValues = useMemo<Partial<SubscriptionFormValues> | undefined>(
    () =>
      editing
        ? {
            customerId: String(editing.customerId),
            servicePlanId: String(editing.servicePlanId),
            pppoeAccountId: editing.pppoeAccountId
              ? String(editing.pppoeAccountId)
              : "",
            billingDay: String(editing.billingDay),
            startDate: toDateInputValue(editing.startDate),
            endDate: toDateInputValue(editing.endDate),
            status: editing.status,
            autoSuspendEnabled: editing.autoSuspendEnabled,
            gracePeriodDays: String(editing.gracePeriodDays),
          }
        : undefined,
    [editing],
  );

  function openCreate() {
    setEditing(null);
    setLocalError("");
    setFormOpen(true);
  }

  function openEdit(subscription: Subscription) {
    setEditing(subscription);
    setLocalError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setLocalError("");
    router.replace("/isp/subscriptions");
  }

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreate();
      return;
    }

    const editId = searchParams.get("edit");
    if (!editId) return;

    const subscription = data.items.find((item) => String(item.id) === editId);
    if (subscription) {
      openEdit(subscription);
      return;
    }

    let cancelled = false;

    fetchSubscription(editId)
      .then((loaded) => {
        if (!cancelled) openEdit(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setLocalError("Unable to load subscription for editing.");
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, data.items]);

  async function handleSubmit(values: SubscriptionFormValues) {
    setSaving(true);
    setMessage("");
    setLocalError("");

    try {
      if (editing) {
        await updateSubscription(editing.id, toUpdateSubscriptionPayload(values));
        setMessage(`Subscription #${editing.id} updated.`);
      } else {
        await createSubscription(toCreateSubscriptionPayload(values));
        setMessage("Subscription created.");
      }

      closeForm();
      await reload();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to save subscription",
      );
      throw caught;
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
          <h1 className="text-2xl font-semibold text-slate-950">Subscriptions</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Assign service plans to customers, manage billing days, and track
            subscription status.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Create Subscription
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
              placeholder="Search customer name or account number"
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
              setStatus(nextValue as SubscriptionStatus | "");
              setPage(1);
            }}
            includeEmptyOption={false}
            options={statusOptions}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />

          <SearchableSelect
            value={servicePlanId}
            onChange={(nextValue) => {
              setServicePlanId(nextValue);
              setPage(1);
            }}
            includeEmptyOption={false}
            options={[
              { label: "All plans", value: "" },
              ...plans.map((plan) => ({
                label: plan.name,
                value: String(plan.id),
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
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Monthly Fee</th>
                <th className="px-4 py-3 font-semibold">PPPoE Account</th>
                <th className="px-4 py-3 font-semibold">Billing Day</th>
                <th className="px-4 py-3 font-semibold">Start Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((subscription) => (
                <tr key={subscription.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">
                      {customerDisplayName(subscription.customer)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {subscription.customer.accountNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {subscription.servicePlan.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(subscription.servicePlan.monthlyPrice)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {subscription.pppoeAccount ? (
                      <div>
                        <div className="font-medium text-slate-900">
                          {subscription.pppoeAccount.username}
                        </div>
                        <div className="text-xs text-slate-500">
                          {subscription.pppoeAccount.router.name}
                        </div>
                      </div>
                    ) : (
                      "Not linked"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    Day {subscription.billingDay}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(subscription.startDate)}
                  </td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusBadge status={subscription.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/isp/subscriptions/${subscription.id}`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(subscription)}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {loading ? "Loading..." : "No subscriptions found."}
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
        open={formOpen}
        title={editing ? `Edit Subscription #${editing.id}` : "Create Subscription"}
        description={
          editing
            ? "Update billing settings and subscription status."
            : "Link a customer to an internet plan and configure billing settings."
        }
        onClose={closeForm}
      >
        <SubscriptionForm
          key={editing?.id ?? "create"}
          embedded
          initialValues={editInitialValues}
          submitLabel={saving ? "Saving..." : editing ? "Save Changes" : "Create Subscription"}
          loading={saving}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      </Modal>
    </section>
  );
}
