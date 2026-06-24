"use client";

import { CrudPage } from "@/components/admin/crud-page";
import type { TicketCategory } from "@/types/support";

export default function TicketCategoriesPage() {
  return (
    <CrudPage<TicketCategory>
      title="Ticket Categories"
      description="Manage issue types used when classifying support tickets."
      sectionLabel="Support"
      formMode="modal"
      endpoint="/ticket-categories"
      searchPlaceholder="Search category code or name"
      filterOptions={[
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ]}
      fields={[
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Name", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "isActive", label: "Active", type: "checkbox" },
      ]}
      initialForm={{ isActive: true }}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
        {
          key: "isActive",
          label: "Status",
          render: (category) => (
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {category.isActive ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
    />
  );
}
