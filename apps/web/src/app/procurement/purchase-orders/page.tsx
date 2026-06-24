"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchInventoryItems } from "@/hooks/use-inventory";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  fetchPurchaseRequests,
  fetchSuppliers,
  issuePurchaseOrder,
  updatePurchaseOrder,
  usePurchaseOrders,
} from "@/hooks/use-procurement";
import { formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { InventoryItem } from "@/types/inventory";
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseRequest, Supplier } from "@/types/procurement";

type LineForm = { itemId: string; description: string; quantity: string; unitCost: string; notes: string };
type OrderForm = {
  poNumber: string;
  supplierId: string;
  purchaseRequestId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string;
  paymentTerms: string;
  deliveryAddress: string;
  notes: string;
  items: LineForm[];
};

const emptyLine: LineForm = { itemId: "", description: "", quantity: "1", unitCost: "0", notes: "" };
const emptyForm: OrderForm = {
  poNumber: "",
  supplierId: "",
  purchaseRequestId: "",
  status: "draft",
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: "",
  paymentTerms: "",
  deliveryAddress: "",
  notes: "",
  items: [{ ...emptyLine }],
};
const statuses: Array<{ label: string; value: PurchaseOrderStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Issued", value: "issued" },
  { label: "Partially Received", value: "partially_received" },
  { label: "Received", value: "received" },
  { label: "Cancelled", value: "cancelled" },
];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function orderTotal(order: PurchaseOrder) {
  return order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0);
}

function receivedText(order: PurchaseOrder) {
  const received = order.items.reduce((sum, item) => sum + Number(item.receivedQuantity), 0);
  const ordered = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  return `${received} / ${ordered}`;
}

