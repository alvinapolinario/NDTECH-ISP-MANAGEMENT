"use client";

import { CrudPage } from "@/components/admin/crud-page";

type Warehouse = {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
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

export default function WarehousesPage() {
  return (
    <CrudPage<Warehouse>
      sectionLabel="Inventory"
      title="Warehouses"
      description="Register stock locations before tracking item quantities and movements."
      endpoint="/warehouses"
      formMode="modal"
      searchPlaceholder="Search warehouse code, name, address, or contact"
      filterOptions={[
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ]}
      initialForm={{ isActive: true }}
      fields={[
        { name: "code", label: "Warehouse Code", required: true, placeholder: "MAIN" },
        { name: "name", label: "Warehouse Name", required: true },
        { name: "address", label: "Address", type: "textarea" },
        { name: "contactPerson", label: "Contact Person" },
        { name: "contactNumber", label: "Contact Number" },
        { name: "isActive", label: "Active", type: "checkbox" },
      ]}
      mapItemToForm={(warehouse) => ({
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address ?? "",
        contactPerson: warehouse.contactPerson ?? "",
        contactNumber: warehouse.contactNumber ?? "",
        isActive: warehouse.isActive,
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
        { key: "name", label: "Warehouse" },
        {
          key: "contact",
          label: "Contact",
          render: (warehouse) =>
            [warehouse.contactPerson, warehouse.contactNumber].filter(Boolean).join(" / ") || "-",
        },
        {
          key: "address",
          label: "Address",
          render: (warehouse) => warehouse.address || "-",
        },
        {
          key: "isActive",
          label: "Status",
          render: (warehouse) => <StatusPill active={warehouse.isActive} />,
        },
      ]}
    />
  );
}
