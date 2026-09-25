"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SubscriptionStatusBadge } from "@/components/isp/subscription-status-badge";
import { SubscriptionBillingHistory } from "@/components/isp/subscription-billing-history";
import { deleteSubscription, useSubscription } from "@/hooks/use-subscriptions";
import {
  customerDisplayName,
  formatDate,
  formatMoney,
  subscriptionMonthlyFee,
} from "@/lib/format";
import { useRouter } from "next/navigation";

export default function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [subscriptionId, setSubscriptionId] = useState("");
  const { subscription, loading, error } = useSubscription(subscriptionId);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    params.then((resolved) => setSubscriptionId(resolved.id));
  }, [params]);

  async function handleDelete() {
    if (!subscription) return;

    const confirmed = window.confirm(
      `Delete subscription #${subscription.id} for ${customerDisplayName(subscription.customer)}?`,
    );
    if (!confirmed) return;

    setActionError("");
    setMessage("");

    try {
      await deleteSubscription(subscription.id);
      router.push("/isp/subscriptions");
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Unable to delete subscription",
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading subscription...</p>;
  }

  if (error || !subscription) {
    return (
      <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "Subscription not found."}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            ISP Services
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Subscription #{subscription.id}
          </h1>
          <div className="flex items-center gap-2">
            <SubscriptionStatusBadge status={subscription.status} />
            <span className="text-sm text-slate-600">
              {customerDisplayName(subscription.customer)}
              {subscription.label ? ` · ${subscription.label}` : ""} ·{" "}
              {subscription.servicePlan.name}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/isp/subscriptions/${subscription.id}/edit`}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>

      {message ? (
        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Customer</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">
                {customerDisplayName(subscription.customer)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Account Number</dt>
              <dd>{subscription.customer.accountNumber}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mobile</dt>
              <dd>{subscription.customer.mobileNumber}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Service Plan</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Label / Note</dt>
              <dd className="font-medium text-slate-900">
                {subscription.label || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-medium text-slate-900">
                {subscription.servicePlan.name}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Code</dt>
              <dd>{subscription.servicePlan.code}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Monthly Fee</dt>
              <dd>
                {formatMoney(subscriptionMonthlyFee(subscription))}
                {subscription.monthlyAmount !== null &&
                subscription.monthlyAmount !== undefined &&
                subscription.monthlyAmount !== "" ? (
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Custom amount (plan catalog{" "}
                    {formatMoney(subscription.servicePlan.monthlyPrice)})
                  </span>
                ) : (
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Plan catalog price
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Speed</dt>
              <dd>
                {subscription.servicePlan.downloadMbps}/
                {subscription.servicePlan.uploadMbps} Mbps
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Billing Settings
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-slate-500">Billing Day</dt>
              <dd>Day {subscription.billingDay}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Start Date</dt>
              <dd>{formatDate(subscription.startDate)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">End Date</dt>
              <dd>{formatDate(subscription.endDate)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Grace Period</dt>
              <dd>{subscription.gracePeriodDays} days</dd>
            </div>
            <div>
              <dt className="text-slate-500">Auto Suspend</dt>
              <dd>{subscription.autoSuspendEnabled ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd>{formatDate(subscription.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated</dt>
              <dd>{formatDate(subscription.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">PPPoE Account</dt>
              <dd>
                {subscription.pppoeAccount
                  ? `${subscription.pppoeAccount.username} (${subscription.pppoeAccount.router.name})`
                  : "Not linked"}
              </dd>
            </div>
            {subscription.pppoeAccount ? (
              <>
                <div>
                  <dt className="text-slate-500">PPPoE Profile</dt>
                  <dd>{subscription.pppoeAccount.profileName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Remote Address</dt>
                  <dd>{subscription.pppoeAccount.remoteAddress || "None"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Router Host</dt>
                  <dd>{subscription.pppoeAccount.router.host}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>
      </div>

      <SubscriptionBillingHistory subscription={subscription} />

      <Link
        href="/isp/subscriptions"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        Back to subscriptions
      </Link>
    </section>
  );
}
