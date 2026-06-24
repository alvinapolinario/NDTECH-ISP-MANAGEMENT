"use client";

import { CrudPage } from "@/components/admin/crud-page";

type ServicePlan = {
  id: number;
  code: string;
  name: string;
  description?: string;
  downloadMbps: number;
  uploadMbps: number;
  monthlyPrice: string | number;
  pppoeProfileName?: string | null;
  isActive: boolean;
};

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

export default function ServicePlansPage() {
  return (
    <CrudPage<ServicePlan>
      sectionLabel="ISP Services"
      title="Service Plans"
      description="Create and maintain internet plan packages before assigning them to customer subscriptions."
      endpoint="/service-plans"
      formMode="modal"
      searchPlaceholder="Search plan code, name, or description"
      filterOptions={[
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ]}
      initialForm={{ isActive: true }}
      fields={[
        {
          name: "code",
          label: "Plan Code",
          required: true,
          createOnly: true,
          placeholder: "FIBER-50",
        },
        { name: "name", label: "Plan Name", required: true },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Short plan summary for staff and billing screens.",
        },
        {
          name: "downloadMbps",
          label: "Download Mbps",
          type: "number",
          required: true,
        },
        {
          name: "uploadMbps",
          label: "Upload Mbps",
          type: "number",
          required: true,
        },
        {
          name: "monthlyPrice",
          label: "Monthly Price (PHP)",
          type: "number",
          required: true,
        },
        {
          name: "pppoeProfileName",
          label: "PPPoE Profile (MikroTik)",
          placeholder: "e.g. 30mbps — restored after payment",
        },
        {
          name: "isActive",
          label: "Active",
          type: "checkbox",
        },
      ]}
      mapItemToForm={(plan) => ({
        code: plan.code,
        name: plan.name,
        description: plan.description ?? "",
        downloadMbps: String(plan.downloadMbps),
        uploadMbps: String(plan.uploadMbps),
        monthlyPrice: String(plan.monthlyPrice),
        pppoeProfileName: plan.pppoeProfileName ?? "",
        isActive: plan.isActive,
      })}
      transformSubmit={(values, editing) => ({
        ...values,
        downloadMbps: Number(values.downloadMbps),
        uploadMbps: Number(values.uploadMbps),
        monthlyPrice: Number(values.monthlyPrice),
        isActive:
          typeof values.isActive === "boolean"
            ? values.isActive
            : editing
              ? Boolean(editing.isActive)
              : true,
      })}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Plan" },
        {
          key: "speed",
          label: "Speed",
          render: (plan) => `${plan.downloadMbps}/${plan.uploadMbps} Mbps`,
        },
        {
          key: "monthlyPrice",
          label: "Monthly Price",
          render: (plan) => formatMoney(plan.monthlyPrice),
        },
        {
          key: "isActive",
          label: "Status",
          render: (plan) => (
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                plan.isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {plan.isActive ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
    />
  );
}
