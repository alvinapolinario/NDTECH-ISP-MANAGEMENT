"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { fetchInvoices } from "@/hooks/use-invoices";
import { fetchPayments } from "@/hooks/use-payments";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";
import { openSubscriptionBillingReport } from "@/lib/subscription-billing-report";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import type { Payment, PaymentStatus } from "@/types/payment";
import type { Subscription } from "@/types/subscription";

const HISTORY_LIMIT = 200;

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  issued: "bg-sky-50 text-sky-700",
  partially_paid: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const paymentStatusStyles: Record<PaymentStatus, string> = {
  posted: "bg-emerald-50 text-emerald-700",
  voided: "bg-slate-100 text-slate-600",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type SubscriptionBillingHistoryProps = {
  subscription: Subscription;
};

export function SubscriptionBillingHistory({
  subscription,
}: SubscriptionBillingHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [invoiceResponse, paymentResponse] = await Promise.all([
          fetchInvoices({
            subscriptionId: subscription.id,
            page: 1,
            limit: HISTORY_LIMIT,
          }),
          fetchPayments({
            subscriptionId: subscription.id,
            page: 1,
            limit: HISTORY_LIMIT,
          }),
        ]);

        if (cancelled) return;

        setInvoices(invoiceResponse.items);
        setPayments(paymentResponse.items);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load billing history",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [subscription.id]);

  const summary = useMemo(() => {
    const totalInvoiced = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.total),
      0,
    );
    const totalCollected = payments
      .filter((payment) => payment.status === "posted")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const outstanding = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.balance),
      0,
    );

    return { totalInvoiced, totalCollected, outstanding };
  }, [invoices, payments]);

  function handlePrint() {
    openSubscriptionBillingReport(
      { subscription, invoices, payments },
      "print",
    );
  }

  function handleExportPdf() {
    openSubscriptionBillingReport({ subscription, invoices, payments }, "pdf");
  }

  return (
    <section className="rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Billing History</h2>
          <p className="mt-1 text-sm text-slate-500">
            All invoices and payments for this subscription.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || Boolean(error)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={loading || Boolean(error)}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Invoiced" value={formatMoney(summary.totalInvoiced)} />
        <SummaryCard
          label="Total Collected"
          value={formatMoney(summary.totalCollected)}
          tone="emerald"
        />
        <SummaryCard
          label="Outstanding"
          value={formatMoney(summary.outstanding)}
          tone="amber"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading billing history...</p>
      ) : (
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Invoices ({invoices.length})
              </h3>
              <Link
                href="/billing/invoices"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                Open invoices
              </Link>
            </div>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Invoice
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Cycle
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Issue
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Due
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">
                      Total
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">
                      Paid
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">
                      Balance
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                        No invoices for this subscription yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {invoice.billingCycle.name}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatMoney(invoice.total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatMoney(invoice.amountPaid)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatMoney(invoice.balance)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${invoiceStatusStyles[invoice.status]}`}
                          >
                            {titleCase(invoice.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Payments ({payments.length})
              </h3>
              <Link
                href="/billing/payments"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                Open payments
              </Link>
            </div>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Payment
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Invoice
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Date
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Method
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Reference
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Received By
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                        No payments recorded for this subscription yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {payment.paymentNumber}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {payment.invoice.invoiceNumber}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatMoney(payment.amount)}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {titleCase(payment.paymentMethod)}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {payment.referenceNumber || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {payment.receivedBy || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusStyles[payment.status]}`}
                          >
                            {titleCase(payment.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Customer: {customerDisplayName(subscription.customer)} · Account{" "}
            {subscription.customer.accountNumber}
          </p>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-md border px-4 py-3 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
