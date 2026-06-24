"use client";

import { useEffect, useState } from "react";
import { CrudPage, FieldConfig } from "@/components/admin/crud-page";
import { apiRequest } from "@/lib/api";

type Province = {
  id: number;
  name: string;
};

type Municipality = {
  id: number;
  provinceId: number;
  name: string;
  code?: string;
  province?: Province;
  _count?: { barangays: number };
};

type ListResponse<T> = {
  items: T[];
};

export default function MunicipalitiesPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);

  useEffect(() => {
    apiRequest<ListResponse<Province>>("/locations/provinces?limit=100")
      .then((response) => setProvinces(response.items))
      .catch(() => setProvinces([]));
  }, []);

  const fields: FieldConfig[] = [
    {
      name: "provinceId",
      label: "Province",
      type: "select",
      required: true,
      options: provinces.map((province) => ({
        label: province.name,
        value: String(province.id),
      })),
    },
    { name: "name", label: "Municipality Name", required: true },
    { name: "code", label: "Code" },
  ];

  return (
    <CrudPage<Municipality>
      title="Municipalities"
      description="Manage municipalities and link them to their province."
      endpoint="/locations/municipalities"
      formMode="modal"
      searchPlaceholder="Search municipality, province, or code"
      fields={fields}
      transformSubmit={(values) => ({
        ...values,
        provinceId: Number(values.provinceId),
      })}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Municipality" },
        {
          key: "province",
          label: "Province",
          render: (municipality) => municipality.province?.name ?? "",
        },
        { key: "code", label: "Code" },
        {
          key: "barangays",
          label: "Barangays",
          render: (municipality) => String(municipality._count?.barangays ?? 0),
        },
      ]}
    />
  );
}
