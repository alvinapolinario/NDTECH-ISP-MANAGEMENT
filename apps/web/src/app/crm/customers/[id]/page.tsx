"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiRequest } from "@/lib/api";
import { fetchCustomers } from "@/hooks/use-customers";
import { customerDisplayName, formatDate } from "@/lib/format";
import type { CustomerSummary } from "@/types/customer";

type CustomerAddress = {
  id: number;
  barangayId?: number | null;
  addressType: string;
  street: string;
  barangay: string;
  municipality: string;
  province: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type Customer = {
  id: number;
  accountNumber: string;
  customerType: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email?: string;
  mobileNumber: string;
  birthDate?: string | null;
  status: string;
  referredByCustomerId?: number | null;
  referredByCustomer?: CustomerSummary | null;
  addresses: CustomerAddress[];
  documents: unknown[];
};

type AddressForm = {
  addressType: string;
  street: string;
  barangayId: string;
  barangay: string;
  municipality: string;
  province: string;
  latLong: string;
};

type BarangayOption = {
  id: number;
  name: string;
  municipality: {
    id: number;
    name: string;
    province: {
      id: number;
      name: string;
    };
  };
};

type ListResponse<T> = {
  items: T[];
};

function customerName(customer: Customer) {
  return (
    customer.businessName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    "Unnamed Customer"
  );
}

function toLatLong(address: CustomerAddress) {
  if (address.latitude == null || address.longitude == null) return "";
  return `${address.latitude}, ${address.longitude}`;
}

function parseLatLong(value: string) {
  if (!value.trim()) return {};
  const [latitudeRaw, longitudeRaw] = value.split(",").map((part) => part.trim());
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Map location must be formatted as latitude, longitude.");
  }

  return { latitude, longitude };
}

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>({
    addressType: "installation",
    street: "",
    barangayId: "",
    barangay: "",
    municipality: "",
    province: "",
    latLong: "",
  });
  const [barangaySearch, setBarangaySearch] = useState("");
  const [barangays, setBarangays] = useState<BarangayOption[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [referrers, setReferrers] = useState<CustomerSummary[]>([]);
  const [referredByCustomerId, setReferredByCustomerId] = useState("");
  const [savingReferrer, setSavingReferrer] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [referrerModalOpen, setReferrerModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  useEffect(() => {
    params.then((resolved) => setCustomerId(resolved.id));
  }, [params]);

  async function load(id = customerId) {
    if (!id) return;
    setError("");
    try {
      const loaded = await apiRequest<Customer>(`/customers/${id}`);
      setCustomer(loaded);
      setReferredByCustomerId(
        loaded.referredByCustomerId ? String(loaded.referredByCustomerId) : "",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load customer");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    fetchCustomers("", 500)
      .then((response) => setReferrers(response.items))
      .catch(() => setReferrers([]));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ limit: "100" });
      if (barangaySearch) params.set("search", barangaySearch);

      apiRequest<ListResponse<BarangayOption>>(
        `/locations/barangays?${params.toString()}`,
      )
        .then((response) => setBarangays(response.items))
        .catch(() => setBarangays([]));
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [barangaySearch]);

  function resetAddressForm() {
    setEditingAddress(null);
    setAddressForm({
      addressType: "installation",
      street: "",
      barangayId: "",
      barangay: "",
      municipality: "",
      province: "",
      latLong: "",
    });
    setBarangaySearch("");
  }

  function openReferrerModal() {
    if (customer) {
      setReferredByCustomerId(
        customer.referredByCustomerId ? String(customer.referredByCustomerId) : "",
      );
    }
    setReferrerModalOpen(true);
  }

  function closeReferrerModal() {
    setReferrerModalOpen(false);
  }

  function openAddAddress() {
    resetAddressForm();
    setAddressModalOpen(true);
  }

  function openEditAddress(address: CustomerAddress) {
    setEditingAddress(address);
    setAddressForm({
      addressType: address.addressType,
      street: address.street,
      barangayId: address.barangayId ? String(address.barangayId) : "",
      barangay: address.barangay,
      municipality: address.municipality,
      province: address.province,
      latLong: toLatLong(address),
    });
    setBarangaySearch(address.barangay);
    setAddressModalOpen(true);
  }

  function closeAddressModal() {
    setAddressModalOpen(false);
    resetAddressForm();
  }

  function selectBarangay(barangayId: string) {
    const barangay = barangays.find((item) => String(item.id) === barangayId);

    setAddressForm((current) => ({
      ...current,
      barangayId,
      barangay: barangay?.name ?? current.barangay,
      municipality: barangay?.municipality.name ?? current.municipality,
      province: barangay?.municipality.province.name ?? current.province,
    }));
  }

  async function saveReferrer(event: FormEvent) {
    event.preventDefault();
    if (!customerId) return;

    setSavingReferrer(true);
    setMessage("");
    setError("");

    try {
      await apiRequest(`/customers/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          referredByCustomerId: referredByCustomerId
            ? Number(referredByCustomerId)
            : null,
        }),
      });
      setMessage("Referrer updated.");
      closeReferrerModal();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update referrer");
    } finally {
      setSavingReferrer(false);
    }
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    setSavingAddress(true);
    setMessage("");
    setError("");

    try {
      const location = parseLatLong(addressForm.latLong);
      const body = {
        addressType: addressForm.addressType,
        street: addressForm.street,
        barangayId: addressForm.barangayId
          ? Number(addressForm.barangayId)
          : undefined,
        barangay: addressForm.barangay,
        municipality: addressForm.municipality,
        province: addressForm.province,
        ...location,
      };

      if (editingAddress) {
        await apiRequest(`/customer-addresses/${editingAddress.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setMessage("Address updated.");
      } else {
        await apiRequest(`/customers/${customerId}/addresses`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage("Address added.");
      }

      closeAddressModal();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save address");
    } finally {
      setSavingAddress(false);
    }
  }

  async function deleteAddress(address: CustomerAddress) {
    if (!window.confirm("Delete this address?")) return;
    await apiRequest(`/customer-addresses/${address.id}`, { method: "DELETE" });
    setMessage("Address deleted.");
    await load();
  }

  if (!customer) {
    return (
      <section className="rounded-md border border-emerald-900/10 bg-white p-5 text-sm text-slate-600">
        {error || "Loading customer profile..."}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          CRM
        </p>
        <h1 className="text-2xl font-semibold">{customerName(customer)}</h1>
        <p className="text-sm text-slate-600">
          {customer.accountNumber} · {customer.customerType} · {customer.status}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/crm/customers"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Back to Customers
          </Link>
          <Link
            href={`/crm/customers/${customer.id}/documents`}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Documents
          </Link>
        </div>
      </header>

      {message ? (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold">Customer Details</h2>
          <button
            type="button"
            onClick={openReferrerModal}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Update Referrer
          </button>
        </div>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">Mobile</dt>
            <dd className="font-medium">{customer.mobileNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium">{customer.email || "None"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Birth Date</dt>
            <dd className="font-medium">{formatDate(customer.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Documents</dt>
            <dd className="font-medium">{customer.documents.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Referred By</dt>
            <dd className="font-medium">
              {customer.referredByCustomer
                ? `${customer.referredByCustomer.accountNumber} · ${customerDisplayName(customer.referredByCustomer)}`
                : "No referrer"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-semibold">Addresses</div>
          <button
            type="button"
            onClick={openAddAddress}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Add Address
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Lat, Long</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customer.addresses.map((address) => (
                <tr key={address.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{address.addressType}</td>
                  <td className="px-4 py-3">
                    {address.street}, {address.barangay},{" "}
                    {address.municipality}, {address.province}
                  </td>
                  <td className="px-4 py-3">{toLatLong(address) || "None"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditAddress(address)}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAddress(address)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!customer.addresses.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No addresses yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={referrerModalOpen}
        title="Update Referrer"
        description="Link this customer to the account that referred them."
        onClose={closeReferrerModal}
      >
        <form onSubmit={saveReferrer} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Referred By</span>
            <SearchableSelect
              value={referredByCustomerId}
              onChange={setReferredByCustomerId}
              emptyOptionLabel="No referrer"
              searchPlaceholder="Search referrers..."
              options={referrers
                .filter((referrer) => referrer.id !== customer.id)
                .map((referrer) => ({
                  label: `${referrer.accountNumber} · ${customerDisplayName(referrer)}`,
                  value: String(referrer.id),
                }))}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeReferrerModal}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingReferrer}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {savingReferrer ? "Saving..." : "Save Referrer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={addressModalOpen}
        title={editingAddress ? "Edit Address" : "Add Address"}
        description="Installation and billing addresses use barangay lookup for municipality and province."
        onClose={closeAddressModal}
      >
        <form onSubmit={saveAddress} className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Address Type</span>
              <SearchableSelect
                value={addressForm.addressType}
                onChange={(nextValue) =>
                  setAddressForm((current) => ({
                    ...current,
                    addressType: nextValue,
                  }))
                }
                includeEmptyOption={false}
                options={[
                  { label: "Installation", value: "installation" },
                  { label: "Billing", value: "billing" },
                ]}
                className="rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Street</span>
              <input
                required
                value={addressForm.street}
                onChange={(event) =>
                  setAddressForm((current) => ({
                    ...current,
                    street: event.target.value,
                  }))
                }
                className="rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Search Barangay</span>
              <input
                value={barangaySearch}
                onChange={(event) => setBarangaySearch(event.target.value)}
                placeholder="Type barangay, municipality, or province"
                className="rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Barangay</span>
              <SearchableSelect
                required
                value={addressForm.barangayId}
                onChange={(nextValue) => selectBarangay(nextValue)}
                emptyOptionLabel="Select barangay"
                options={barangays.map((barangay) => ({
                  label: `${barangay.name}, ${barangay.municipality.name}, ${barangay.municipality.province.name}`,
                  value: String(barangay.id),
                }))}
                className="rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            {["municipality", "province"].map((field) => (
              <label key={field} className="flex flex-col gap-1 text-sm">
                <span className="font-medium capitalize text-slate-700">
                  {field}
                </span>
                <input
                  required
                  value={String(addressForm[field as keyof AddressForm])}
                  readOnly
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">
                Map Location / Lat-Long
              </span>
              <input
                value={addressForm.latLong}
                onChange={(event) =>
                  setAddressForm((current) => ({
                    ...current,
                    latLong: event.target.value,
                  }))
                }
                placeholder="14.5995, 120.9842"
                className="rounded-md border border-slate-200 px-3 py-2"
              />
              <span className="text-xs text-slate-500">
                Enter latitude and longitude in one field, separated by comma.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAddressModal}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAddress}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {savingAddress
                ? "Saving..."
                : editingAddress
                  ? "Save Address"
                  : "Add Address"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
