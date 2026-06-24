"use client";

import { ReportPage } from "@/components/reports/report-page";
import { fetchProjectReport } from "@/hooks/use-reports";
import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";

export default function ProjectReportsPage() {
  return (
    <ReportPage
      title="Project Reports"
      description="Project status, budgets, costing, and material usage summary."
      searchPlaceholder="Search project code, name, or customer"
      filterOptions={[
        { label: "All statuses", value: "" },
        { label: "Planning", value: "planning" },
        { label: "Active", value: "active" },
        { label: "On hold", value: "on_hold" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ]}
      load={fetchProjectReport}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Project" },
        { key: "status", label: "Status" },
        {
          key: "customer",
          label: "Customer",
          render: (item) =>
            item.customer
              ? customerDisplayName(
                  item.customer as {
                    accountNumber: string;
                    firstName?: string | null;
                    lastName?: string | null;
                    businessName?: string | null;
                  },
                )
              : "—",
        },
        {
          key: "budget",
          label: "Budget",
          render: (item) => formatMoney(item.budget as string),
        },
        {
          key: "costing",
          label: "Total Cost",
          render: (item) => {
            const costing = item.costing as { totalCost?: string } | null;
            return costing?.totalCost ? formatMoney(costing.totalCost) : "—";
          },
        },
        {
          key: "materialUsageCount",
          label: "Material Usage",
          render: (item) => String(item.materialUsageCount ?? 0),
        },
        {
          key: "targetDate",
          label: "Target Date",
          render: (item) => formatDate(item.targetDate as string),
        },
      ]}
    />
  );
}
