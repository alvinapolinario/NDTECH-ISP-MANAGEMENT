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
  name: string;
  province?: Province;
};

type Barangay = {
  id: number;
  municipalityId: number;
  name: string;
  code?: string;
  municipality?: Municipality;
};

type ListResponse<T> = {
  items: T[];
};

export default function BarangaysPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

  useEffect(() => {
    apiRequest<ListResponse<Municipality>>("/locations/municipalities?limit=100")
      .then((response) => setMunicipalities(response.items))
      .catch(() => setMunicipalities([]));
  }, []);

  const fields: FieldConfig[] = [
    {
      name: "municipalityId",
      label: "Municipality",
      type: "select",
      required: true,
      options: municipalities.map((municipality) => ({
        label: `${municipality.name}, ${municipality.province?.name ?? "No Province"}`,
        value: String(municipality.id),
      })),
    },
    { name: "name", label: "Barangay Name", required: true },
    { name: "code", label: "Code" },
  ];

  return (
    <CrudPage<Barangay>
      title="Barangays"
      description="Manage barangays used by customer service addresses and future geographic analysis."
      endpoint="/locations/barangays"
      formMode="modal"
      searchPlaceholder="Search barangay, municipality, province, or code"
      fields={fields}
      transformSubmit={(values) => ({
        ...values,
        municipalityId: Number(values.municipalityId),
      })}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Barangay" },
        {
          key: "municipality",
          label: "Municipality",
          render: (barangay) => barangay.municipality?.name ?? "",
        },
        {
          key: "province",
          label: "Province",
          render: (barangay) => barangay.municipality?.province?.name ?? "",
        },
        { key: "code", label: "Code" },
      ]}
    />
  );
}
