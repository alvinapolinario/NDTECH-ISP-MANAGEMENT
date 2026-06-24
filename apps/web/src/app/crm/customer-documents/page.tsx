"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createCustomerDocument, deleteCustomerDocument, fetchCustomerDocuments, fetchCustomers } from "@/hooks/use-customers";
import { customerDisplayName, formatDate } from "@/lib/format";
import type { CustomerDocument, CustomerSummary } from "@/types/customer";

const emptyForm = { customerId: "", documentType: "", filePath: "" };

export default function CustomerDocumentsPage() {
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const limit = 10;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchCustomerDocuments({ search, page, limit });
      setDocuments(response.items);
      setTotal(response.meta.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchCustomers("", 500).then((response) => setCustomers(response.items)).catch(() => undefined);
  }, []);

  const customerOptions = useMemo(() => customers, [customers]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await createCustomerDocument({
        customerId: Number(form.customerId),
        documentType: form.documentType,
        filePath: form.filePath,
      });
      setMessage("Customer document added.");
      setForm(emptyForm);
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save document");
    } finally {
      setLoading(false);
    }
  }

  async function remove(document: CustomerDocument) {
    if (!window.confirm(`Delete ${document.documentType}?`)) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await deleteCustomerDocument(document.id);
      setMessage("Customer document deleted.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">CRM</p>
          <h1 className="text-2xl font-semibold text-slate-950">Customer Documents</h1>
          <p className="text-sm text-slate-600">Browse and register document references across all customer accounts.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setFormOpen(true); }} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Add Document</button>
      </header>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search document type, path, account, or customer" className="w-full rounded-md border px-3 py-2 text-sm" />
          <button onClick={() => { setPage(1); load(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Document Type</th><th className="px-4 py-3">File Path</th><th className="px-4 py-3">Uploaded By</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-b">
                  <td className="px-4 py-3">{document.customer ? <Link href={`/crm/customers/${document.customer.id}`} className="font-medium text-emerald-700 hover:underline">{document.customer.accountNumber} - {customerDisplayName(document.customer)}</Link> : document.customerId}</td>
                  <td className="px-4 py-3">{document.documentType}</td>
                  <td className="px-4 py-3">{document.filePath}</td>
                  <td className="px-4 py-3">{document.uploadedBy?.name ?? "-"}</td>
                  <td className="px-4 py-3">{formatDate(document.createdAt)}</td>
                  <td className="px-4 py-3"><button onClick={() => remove(document)} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700">Delete</button></td>
                </tr>
              ))}
              {!documents.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No customer documents found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {page} of {totalPages} - {total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>

      <Modal open={formOpen} title="Add Customer Document" onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">Customer<SearchableSelect required value={form.customerId} onChange={(nextValue) => setForm((current) => ({ ...current, customerId: nextValue }))} emptyOptionLabel="Select customer" options={customerOptions.map((customer) => ({ label: `${customer.accountNumber} - ${customerDisplayName(customer)}`, value: String(customer.id) }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Document Type<input required value={form.documentType} onChange={(event) => setForm((current) => ({ ...current, documentType: event.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">File Path<input required value={form.filePath} onChange={(event) => setForm((current) => ({ ...current, filePath: event.target.value }))} placeholder="/uploads/customers/file.pdf" className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={loading} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{loading ? "Saving..." : "Save Document"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
