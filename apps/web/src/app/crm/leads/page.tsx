"use client";

import Link from "next/link";
import { CrudPage } from "@/components/admin/crud-page";
import type { CustomerSummary } from "@/types/customer";

function displayName(customer: CustomerSummary) {
  return (
    customer.businessName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    "Unnamed Lead"
  );
}

export default function LeadsPage() {
  return (
    <CrudPage<CustomerSummary>
      sectionLabel="CRM"
      title="Leads / Prospects"
      description="Capture sales leads, qualify prospects, and convert them into active customers when ready."
      endpoint="/customers"
      formMode="modal"
      searchPlaceholder="Search lead, prospect, mobile, or email"
      filterOptions={[
        { label: "Lead", value: "lead" },
        { label: "Prospect", value: "prospect" },
      ]}
      initialFilter="lead"
      initialForm={{ status: "lead", customerType: "residential" }}
      fields={[
        { name: "accountNumber", label: "Lead Number" },
        {
          name: "customerType",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { label: "Residential", value: "residential" },
            { label: "Business", value: "business" },
            { label: "Government", value: "government" },
          ],
        },
        { name: "firstName", label: "First Name" },
        { name: "lastName", label: "Last Name" },
        { name: "businessName", label: "Business Name" },
        { name: "email", label: "Email", type: "email" },
        { name: "mobileNumber", label: "Mobile Number", required: true },
        {
          name: "status",
          label: "Stage",
          type: "select",
          options: [
            { label: "Lead", value: "lead" },
            { label: "Prospect", value: "prospect" },
            { label: "Active Customer", value: "active" },
          ],
        },
      ]}
      columns={[
        { key: "accountNumber", label: "Lead No." },
        {
          key: "name",
          label: "Name",
          render: (customer) => (
            <Link href={`/crm/customers/${customer.id}`} className="font-medium text-emerald-700 hover:underline">
              {displayName(customer)}
            </Link>
          ),
        },
        { key: "customerType", label: "Type" },
        { key: "mobileNumber", label: "Mobile" },
        { key: "email", label: "Email" },
        {
          key: "status",
          label: "Stage",
          render: (customer) => (
            <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium capitalize text-sky-700">
              {customer.status}
            </span>
          ),
        },
      ]}
    />
  );
}
