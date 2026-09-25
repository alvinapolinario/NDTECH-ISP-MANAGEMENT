"use client";

import { ReportPage } from "@/components/reports/report-page";
import { fetchSubscriberReport } from "@/hooks/use-reports";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";

export default function SubscriberReportsPage() {
  return (
    <ReportPage
      title="Subscriber Reports"
      description="Active, suspended, cancelled, and terminated subscription summary."
      searchPlaceholder="Search account, customer, or plan"
      filterOptions={[
        { label: "All statuses", value: "" },
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Terminated", value: "terminated" },
      ]}
      load={fetchSubscriberReport}
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
          key: "servicePlan",
          label: "Plan",
          render: (item) => {
            const plan = item.servicePlan as { code: string; name: string };
            return `${plan.code} · ${plan.name}`;
          },
        },
        {
          key: "monthlyPrice",
          label: "Monthly Price",
          render: (item) => {
            const effective = item.effectiveMonthlyPrice as string | undefined;
            if (effective != null) return formatMoney(effective);
            return formatMoney(
              (item.servicePlan as { monthlyPrice: string }).monthlyPrice,
            );
          },
        },
        { key: "status", label: "Status" },
        {
          key: "pppoeAccount",
          label: "PPPoE",
          render: (item) =>
            (item.pppoeAccount as { username?: string } | null)?.username ?? "—",
        },
        {
          key: "startDate",
          label: "Start Date",
          render: (item) => formatDate(item.startDate as string),
        },
      ]}
    />
  );
}
