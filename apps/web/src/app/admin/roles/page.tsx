"use client";

import { CrudPage } from "@/components/admin/crud-page";

type Role = {
  id: number;
  name: string;
  description?: string;
  permissions?: { permission: { module: string; action: string } }[];
};

export default function RolesPage() {
  return (
    <CrudPage<Role>
      title="Roles"
      description="Create and maintain role records for role-based access control."
      endpoint="/roles"
      formMode="modal"
      searchPlaceholder="Search roles"
      fields={[
        { name: "name", label: "Role Name", required: true },
        { name: "description", label: "Description" },
      ]}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Role" },
        { key: "description", label: "Description" },
        {
          key: "permissions",
          label: "Permissions",
          render: (role) =>
            role.permissions
              ?.map(
                (rolePermission) =>
                  `${rolePermission.permission.module}:${rolePermission.permission.action}`,
              )
              .join(", ") || "None",
        },
      ]}
    />
  );
}
