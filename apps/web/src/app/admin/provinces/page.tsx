"use client";

import { CrudPage } from "@/components/admin/crud-page";

type Province = {
  id: number;
  name: string;
  code?: string;
  _count?: { municipalities: number };
};

export default function ProvincesPage() {
  return (
    <CrudPage<Province>
      title="Provinces"
      description="Manage province records used by customer service addresses."
      endpoint="/locations/provinces"
      formMode="modal"
      searchPlaceholder="Search province or code"
      fields={[
        { name: "name", label: "Province Name", required: true },
        { name: "code", label: "Code" },
      ]}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Province" },
        { key: "code", label: "Code" },
        {
          key: "municipalities",
          label: "Municipalities",
          render: (province) => String(province._count?.municipalities ?? 0),
        },
      ]}
    />
  );
}
