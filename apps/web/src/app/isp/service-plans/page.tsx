"use client";

import { useMemo, useState } from "react";
import { CrudPage, FieldConfig } from "@/components/admin/crud-page";
import {
  buildRadiusProfileSelectOptions,
  buildServicePlanSeedFromProfile,
  RadiusProfilesPanel,
  useRadiusProfiles,
  type RadiusProfileWithSync,
} from "@/components/isp/radius-profiles-panel";

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
  const [seedCreateForm, setSeedCreateForm] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [profilesRefreshKey, setProfilesRefreshKey] = useState(0);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);

  const { profiles, source: radiusSource } =
    useRadiusProfiles(profilesRefreshKey);

  const radiusProfileOptions = useMemo(
    () =>
      buildRadiusProfileSelectOptions(
        profiles,
        (seedCreateForm?.pppoeProfileName as string | undefined) ??
          editingPlan?.pppoeProfileName,
      ),
    [profiles, seedCreateForm, editingPlan],
  );

  const formFields = useMemo<FieldConfig[]>(
    () => [
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
        label: "RADIUS Profile",
        type: "select",
        emptyOptionLabel:
          radiusSource === "unconfigured"
            ? "RADIUS not configured"
            : radiusProfileOptions.length
              ? "Select NDRadius profile"
              : "No profiles in NDRadius",
        options: radiusProfileOptions,
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
      },
    ],
    [radiusProfileOptions, radiusSource],
  );

  function handleCreateBillingPlan(profile: RadiusProfileWithSync) {
    setSeedCreateForm(buildServicePlanSeedFromProfile(profile));
  }

  return (
    <div className="flex flex-col gap-6">
      <RadiusProfilesPanel
        refreshKey={profilesRefreshKey}
        onCreateBillingPlan={handleCreateBillingPlan}
      />

      <CrudPage<ServicePlan>
        sectionLabel="ISP Services"
        title="Service Plans"
        description="Billing packages linked to NDRadius profiles. Set the monthly price here; speeds and RADIUS group come from the profile above."
        endpoint="/service-plans"
        formMode="modal"
        searchPlaceholder="Search plan code, name, or description"
        filterOptions={[
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
        initialForm={{ isActive: true }}
        seedCreateForm={seedCreateForm}
        onSeedCreateFormConsumed={() => setSeedCreateForm(null)}
        onEditingChange={(item) => setEditingPlan(item)}
        onSaved={() => setProfilesRefreshKey((current) => current + 1)}
        fields={formFields}
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
          pppoeProfileName: values.pppoeProfileName || undefined,
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
            key: "pppoeProfileName",
            label: "RADIUS Profile",
            render: (plan) => plan.pppoeProfileName ?? "—",
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
    </div>
  );
}
