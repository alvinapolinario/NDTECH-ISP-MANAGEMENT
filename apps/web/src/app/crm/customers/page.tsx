"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CrudPage } from "@/components/admin/crud-page";
import { fetchCustomers } from "@/hooks/use-customers";
import { customerDisplayName, formatDate, toDateInputValue } from "@/lib/format";
import type { CustomerSummary } from "@/types/customer";

type Customer = CustomerSummary & {
  addresses?: unknown[];
};

function buildReferrerOptions(customers: CustomerSummary[], excludeId?: number) {
  return customers
    .filter((customer) => customer.id !== excludeId)
    .map((customer) => ({
      label: `${customer.accountNumber} · ${customerDisplayName(customer)}`,
      value: String(customer.id),
    }));
}

function mapReferrerSubmit(
  values: Record<string, unknown>,
  raw: Record<string, unknown> | undefined,
  isEdit: boolean,
) {
  const body: Record<string, unknown> = { ...values };
  const referrer = raw?.referredByCustomerId;

  if (referrer === "" || referrer === undefined || referrer === null) {
    if (isEdit) {
      body.referredByCustomerId = null;
    } else {
      delete body.referredByCustomerId;
    }
  } else {
    body.referredByCustomerId = Number(referrer);
  }

  return body;
}

type CustomersPageProps = {
  openFormOnMount?: boolean;
};

export default function CustomersPage({
  openFormOnMount = false,
}: CustomersPageProps) {
  const [referrers, setReferrers] = useState<CustomerSummary[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomers("", 500)
      .then((response) => setReferrers(response.items))
      .catch(() => setReferrers([]));
  }, []);

  const referrerOptions = useMemo(
    () => buildReferrerOptions(referrers, editingId ?? undefined),
    [editingId, referrers],
  );

  return (
    <CrudPage<Customer>
      sectionLabel="CRM"
      title="Customers"
      description="Create customer records, search accounts, and open profiles for address and document management."
      endpoint="/customers"
      formMode="modal"
      openFormOnMount={openFormOnMount}
      searchPlaceholder="Search name, account number, email, or mobile"
      filterOptions={[
        { label: "Lead", value: "lead" },
        { label: "Prospect", value: "prospect" },
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Disconnected", value: "disconnected" },
        { label: "Terminated", value: "terminated" },
      ]}
      initialForm={{ referredByCustomerId: "" }}
      onEditingChange={(item) => setEditingId(item?.id ?? null)}
      mapItemToForm={(item) => ({
          accountNumber: item.accountNumber,
          customerType: item.customerType,
          firstName: item.firstName ?? "",
          lastName: item.lastName ?? "",
          businessName: item.businessName ?? "",
          email: item.email ?? "",
          mobileNumber: item.mobileNumber,
          birthDate: toDateInputValue(item.birthDate),
          status: item.status,
          referredByCustomerId: item.referredByCustomerId
            ? String(item.referredByCustomerId)
            : "",
      })}
      transformSubmit={(values, editing, raw) => {
        const body = mapReferrerSubmit(values, raw, Boolean(editing));
        if (editing && body.referredByCustomerId === editing.id) {
          delete body.referredByCustomerId;
        }
        if (!body.birthDate) {
          if (editing) {
            body.birthDate = null;
          } else {
            delete body.birthDate;
          }
        }
        return body;
      }}
      fields={[
        { name: "accountNumber", label: "Account Number" },
        {
          name: "customerType",
          label: "Customer Type",
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
          name: "birthDate",
          label: "Birth Date",
          type: "date",
          placeholder: "For birthday billing promos",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Lead", value: "lead" },
            { label: "Prospect", value: "prospect" },
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
            { label: "Disconnected", value: "disconnected" },
            { label: "Terminated", value: "terminated" },
          ],
        },
        {
          name: "referredByCustomerId",
          label: "Referred By",
          type: "select",
          emptyOptionLabel: "No referrer",
          options: referrerOptions,
        },
      ]}
      columns={[
        { key: "accountNumber", label: "Account" },
        {
          key: "name",
          label: "Customer",
          render: (customer) => (
            <Link
              href={`/crm/customers/${customer.id}`}
              className="font-medium text-emerald-700 hover:underline"
            >
              {customerDisplayName(customer)}
            </Link>
          ),
        },
        { key: "customerType", label: "Type" },
        { key: "mobileNumber", label: "Mobile" },
        {
          key: "birthDate",
          label: "Birth Date",
          render: (customer) => formatDate(customer.birthDate),
        },
        {
          key: "referredByCustomer",
          label: "Referred By",
          render: (customer) =>
            customer.referredByCustomer
              ? customerDisplayName(customer.referredByCustomer)
              : "—",
        },
        {
          key: "status",
          label: "Status",
          render: (customer) => (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              {customer.status}
            </span>
          ),
        },
        {
          key: "addresses",
          label: "Addresses",
          render: (customer) => String(customer.addresses?.length ?? 0),
        },
      ]}
    />
  );
}
