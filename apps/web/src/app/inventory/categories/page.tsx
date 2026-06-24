"use client";

import { CrudPage } from "@/components/admin/crud-page";

type InventoryCategory = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function InventoryCategoriesPage() {
  return (
    <CrudPage<InventoryCategory>
      sectionLabel="Inventory"
      title="Inventory Categories"
      description="Create material and equipment groups before adding inventory items."
      endpoint="/inventory-categories"
      formMode="modal"
      searchPlaceholder="Search category code, name, or description"
      filterOptions={[
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ]}
      initialForm={{ isActive: true }}
      fields={[
        { name: "code", label: "Category Code", required: true, placeholder: "CABLES" },
        { name: "name", label: "Category Name", required: true },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional notes for grouping inventory items.",
        },
        { name: "isActive", label: "Active", type: "checkbox" },
      ]}
      mapItemToForm={(category) => ({
        code: category.code,
        name: category.name,
        description: category.description ?? "",
        isActive: category.isActive,
      })}
      transformSubmit={(values, editing) => ({
        ...values,
        isActive:
          typeof values.isActive === "boolean"
            ? values.isActive
            : editing
              ? Boolean(editing.isActive)
              : true,
      })}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Category" },
        {
          key: "description",
          label: "Description",
          render: (category) => category.description || "-",
        },
        {
          key: "isActive",
          label: "Status",
          render: (category) => <StatusPill active={category.isActive} />,
        },
      ]}
    />
  );
}
