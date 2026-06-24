"use client";

import { ReportPage } from "@/components/reports/report-page";
import { fetchBillingReport } from "@/hooks/use-reports";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";

export default function BillingReportsPage() {
  return (
    <ReportPage
      title="Billing Reports"
      description="Monthly billing, collections, and outstanding invoice balances."
      searchPlaceholder="Search invoice or customer"
      monthFilter
      filterOptions={[
        { label: "All statuses", value: "" },
        { label: "Issued", value: "issued" },
        { label: "Partially paid", value: "partially_paid" },
        { label: "Paid", value: "paid" },
        { label: "Overdue", value: "overdue" },
      ]}
      load={fetchBillingReport}
      columns={[
        { key: "invoiceNumber", label: "Invoice" },
        {
          key: "customer",
          label: "Customer",
          render: (item) =>
            customerDisplayName(
              item.customer as {
                accountNumber: string;
                firstName?: string | null;
                lastName?: string | null;
                businessName?: string | null;
              },
            ),
        },
        {
          key: "issueDate",
          label: "Issue Date",
          render: (item) => formatDate(item.issueDate as string),
        },
        {
          key: "dueDate",
          label: "Due Date",
          render: (item) => formatDate(item.dueDate as string),
        },
        { key: "status", label: "Status" },
        {
          key: "total",
          label: "Total",
          render: (item) => formatMoney(item.total as string),
        },
        {
          key: "amountPaid",
          label: "Paid",
          render: (item) => formatMoney(item.amountPaid as string),
        },
        {
          key: "balance",
          label: "Balance",
          render: (item) => formatMoney(item.balance as string),
        },
      ]}
    />
  );
}
