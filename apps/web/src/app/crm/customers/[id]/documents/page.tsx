"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type CustomerDocument = {
  id: number;
  documentType: string;
  filePath: string;
  createdAt: string;
  uploadedBy?: { name: string };
};

type Customer = {
  id: number;
  accountNumber: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
};

function customerName(customer: Customer) {
  return (
    customer.businessName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.accountNumber
  );
}

export default function CustomerDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [form, setForm] = useState({ documentType: "", filePath: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((resolved) => setCustomerId(resolved.id));
  }, [params]);

  async function load(id = customerId) {
    if (!id) return;
    setError("");
    try {
      const loadedCustomer = await apiRequest<Customer>(`/customers/${id}`);
      const loadedDocuments = await apiRequest<CustomerDocument[]>(
        `/customers/${id}/documents`,
      );
      setCustomer(loadedCustomer);
      setDocuments(loadedDocuments);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load documents");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await apiRequest(`/customers/${customerId}/documents`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ documentType: "", filePath: "" });
      setMessage("Document placeholder added.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add document");
    }
  }

  async function remove(document: CustomerDocument) {
    if (!window.confirm("Delete this document placeholder?")) return;
    await apiRequest(`/customer-documents/${document.id}`, { method: "DELETE" });
    setMessage("Document deleted.");
    await load();
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          CRM
        </p>
        <h1 className="text-2xl font-semibold">Customer Documents</h1>
        <p className="text-sm text-slate-600">
          {customer ? customerName(customer) : "Loading customer..."}
        </p>
        <Link
          href={`/crm/customers/${customerId}`}
          className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Back to Profile
        </Link>
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

      <form
        onSubmit={submit}
        className="rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 text-sm font-semibold">Upload Placeholder</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Document Type</span>
            <input
              required
              value={form.documentType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  documentType: event.target.value,
                }))
              }
              placeholder="Valid ID, Contract, Proof of Billing"
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">File Path</span>
            <input
              required
              value={form.filePath}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  filePath: event.target.value,
                }))
              }
              placeholder="/uploads/customers/sample.pdf"
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <button className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Add Document
        </button>
      </form>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">
          Documents
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{document.documentType}</td>
                  <td className="px-4 py-3">{document.filePath}</td>
                  <td className="px-4 py-3">
                    {document.uploadedBy?.name ?? "Admin"}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(document.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => remove(document)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!documents.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No documents yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
