"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createInventoryMovement,
  fetchInventoryItems,
  fetchInventoryMovements,
  fetchWarehouses,
  useInventoryList,
} from "@/hooks/use-inventory";
import { formatDate, formatMoney } from "@/lib/format";
import type { InventoryItem, InventoryMovementType, Warehouse } from "@/types/inventory";

type MovementForm = {
  itemId: string;
  warehouseId: string;
  toWarehouseId: string;
  movementType: InventoryMovementType;
  quantity: string;
  unitCost: string;
  referenceType: string;
  referenceNo: string;
  notes: string;
};

const emptyForm: MovementForm = {
  itemId: "",
  warehouseId: "",
  toWarehouseId: "",
  movementType: "stock_in",
  quantity: "",
  unitCost: "",
  referenceType: "",
  referenceNo: "",
  notes: "",
};

const movementTypes: Array<{ label: string; value: InventoryMovementType | "" }> = [
  { label: "All movements", value: "" },
  { label: "Stock In", value: "stock_in" },
  { label: "Stock Out", value: "stock_out" },
  { label: "Transfer", value: "transfer" },
  { label: "Return", value: "return" },
];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function InventoryMovementsPage() {
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState<InventoryMovementType | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MovementForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useMemo(() => ({ search, movementType, page, limit: 10 }), [movementType, page, search]);
  const { data, loading, error, reload } = useInventoryList(fetchInventoryMovements, query, "Unable to load stock movements");
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    const [itemResponse, warehouseResponse] = await Promise.all([
      fetchInventoryItems({ limit: 100, filter: "active" }),
      fetchWarehouses({ limit: 100, filter: "active" }),
    ]);
    setItems(itemResponse.items);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");
    try {
      await createInventoryMovement({
        itemId: Number(form.itemId),
        warehouseId: Number(form.warehouseId),
        toWarehouseId: form.toWarehouseId ? Number(form.toWarehouseId) : null,
        movementType: form.movementType,
        quantity: Number(form.quantity),
        unitCost: form.unitCost ? Number(form.unitCost) : null,
        referenceType: form.referenceType || null,
        referenceNo: form.referenceNo || null,
        notes: form.notes || null,
      });
      setMessage("Stock movement posted.");
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to post stock movement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Inventory</p><h1 className="text-2xl font-semibold text-slate-950">Stock Movements</h1><p className="text-sm text-slate-600">Post stock in, stock out, returns, and transfers while updating balances.</p></div>
        <button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Post Movement</button>
      </header>
      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item, warehouse, reference, or notes" className="w-full rounded-md border px-3 py-2 text-sm" /><SearchableSelect value={movementType} onChange={(nextValue) => { setMovementType(nextValue as InventoryMovementType | ""); setPage(1); }} includeEmptyOption={false} options={movementTypes} className="rounded-md border px-3 py-2 text-sm" /><button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button></div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Unit Cost</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Notes</th></tr></thead><tbody>{data.items.map((movement) => <tr key={movement.id} className="border-b"><td className="px-4 py-3">{formatDate(movement.createdAt)}</td><td className="px-4 py-3"><div className="font-medium">{movement.item.name}</div><div className="text-xs text-slate-500">{movement.item.code}</div></td><td className="px-4 py-3">{titleCase(movement.movementType)}</td><td className="px-4 py-3">{movement.warehouse.name}{movement.toWarehouse ? ` -> ${movement.toWarehouse.name}` : ""}</td><td className="px-4 py-3">{Number(movement.quantity).toLocaleString()} {movement.item.unit}</td><td className="px-4 py-3">{movement.unitCost ? formatMoney(movement.unitCost) : "-"}</td><td className="px-4 py-3">{[movement.referenceType, movement.referenceNo].filter(Boolean).join(" / ") || "-"}</td><td className="px-4 py-3">{movement.notes ?? "-"}</td></tr>)}{!data.items.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No stock movements found."}</td></tr> : null}</tbody></table></div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>
      <Modal open={formOpen} title="Post Stock Movement" onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">Item<SearchableSelect required value={form.itemId} onChange={(nextValue) => setForm((c) => ({ ...c, itemId: nextValue }))} emptyOptionLabel="Select item" options={items.map((item) => ({ label: `${item.code} - ${item.name}`, value: String(item.id) }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Movement Type<SearchableSelect value={form.movementType} onChange={(nextValue) => setForm((c) => ({ ...c, movementType: nextValue as InventoryMovementType }))} includeEmptyOption={false} options={movementTypes.filter((t) => t.value)} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Warehouse<SearchableSelect required value={form.warehouseId} onChange={(nextValue) => setForm((c) => ({ ...c, warehouseId: nextValue }))} emptyOptionLabel="Select warehouse" options={warehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) }))} className="rounded-md border px-3 py-2" /></label>
          {form.movementType === "transfer" ? <label className="flex flex-col gap-1 text-sm font-medium">Destination Warehouse<SearchableSelect required value={form.toWarehouseId} onChange={(nextValue) => setForm((c) => ({ ...c, toWarehouseId: nextValue }))} emptyOptionLabel="Select destination" options={warehouses.map((warehouse) => ({ label: warehouse.name, value: String(warehouse.id) }))} className="rounded-md border px-3 py-2" /></label> : null}
          <label className="flex flex-col gap-1 text-sm font-medium">Quantity<input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Unit Cost<input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm((c) => ({ ...c, unitCost: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Reference Type<input value={form.referenceType} onChange={(e) => setForm((c) => ({ ...c, referenceType: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Reference No.<input value={form.referenceNo} onChange={(e) => setForm((c) => ({ ...c, referenceNo: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={3} className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Posting..." : "Post Movement"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
