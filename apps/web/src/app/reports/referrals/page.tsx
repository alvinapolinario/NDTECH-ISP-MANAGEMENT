"use client";

import { ReportPage } from "@/components/reports/report-page";
import { fetchReferralReport } from "@/hooks/use-reports";
import { customerDisplayName } from "@/lib/format";

export default function ReferralReportsPage() {
  return (
    <ReportPage
      title="Referral Reports"
      description="Customers who referred others and their recent referral activity."
      searchPlaceholder="Search referrer account or name"
      load={fetchReferralReport}
      columns={[
        {
          key: "referrer",
          label: "Referrer",
          render: (item) =>
            customerDisplayName({
              accountNumber: item.accountNumber as string,
              firstName: item.firstName as string | null,
              lastName: item.lastName as string | null,
              businessName: item.businessName as string | null,
            }),
        },
        { key: "status", label: "Status" },
        {
          key: "referralCount",
          label: "Referrals",
          render: (item) => String(item.referralCount ?? 0),
        },
        {
          key: "recentReferrals",
          label: "Recent Referrals",
          render: (item) => {
            const referrals = item.recentReferrals as Array<{
              accountNumber: string;
              firstName?: string | null;
              lastName?: string | null;
              businessName?: string | null;
            }>;
            if (!referrals?.length) return "—";
            return referrals
              .map((referral) => customerDisplayName(referral))
              .join(", ");
          },
        },
      ]}
    />
  );
}