function toPayload(form: OrderForm) {
  return {
    poNumber: form.poNumber || null,
    supplierId: Number(form.supplierId),
    purchaseRequestId: form.purchaseRequestId ? Number(form.purchaseRequestId) : null,
    status: form.status,
    orderDate: form.orderDate || null,
    expectedDate: form.expectedDate || null,
    paymentTerms: form.paymentTerms || null,
    deliveryAddress: form.deliveryAddress || null,
    notes: form.notes || null,
    items: form.items.map((item) => ({
      itemId: Number(item.itemId),
      description: item.description || null,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      notes: item.notes || null,
    })),
  };
}

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => ({ search, status, page, limit: 10 }), [page, search, status]);
  const { data, loading, error, reload } = usePurchaseOrders(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    const [supplierResponse, requestResponse, itemResponse] = await Promise.all([
      fetchSuppliers({ filter: "active", limit: 200 }),
      fetchPurchaseRequests({ status: "approved", limit: 200 }),
      fetchInventoryItems({ filter: "active", limit: 200 }),
    ]);
    setSuppliers(supplierResponse.items);
    setRequests(requestResponse.items);
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

  function openEdit(order: PurchaseOrder) {
    setEditing(order);
    setForm({
      poNumber: order.poNumber,
      supplierId: String(order.supplierId),
      purchaseRequestId: order.purchaseRequestId ? String(order.purchaseRequestId) : "",
      status: order.status,
      orderDate: toDateInputValue(order.orderDate),
      expectedDate: toDateInputValue(order.expectedDate),
      paymentTerms: order.paymentTerms ?? "",
      deliveryAddress: order.deliveryAddress ?? "",
      notes: order.notes ?? "",
      items: order.items.map((item) => ({
        itemId: String(item.itemId),
        description: item.description ?? "",
        quantity: String(item.quantity),
        unitCost: String(item.unitCost),
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
        await updatePurchaseOrder(editing.id, toPayload(form));
        setMessage("Purchase order updated.");
      } else {
        await createPurchaseOrder(toPayload(form));
        setMessage("Purchase order created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save purchase order");
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
      setLocalError(caught instanceof Error ? caught.message : "Unable to update purchase order");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(index: number, patch: Partial<LineForm>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Procurement</p>
          <h1 className="text-2xl font-semibold text-slate-950">Purchase Orders</h1>
          <p className="text-sm text-slate-600">Issue supplier orders and track ordered versus received quantities.</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create PO</button>
      </header>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO, supplier, request, item, or notes" className="w-full rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={status} onChange={(nextValue) => { setStatus(nextValue as PurchaseOrderStatus | ""); setPage(1); }} includeEmptyOption={false} options={statuses} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">PO No.</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ordered / Received</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {data.items.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="px-4 py-3"><div className="font-medium">{order.poNumber}</div><div className="text-xs text-slate-500">{formatDate(order.orderDate)}</div></td>
                  <td className="px-4 py-3">{order.supplier.name}</td>
                  <td className="px-4 py-3">{order.purchaseRequest?.requestNumber ?? "-"}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3">{receivedText(order)}</td>
                  <td className="px-4 py-3">{formatDate(order.expectedDate)}</td>
                  <td className="px-4 py-3">{formatMoney(orderTotal(order))}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                    {order.status === "draft" ? <button onClick={() => runAction(() => issuePurchaseOrder(order.id), "Purchase order issued.")} className="rounded-md border border-emerald-600 px-2.5 py-1.5 text-xs text-emerald-700">Issue</button> : null}
                    {order.status !== "received" && order.status !== "cancelled" ? <button onClick={() => runAction(() => cancelPurchaseOrder(order.id, "Cancelled from list"), "Purchase order cancelled.")} className="rounded-md border border-amber-600 px-2.5 py-1.5 text-xs text-amber-700">Cancel</button> : null}
                    <button onClick={() => openEdit(order)} className="rounded-md border px-2.5 py-1.5 text-xs">Edit</button>
                    <button disabled={saving} onClick={() => window.confirm(`Delete ${order.poNumber}?`) && runAction(() => deletePurchaseOrder(order.id), "Purchase order deleted.")} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700">Delete</button>
                  </div></td>
                </tr>
              ))}
              {!data.items.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No purchase orders found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>

      <Modal open={formOpen} title={editing ? "Edit Purchase Order" : "Create Purchase Order"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">PO No.<input value={form.poNumber} onChange={(e) => setForm((c) => ({ ...c, poNumber: e.target.value }))} placeholder="Auto if blank" className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Supplier<SearchableSelect required value={form.supplierId} onChange={(nextValue) => setForm((c) => ({ ...c, supplierId: nextValue }))} emptyOptionLabel="Select supplier" options={suppliers.map((supplier) => ({ label: supplier.name, value: String(supplier.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Approved Request<SearchableSelect value={form.purchaseRequestId} onChange={(nextValue) => setForm((c) => ({ ...c, purchaseRequestId: nextValue }))} emptyOptionLabel="No source request" options={requests.map((request) => ({ label: request.requestNumber, value: String(request.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Status<SearchableSelect value={form.status} onChange={(nextValue) => setForm((c) => ({ ...c, status: nextValue as PurchaseOrderStatus }))} includeEmptyOption={false} options={statuses.filter((s) => s.value)} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Order Date<input type="date" value={form.orderDate} onChange={(e) => setForm((c) => ({ ...c, orderDate: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Expected Date<input type="date" value={form.expectedDate} onChange={(e) => setForm((c) => ({ ...c, expectedDate: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">Payment Terms<input value={form.paymentTerms} onChange={(e) => setForm((c) => ({ ...c, paymentTerms: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Delivery Address<input value={form.deliveryAddress} onChange={(e) => setForm((c) => ({ ...c, deliveryAddress: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          </div>
          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-2"><h3 className="text-sm font-semibold">Items</h3><button type="button" onClick={() => setForm((c) => ({ ...c, items: [...c.items, { ...emptyLine }] }))} className="rounded-md border px-2.5 py-1 text-xs">Add Line</button></div>
            <div className="flex flex-col gap-3 p-3">
              {form.items.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
                  <SearchableSelect required value={line.itemId} onChange={(nextValue) => updateLine(index, { itemId: nextValue })} emptyOptionLabel="Select item" options={items.map((item) => ({ label: `${item.code} - ${item.name}`, value: String(item.id) }))} className="rounded-md border px-2 py-2 text-sm md:col-span-2" />
                  <input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} placeholder="Qty" className="rounded-md border px-2 py-2 text-sm" />
                  <input required type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(index, { unitCost: e.target.value })} placeholder="Unit cost" className="rounded-md border px-2 py-2 text-sm" />
                  <button type="button" disabled={form.items.length <= 1} onClick={() => setForm((c) => ({ ...c, items: c.items.filter((_, i) => i !== index) }))} className="rounded-md border border-red-200 px-2 py-2 text-xs text-red-700 disabled:opacity-40">Remove</button>
                  <input value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} placeholder="Description" className="rounded-md border px-2 py-2 text-sm md:col-span-3" />
                  <input value={line.notes} onChange={(e) => updateLine(index, { notes: e.target.value })} placeholder="Notes" className="rounded-md border px-2 py-2 text-sm md:col-span-2" />
                </div>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save PO"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
