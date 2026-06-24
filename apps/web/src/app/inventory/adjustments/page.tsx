"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createInventoryAdjustment, fetchInventoryAdjustments, fetchInventoryItems, fetchWarehouses, useInventoryList } from "@/hooks/use-inventory";
import { formatDate } from "@/lib/format";
import type { InventoryAdjustmentType, InventoryItem, Warehouse } from "@/types/inventory";

type AdjustmentForm = { itemId: string; warehouseId: string; adjustmentType: InventoryAdjustmentType; quantity: string; reason: string; notes: string };
const emptyForm: AdjustmentForm = { itemId: "", warehouseId: "", adjustmentType: "increase", quantity: "", reason: "", notes: "" };
const adjustmentTypes: Array<{ label: string; value: InventoryAdjustmentType | "" }> = [
  { label: "All adjustments", value: "" },
  { label: "Increase", value: "increase" },
  { label: "Decrease", value: "decrease" },
  { label: "Set Quantity", value: "set" },
];
function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export default function InventoryAdjustmentsPage() {
  const [search, setSearch] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<InventoryAdjustmentType | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AdjustmentForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useMemo(() => ({ search, adjustmentType, page, limit: 10 }), [adjustmentType, page, search]);
  const { data, loading, error, reload } = useInventoryList(fetchInventoryAdjustments, query, "Unable to load stock adjustments");
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  async function loadLookups() { const [i, w] = await Promise.all([fetchInventoryItems({ limit: 100, filter: "active" }), fetchWarehouses({ limit: 100, filter: "active" })]); setItems(i.items); setWarehouses(w.items); }
  useEffect(() => { loadLookups().catch(() => undefined); }, []);
  function openCreate() { setForm(emptyForm); setLocalError(""); setFormOpen(true); loadLookups().catch(() => undefined); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(""); setLocalError("");
    try {
      await createInventoryAdjustment({ itemId: Number(form.itemId), warehouseId: Number(form.warehouseId), adjustmentType: form.adjustmentType, quantity: Number(form.quantity), reason: form.reason, notes: form.notes || null });
      setMessage("Stock adjustment posted."); setFormOpen(false); await reload();
    } catch (caught) { setLocalError(caught instanceof Error ? caught.message : "Unable to post stock adjustment"); } finally { setSaving(false); }
  }
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Inventory</p><h1 className="text-2xl font-semibold text-slate-950">Stock Adjustments</h1><p className="text-sm text-slate-600">Correct stock balances with previous and new quantity audit records.</p></div><button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Post Adjustment</button></header>
      <div className="rounded-md border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b p-4 lg:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item, warehouse, reason, or notes" className="w-full rounded-md border px-3 py-2 text-sm" /><SearchableSelect value={adjustmentType} onChange={(nextValue) => { setAdjustmentType(nextValue as InventoryAdjustmentType | ""); setPage(1); }} includeEmptyOption={false} options={adjustmentTypes} className="rounded-md border px-3 py-2 text-sm" /><button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button></div>
      {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}{(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Before</th><th className="px-4 py-3">After</th><th className="px-4 py-3">Reason</th></tr></thead><tbody>{data.items.map((adjustment) => <tr key={adjustment.id} className="border-b"><td className="px-4 py-3">{formatDate(adjustment.createdAt)}</td><td className="px-4 py-3"><div className="font-medium">{adjustment.item.name}</div><div className="text-xs text-slate-500">{adjustment.item.code}</div></td><td className="px-4 py-3">{adjustment.warehouse.name}</td><td className="px-4 py-3">{titleCase(adjustment.adjustmentType)}</td><td className="px-4 py-3">{Number(adjustment.quantity).toLocaleString()} {adjustment.item.unit}</td><td className="px-4 py-3">{Number(adjustment.previousQuantity).toLocaleString()}</td><td className="px-4 py-3">{Number(adjustment.newQuantity).toLocaleString()}</td><td className="px-4 py-3">{adjustment.reason}</td></tr>)}{!data.items.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No stock adjustments found."}</td></tr> : null}</tbody></table></div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div></div>
      <Modal open={formOpen} title="Post Stock Adjustment" onClose={() => setFormOpen(false)}><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><label className="flex flex-col gap-1 text-sm font-medium">Item<SearchableSelect required value={form.itemId} onChange={(nextValue) => setForm((c) => ({ ...c, itemId: nextValue }))} emptyOptionLabel="Select item" options={items.map((item) => ({ label: `${item.code} - ${item.name}`, value: String(item.id) }))} className="rounded-md border px-3 py-2" /></label><label className="flex flex-col gap-1 text-sm font-medium">Warehouse<SearchableSelect required value={form.warehouseId} onChange={(nextValue) => setForm((c) => ({ ...c, warehouseId: nextValue }))} emptyOptionLabel="Select warehouse" options={warehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) }))} className="rounded-md border px-3 py-2" /></label><label className="flex flex-col gap-1 text-sm font-medium">Type<SearchableSelect value={form.adjustmentType} onChange={(nextValue) => setForm((c) => ({ ...c, adjustmentType: nextValue as InventoryAdjustmentType }))} includeEmptyOption={false} options={adjustmentTypes.filter((t) => t.value)} className="rounded-md border px-3 py-2" /></label><label className="flex flex-col gap-1 text-sm font-medium">Quantity<input required type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))} className="rounded-md border px-3 py-2" /></label><label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">Reason<input required value={form.reason} onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))} className="rounded-md border px-3 py-2" /></label><label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={3} className="rounded-md border px-3 py-2" /></label><div className="flex justify-end gap-2 border-t pt-4 md:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Posting..." : "Post Adjustment"}</button></div></form></Modal>
    </section>
  );
}
