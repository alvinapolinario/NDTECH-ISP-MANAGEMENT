"use client";

import { CrudPage } from "@/components/admin/crud-page";

type AuditLog = {
  id: number;
  action: string;
  module: string;
  referenceId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { name: string; email: string };
};

export default function AuditLogsPage() {
  return (
    <CrudPage<AuditLog>
      title="Audit Logs"
      description="Review append-only records for important system activity."
      endpoint="/audit-logs"
      formMode="modal"
      searchPlaceholder="Search action, module, or reference"
      canDelete={false}
      canEdit={false}
      fields={[
        { name: "action", label: "Action", required: true },
        { name: "module", label: "Module", required: true },
        { name: "referenceId", label: "Reference ID" },
        { name: "ipAddress", label: "IP Address" },
      ]}
      columns={[
        { key: "id", label: "ID" },
        { key: "action", label: "Action" },
        { key: "module", label: "Module" },
        { key: "referenceId", label: "Reference" },
        { key: "ipAddress", label: "IP" },
        {
          key: "user",
          label: "User",
          render: (log) => log.user?.name ?? "System",
        },
        {
          key: "createdAt",
          label: "Created",
          render: (log) => new Date(log.createdAt).toLocaleString(),
        },
      ]}
    />
  );
}
