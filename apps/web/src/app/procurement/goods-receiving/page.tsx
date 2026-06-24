"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchWarehouses } from "@/hooks/use-inventory";
import {
  createGoodsReceipt,
  fetchPurchaseOrders,
  useGoodsReceipts,
} from "@/hooks/use-procurement";
import { formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { Warehouse } from "@/types/inventory";
import type { GoodsReceiptStatus, PurchaseOrder } from "@/types/procurement";

type ReceiptLineForm = {
  purchaseOrderItemId: string;
  itemLabel: string;
  remaining: number;
  quantityReceived: string;
  unitCost: string;
  notes: string;
};

type ReceiptForm = {
  receiptNumber: string;
  purchaseOrderId: string;
  warehouseId: string;
  receivedDate: string;
  receivedBy: string;
  deliveryReceiptNo: string;
  notes: string;
  items: ReceiptLineForm[];
};

const emptyForm: ReceiptForm = {
  receiptNumber: "",
  purchaseOrderId: "",
  warehouseId: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  receivedBy: "",
  deliveryReceiptNo: "",
  notes: "",
  items: [],
};

const statuses: Array<{ label: string; value: GoodsReceiptStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Received", value: "received" },
  { label: "Cancelled", value: "cancelled" },
];

function receiptTotal(receipt: { items: Array<{ quantityReceived: string | number; unitCost: string | number }> }) {
  return receipt.items.reduce((sum, item) => sum + Number(item.quantityReceived) * Number(item.unitCost), 0);
}

function toPayload(form: ReceiptForm) {
  return {
    receiptNumber: form.receiptNumber || null,
    purchaseOrderId: Number(form.purchaseOrderId),
    warehouseId: Number(form.warehouseId),
    receivedDate: form.receivedDate || null,
    receivedBy: form.receivedBy || null,
    deliveryReceiptNo: form.deliveryReceiptNo || null,
    notes: form.notes || null,
    items: form.items
      .filter((item) => Number(item.quantityReceived) > 0)
      .map((item) => ({
        purchaseOrderItemId: Number(item.purchaseOrderItemId),
        quantityReceived: Number(item.quantityReceived),
        unitCost: item.unitCost ? Number(item.unitCost) : null,
        notes: item.notes || null,
      })),
  };
}

export default function GoodsReceivingPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<GoodsReceiptStatus | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ReceiptForm>(emptyForm);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => ({ search, status, page, limit: 10 }), [page, search, status]);
  const { data, loading, error, reload } = useGoodsReceipts(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    const [orderResponse, warehouseResponse] = await Promise.all([
      fetchPurchaseOrders({ limit: 200 }),
      fetchWarehouses({ filter: "active", limit: 200 }),
    ]);
    setOrders(orderResponse.items.filter((order) => ["issued", "partially_received"].includes(order.status)));
    setWarehouses(warehouseResponse.items);
  }

  useEffect(() => {
    loadLookups().catch(() => undefined);
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadLookups().catch(() => undefined);
  }

  function setSelectedOrder(orderId: string) {
    const order = orders.find((item) => String(item.id) === orderId);
    setForm((current) => ({
      ...current,
      purchaseOrderId: orderId,
      items: order
        ? order.items
            .map((line) => {
              const remaining = Number(line.quantity) - Number(line.receivedQuantity);
              return {
                purchaseOrderItemId: String(line.id),
                itemLabel: `${line.item.code} - ${line.item.name}`,
                remaining,
                quantityReceived: remaining > 0 ? String(remaining) : "0",
                unitCost: String(line.unitCost),
                notes: "",
              };
            })
            .filter((line) => line.remaining > 0)
        : [],
    }));
  }

  function updateLine(index: number, patch: Partial<ReceiptLineForm>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");
    try {
      const payload = toPayload(form);
      if (!payload.items.length) throw new Error("Enter at least one received quantity.");
      await createGoodsReceipt(payload);
      setMessage("Goods receipt saved and inventory stock updated.");
      setFormOpen(false);
      await Promise.all([reload(), loadLookups()]);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save goods receipt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Procurement</p>
          <h1 className="text-2xl font-semibold text-slate-950">Goods Receiving</h1>
          <p className="text-sm text-slate-600">Receive purchase order items into warehouse inventory.</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Receive Goods</button>
      </header>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search receipt, PO, supplier, warehouse, item, or DR no." className="w-full rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={status} onChange={(nextValue) => { setStatus(nextValue as GoodsReceiptStatus | ""); setPage(1); }} includeEmptyOption={false} options={statuses} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">PO No.</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Lines</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Received By</th></tr></thead>
            <tbody>
              {data.items.map((receipt) => (
                <tr key={receipt.id} className="border-b">
                  <td className="px-4 py-3"><div className="font-medium">{receipt.receiptNumber}</div><div className="text-xs text-slate-500">{formatDate(receipt.receivedDate)}</div></td>
                  <td className="px-4 py-3">{receipt.purchaseOrder.poNumber}</td>
                  <td className="px-4 py-3">{receipt.supplier.name}</td>
                  <td className="px-4 py-3">{receipt.warehouse.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={receipt.status} /></td>
                  <td className="px-4 py-3">{receipt.items.length} lines</td>
                  <td className="px-4 py-3">{formatMoney(receiptTotal(receipt))}</td>
                  <td className="px-4 py-3">{receipt.receivedBy ?? "-"}</td>
                </tr>
              ))}
              {!data.items.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No goods receipts found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>

      <Modal open={formOpen} title="Receive Goods" onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">Receipt No.<input value={form.receiptNumber} onChange={(e) => setForm((c) => ({ ...c, receiptNumber: e.target.value }))} placeholder="Auto if blank" className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Purchase Order<SearchableSelect required value={form.purchaseOrderId} onChange={(nextValue) => setSelectedOrder(nextValue)} emptyOptionLabel="Select PO" options={orders.map((order) => ({ label: `${order.poNumber} - ${order.supplier.name}`, value: String(order.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Warehouse<SearchableSelect required value={form.warehouseId} onChange={(nextValue) => setForm((c) => ({ ...c, warehouseId: nextValue }))} emptyOptionLabel="Select warehouse" options={warehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Received Date<input type="date" value={form.receivedDate} onChange={(e) => setForm((c) => ({ ...c, receivedDate: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Received By<input value={form.receivedBy} onChange={(e) => setForm((c) => ({ ...c, receivedBy: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Delivery Receipt No.<input value={form.deliveryReceiptNo} onChange={(e) => setForm((c) => ({ ...c, deliveryReceiptNo: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          </div>
          <div className="rounded-md border">
            <div className="border-b px-3 py-2"><h3 className="text-sm font-semibold">Receivable Items</h3></div>
            <div className="flex flex-col gap-3 p-3">
              {form.items.map((line, index) => (
                <div key={line.purchaseOrderItemId} className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
                  <div className="md:col-span-2"><div className="text-sm font-medium">{line.itemLabel}</div><div className="text-xs text-slate-500">Remaining: {line.remaining}</div></div>
                  <input required type="number" min="0" max={line.remaining} step="0.01" value={line.quantityReceived} onChange={(e) => updateLine(index, { quantityReceived: e.target.value })} placeholder="Received qty" className="rounded-md border px-2 py-2 text-sm" />
                  <input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(index, { unitCost: e.target.value })} placeholder="Unit cost" className="rounded-md border px-2 py-2 text-sm" />
                  <input value={line.notes} onChange={(e) => updateLine(index, { notes: e.target.value })} placeholder="Notes" className="rounded-md border px-2 py-2 text-sm" />
                </div>
              ))}
              {!form.items.length ? <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-slate-500">Select an issued or partially received PO to load open lines.</div> : null}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save Receipt"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
