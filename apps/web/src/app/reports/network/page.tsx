"use client";

import { ReportPage } from "@/components/reports/report-page";
import { fetchNetworkReport } from "@/hooks/use-reports";
import { formatDate } from "@/lib/format";

export default function NetworkReportsPage() {
  return (
    <ReportPage
      title="Network Reports"
      description="Router, OLT, ONU, PPPoE session, and monitoring alert summary."
      searchPlaceholder="Search router name or host"
      load={fetchNetworkReport}
      columns={[
        { key: "name", label: "Device" },
        { key: "host", label: "Host" },
        { key: "status", label: "Status" },
        {
          key: "pppoeAccounts",
          label: "PPPoE Accounts",
          render: (item) => String(item.pppoeAccounts ?? 0),
        },
        {
          key: "activeSessions",
          label: "Active Sessions",
          render: (item) => String(item.activeSessions ?? 0),
        },
        {
          key: "lastCheckedAt",
          label: "Last Checked",
          render: (item) => formatDate(item.lastCheckedAt as string),
        },
      ]}
    />
  );
}
