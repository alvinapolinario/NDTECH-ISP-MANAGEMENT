"use client";

import { ReportPage } from "@/components/reports/report-page";
import { fetchCollectionReport } from "@/hooks/use-reports";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";

export default function CollectionReportsPage() {
  return (
    <ReportPage
      title="Collection Reports"
      description="Collection case workload, overdue balances, and follow-up status."
      searchPlaceholder="Search collector, customer, or invoice"
      filterOptions={[
        { label: "All statuses", value: "" },
        { label: "Pending", value: "pending" },
        { label: "Contacted", value: "contacted" },
        { label: "Promised to pay", value: "promised_to_pay" },
        { label: "Escalated", value: "escalated" },
        { label: "Resolved", value: "resolved" },
      ]}
      load={fetchCollectionReport}
      columns={[
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
          key: "invoice",
          label: "Invoice",
          render: (item) =>
            (item.invoice as { invoiceNumber: string }).invoiceNumber,
        },
        {
          key: "balance",
          label: "Balance",
          render: (item) =>
            formatMoney((item.invoice as { balance: string }).balance),
        },
        { key: "status", label: "Case Status" },
        { key: "priority", label: "Priority" },
        {
          key: "assignedCollector",
          label: "Collector",
          render: (item) =>
            String(
              (item.assignedCollectorUser as { name?: string } | undefined)?.name ??
                item.assignedCollector ??
                "—",
            ),
        },
        {
          key: "nextFollowUpDate",
          label: "Next Follow-up",
          render: (item) => formatDate(item.nextFollowUpDate as string),
        },
      ]}
    />
  );
}
