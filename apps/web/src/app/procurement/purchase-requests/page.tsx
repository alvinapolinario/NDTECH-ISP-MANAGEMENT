"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchInventoryItems } from "@/hooks/use-inventory";
import {
  approvePurchaseRequest,
  createPurchaseRequest,
  deletePurchaseRequest,
  fetchSuppliers,
  rejectPurchaseRequest,
  updatePurchaseRequest,
  usePurchaseRequests,
} from "@/hooks/use-procurement";
import { useStaffByRole } from "@/hooks/use-staff";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import { formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { InventoryItem } from "@/types/inventory";
import type {
  PurchaseRequest,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
  Supplier,
} from "@/types/procurement";

type LineForm = {
  itemId: string;
  description: string;
  quantity: string;
  estimatedUnitCost: string;
  notes: string;
};

type RequestForm = {
  requestNumber: string;
  supplierId: string;
  status: PurchaseRequestStatus;
  priority: PurchaseRequestPriority;
  requestedBy: string;
  neededDate: string;
  purpose: string;
  notes: string;
  financeReviewerUserId: string;
  items: LineForm[];
};

const emptyLine: LineForm = {
  itemId: "",
  description: "",
  quantity: "1",
  estimatedUnitCost: "",
  notes: "",
};

const emptyForm: RequestForm = {
  requestNumber: "",
  supplierId: "",
  status: "draft",
  priority: "normal",
  requestedBy: "",
  neededDate: "",
  purpose: "",
  notes: "",
  financeReviewerUserId: "",
  items: [{ ...emptyLine }],
};

const statuses: Array<{ label: string; value: PurchaseRequestStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

const priorities: Array<{ label: string; value: PurchaseRequestPriority | "" }> = [
  { label: "All priorities", value: "" },
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function requestTotal(request: PurchaseRequest) {
  return request.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.estimatedUnitCost ?? 0),
    0,
  );
}

function toPayload(form: RequestForm) {
  return {
    requestNumber: form.requestNumber || null,
    supplierId: form.supplierId ? Number(form.supplierId) : null,
    status: form.status,
    priority: form.priority,
    requestedBy: form.requestedBy || null,
    neededDate: form.neededDate || null,
    purpose: form.purpose || null,
    notes: form.notes || null,
    financeReviewerUserId: form.financeReviewerUserId
      ? Number(form.financeReviewerUserId)
      : null,
    items: form.items.map((item) => ({
      itemId: Number(item.itemId),
      description: item.description || null,
      quantity: Number(item.quantity),
      estimatedUnitCost: item.estimatedUnitCost ? Number(item.estimatedUnitCost) : null,
      notes: item.notes || null,
    })),
  };
}

export default function PurchaseRequestsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchaseRequestStatus | "">("");
  const [priority, setPriority] = useState<PurchaseRequestPriority | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseRequest | null>(null);
  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => ({ search, status, priority, page, limit: 10 }), [page, priority, search, status]);
  const { data, loading, error, reload } = usePurchaseRequests(query);
  const { staff: financeStaff } = useStaffByRole(STAFF_ROLE_NAMES.FINANCE);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    const [supplierResponse, itemResponse] = await Promise.all([
      fetchSuppliers({ filter: "active", limit: 200 }),
      fetchInventoryItems({ filter: "active", limit: 200 }),
    ]);
    setSuppliers(supplierResponse.items);
    setItems(itemResponse.items);
  }

  useEffect(() => {
    loadLookups().catch(() => undefined);
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadLookups().catch(() => undefined);
  }

  function openEdit(request: PurchaseRequest) {
    setEditing(request);
    setForm({
      requestNumber: request.requestNumber,
      supplierId: request.supplierId ? String(request.supplierId) : "",
      status: request.status,
      priority: request.priority,
      requestedBy: request.requestedBy ?? "",
      neededDate: toDateInputValue(request.neededDate),
      purpose: request.purpose ?? "",
      notes: request.notes ?? "",
      financeReviewerUserId: request.financeReviewerUserId
        ? String(request.financeReviewerUserId)
        : "",
      items: request.items.map((item) => ({
        itemId: String(item.itemId),
        description: item.description ?? "",
        quantity: String(item.quantity),
        estimatedUnitCost: item.estimatedUnitCost ? String(item.estimatedUnitCost) : "",
        notes: item.notes ?? "",
      })),
    });
    setLocalError("");
    setFormOpen(true);
    loadLookups().catch(() => undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");
    try {
      if (editing) {
        await updatePurchaseRequest(editing.id, toPayload(form));
        setMessage("Purchase request updated.");
      } else {
        await createPurchaseRequest(toPayload(form));
        setMessage("Purchase request created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save purchase request");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setMessage("");
    setLocalError("");
    try {
      await action();
      setMessage(success);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to update purchase request");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(index: number, patch: Partial<LineForm>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Procurement</p>
          <h1 className="text-2xl font-semibold text-slate-950">Purchase Requests</h1>
          <p className="text-sm text-slate-600">Request materials and equipment before converting approved requests into purchase orders.</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create Request</button>
      </header>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search request, supplier, item, purpose, or notes" className="w-full rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={status} onChange={(nextValue) => { setStatus(nextValue as PurchaseRequestStatus | ""); setPage(1); }} includeEmptyOption={false} options={statuses} className="rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={priority} onChange={(nextValue) => { setPriority(nextValue as PurchaseRequestPriority | ""); setPage(1); }} includeEmptyOption={false} options={priorities} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Finance</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Needed</th><th className="px-4 py-3">Estimate</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {data.items.map((request) => (
                <tr key={request.id} className="border-b">
                  <td className="px-4 py-3"><div className="font-medium">{request.requestNumber}</div><div className="text-xs text-slate-500">{request.requestedBy ?? "Unassigned"}</div></td>
                  <td className="px-4 py-3">{request.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3">{request.financeReviewer?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{request.items.length} lines</td>
                  <td className="px-4 py-3">{titleCase(request.priority)}</td>
                  <td className="px-4 py-3"><StatusBadge status={request.status} /></td>
                  <td className="px-4 py-3">{formatDate(request.neededDate)}</td>
                  <td className="px-4 py-3">{formatMoney(requestTotal(request))}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                    {request.status !== "approved" ? <button onClick={() => runAction(() => approvePurchaseRequest(request.id), "Purchase request approved.")} className="rounded-md border border-emerald-600 px-2.5 py-1.5 text-xs text-emerald-700">Approve</button> : null}
                    {request.status !== "rejected" ? <button onClick={() => runAction(() => rejectPurchaseRequest(request.id, "Rejected from list"), "Purchase request rejected.")} className="rounded-md border border-amber-600 px-2.5 py-1.5 text-xs text-amber-700">Reject</button> : null}
                    <button onClick={() => openEdit(request)} className="rounded-md border px-2.5 py-1.5 text-xs">Edit</button>
                    <button disabled={saving} onClick={() => window.confirm(`Delete ${request.requestNumber}?`) && runAction(() => deletePurchaseRequest(request.id), "Purchase request deleted.")} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700">Delete</button>
                  </div></td>
                </tr>
              ))}
              {!data.items.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No purchase requests found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>

      <Modal open={formOpen} title={editing ? "Edit Purchase Request" : "Create Purchase Request"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">Request No.<input value={form.requestNumber} onChange={(e) => setForm((c) => ({ ...c, requestNumber: e.target.value }))} placeholder="Auto if blank" className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Supplier<SearchableSelect value={form.supplierId} onChange={(nextValue) => setForm((c) => ({ ...c, supplierId: nextValue }))} emptyOptionLabel="No supplier yet" options={suppliers.map((supplier) => ({ label: supplier.name, value: String(supplier.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Status<SearchableSelect value={form.status} onChange={(nextValue) => setForm((c) => ({ ...c, status: nextValue as PurchaseRequestStatus }))} includeEmptyOption={false} options={statuses.filter((s) => s.value)} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Priority<SearchableSelect value={form.priority} onChange={(nextValue) => setForm((c) => ({ ...c, priority: nextValue as PurchaseRequestPriority }))} includeEmptyOption={false} options={priorities.filter((p) => p.value)} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Requested By<input value={form.requestedBy} onChange={(e) => setForm((c) => ({ ...c, requestedBy: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Needed Date<input type="date" value={form.neededDate} onChange={(e) => setForm((c) => ({ ...c, neededDate: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">Finance Reviewer<SearchableSelect value={form.financeReviewerUserId} onChange={(nextValue) => setForm((c) => ({ ...c, financeReviewerUserId: nextValue }))} emptyOptionLabel="Unassigned" searchPlaceholder="Search finance staff..." options={financeStaff.map((member) => ({ label: `${member.name} · ${member.email}`, value: String(member.id) }))} className="rounded-md border px-3 py-2" /></label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">Purpose<textarea value={form.purpose} onChange={(e) => setForm((c) => ({ ...c, purpose: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label>
          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-2"><h3 className="text-sm font-semibold">Items</h3><button type="button" onClick={() => setForm((c) => ({ ...c, items: [...c.items, { ...emptyLine }] }))} className="rounded-md border px-2.5 py-1 text-xs">Add Line</button></div>
            <div className="flex flex-col gap-3 p-3">
              {form.items.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
                  <SearchableSelect required value={line.itemId} onChange={(nextValue) => updateLine(index, { itemId: nextValue })} emptyOptionLabel="Select item" options={items.map((item) => ({ label: `${item.code} - ${item.name}`, value: String(item.id) }))} className="rounded-md border px-2 py-2 text-sm md:col-span-2" />
                  <input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} placeholder="Qty" className="rounded-md border px-2 py-2 text-sm" />
                  <input type="number" min="0" step="0.01" value={line.estimatedUnitCost} onChange={(e) => updateLine(index, { estimatedUnitCost: e.target.value })} placeholder="Est. cost" className="rounded-md border px-2 py-2 text-sm" />
                  <button type="button" disabled={form.items.length <= 1} onClick={() => setForm((c) => ({ ...c, items: c.items.filter((_, i) => i !== index) }))} className="rounded-md border border-red-200 px-2 py-2 text-xs text-red-700 disabled:opacity-40">Remove</button>
                  <input value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} placeholder="Description" className="rounded-md border px-2 py-2 text-sm md:col-span-3" />
                  <input value={line.notes} onChange={(e) => updateLine(index, { notes: e.target.value })} placeholder="Notes" className="rounded-md border px-2 py-2 text-sm md:col-span-2" />
                </div>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save Request"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
