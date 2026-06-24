"use client";

import { CrudPage } from "@/components/admin/crud-page";

type Supplier = {
  id: number;
  code: string;
  name: string;
  contactPerson?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  tin?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
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

export default function SuppliersPage() {
  return (
    <CrudPage<Supplier>
      sectionLabel="Procurement"
      title="Suppliers"
      description="Register vendors before creating purchase requests, purchase orders, and goods receiving records."
      endpoint="/suppliers"
      formMode="modal"
      searchPlaceholder="Search supplier code, name, contact, email, TIN, or notes"
      filterOptions={[
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ]}
      initialForm={{ isActive: true }}
      fields={[
        { name: "code", label: "Supplier Code", required: true, placeholder: "SUP-001" },
        { name: "name", label: "Supplier Name", required: true },
        { name: "contactPerson", label: "Contact Person" },
        { name: "contactNumber", label: "Contact Number" },
        { name: "email", label: "Email", type: "email" },
        { name: "tin", label: "TIN" },
        { name: "paymentTerms", label: "Payment Terms", placeholder: "COD, Net 15, Net 30" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "notes", label: "Notes", type: "textarea" },
        { name: "isActive", label: "Active", type: "checkbox" },
      ]}
      mapItemToForm={(supplier) => ({
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contactPerson ?? "",
        contactNumber: supplier.contactNumber ?? "",
        email: supplier.email ?? "",
        tin: supplier.tin ?? "",
        paymentTerms: supplier.paymentTerms ?? "",
        address: supplier.address ?? "",
        notes: supplier.notes ?? "",
        isActive: supplier.isActive,
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
        { key: "name", label: "Supplier" },
        {
          key: "contact",
          label: "Contact",
          render: (supplier) =>
            [supplier.contactPerson, supplier.contactNumber].filter(Boolean).join(" / ") || "-",
        },
        {
          key: "email",
          label: "Email",
          render: (supplier) => supplier.email || "-",
        },
        {
          key: "paymentTerms",
          label: "Terms",
          render: (supplier) => supplier.paymentTerms || "-",
        },
        {
          key: "isActive",
          label: "Status",
          render: (supplier) => <StatusPill active={supplier.isActive} />,
        },
      ]}
    />
  );
}
