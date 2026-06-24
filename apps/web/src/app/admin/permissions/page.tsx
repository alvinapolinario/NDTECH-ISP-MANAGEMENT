"use client";

import { CrudPage } from "@/components/admin/crud-page";

type Permission = {
  id: number;
  module: string;
  action: string;
  description?: string;
};

export default function PermissionsPage() {
  return (
    <CrudPage<Permission>
      title="Permissions"
      description="Maintain module and action permissions used by system roles."
      endpoint="/permissions"
      formMode="modal"
      searchPlaceholder="Search module, action, or description"
      fields={[
        { name: "module", label: "Module", required: true },
        { name: "action", label: "Action", required: true },
        { name: "description", label: "Description" },
      ]}
      columns={[
        { key: "id", label: "ID" },
        { key: "module", label: "Module" },
        { key: "action", label: "Action" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}
