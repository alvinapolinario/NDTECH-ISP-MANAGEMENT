"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createInventoryItem,
  deleteInventoryItem,
  fetchInventoryCategories,
  fetchInventoryItems,
  updateInventoryItem,
  useInventoryList,
} from "@/hooks/use-inventory";
import { formatMoney } from "@/lib/format";
import type { InventoryCategory, InventoryItem, InventoryItemType } from "@/types/inventory";

type ItemForm = {
  categoryId: string;
  code: string;
  name: string;
  description: string;
  itemType: InventoryItemType;
  unit: string;
  unitCost: string;
  reorderLevel: string;
  isActive: boolean;
};

const emptyForm: ItemForm = {
  categoryId: "",
  code: "",
  name: "",
  description: "",
  itemType: "material",
  unit: "pcs",
  unitCost: "0",
  reorderLevel: "0",
  isActive: true,
};

const typeOptions: Array<{ label: string; value: InventoryItemType | "" }> = [
  { label: "All types", value: "" },
  { label: "Material", value: "material" },
  { label: "Equipment", value: "equipment" },
  { label: "Consumable", value: "consumable" },
  { label: "Tool", value: "tool" },
];

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function totalStock(item: InventoryItem) {
  return item.stocks.reduce((sum, stock) => sum + Number(stock.quantity), 0);
}

function toPayload(form: ItemForm) {
  return {
    categoryId: Number(form.categoryId),
    code: form.code,
    name: form.name,
    description: form.description || null,
    itemType: form.itemType,
    unit: form.unit || "pcs",
    unitCost: Number(form.unitCost || 0),
    reorderLevel: Number(form.reorderLevel || 0),
    isActive: form.isActive,
  };
}

export default function InventoryItemsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [itemType, setItemType] = useState<InventoryItemType | "">("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({ search, filter, itemType, page, limit: 10 }),
    [filter, itemType, page, search],
  );
  const { data, loading, error, reload } = useInventoryList(
    fetchInventoryItems,
    query,
    "Unable to load inventory items",
  );
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    try {
      const response = await fetchInventoryCategories({ limit: 100, filter: "active" });
      setCategories(response.items);
    } catch {
      setCategories([]);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLocalError("");
    setFormOpen(true);
    loadLookups();
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      categoryId: String(item.categoryId),
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      itemType: item.itemType,
      unit: item.unit,
      unitCost: String(item.unitCost),
      reorderLevel: String(item.reorderLevel),
      isActive: item.isActive,
    });
    setLocalError("");
    setFormOpen(true);
    loadLookups();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");
    try {
      if (editing) {
        await updateInventoryItem(editing.id, toPayload(form));
        setMessage("Inventory item updated.");
      } else {
        await createInventoryItem(toPayload(form));
        setMessage("Inventory item created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save inventory item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: InventoryItem) {
    if (!window.confirm(`Delete item ${item.name}?`)) return;
    setSaving(true);
    setMessage("");
    setLocalError("");
    try {
      await deleteInventoryItem(item.id);
      setMessage("Inventory item deleted.");
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to delete inventory item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Inventory</p>
          <h1 className="text-2xl font-semibold text-slate-950">Inventory Items</h1>
          <p className="text-sm text-slate-600">Maintain materials, equipment, tools, and consumables before posting stock activity.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Add Item
        </button>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, item, category, or description" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
          <SearchableSelect value={filter} onChange={(nextValue) => { setFilter(nextValue); setPage(1); }} includeEmptyOption={false} options={[{ label: "All statuses", value: "" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          <SearchableSelect value={itemType} onChange={(nextValue) => { setItemType(nextValue as InventoryItemType | ""); setPage(1); }} includeEmptyOption={false} options={typeOptions} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          <button type="button" onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Reorder</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const stock = totalStock(item);
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-4 py-3"><div className="font-medium">{item.name}</div><div className="text-xs text-slate-500">{item.code}</div></td>
                    <td className="px-4 py-3">{item.category.name}</td>
                    <td className="px-4 py-3">{titleCase(item.itemType)}</td>
                    <td className="px-4 py-3">{formatMoney(item.unitCost)}</td>
                    <td className="px-4 py-3">{stock.toLocaleString()} {item.unit}</td>
                    <td className="px-4 py-3">{Number(item.reorderLevel).toLocaleString()} {item.unit}</td>
                    <td className="px-4 py-3">{item.isActive ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openEdit(item)} className="rounded-md border px-3 py-1.5 text-xs">Edit</button><button onClick={() => handleDelete(item)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700">Delete</button></div></td>
                  </tr>
                );
              })}
              {!data.items.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No inventory items found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>

      <Modal open={formOpen} title={editing ? "Edit Inventory Item" : "Add Inventory Item"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">Category<SearchableSelect required value={form.categoryId} onChange={(nextValue) => setForm((c) => ({ ...c, categoryId: nextValue }))} emptyOptionLabel="Select category" options={categories.map((category) => ({ label: category.name, value: String(category.id) }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Code<input required value={form.code} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Name<input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Type<SearchableSelect value={form.itemType} onChange={(nextValue) => setForm((c) => ({ ...c, itemType: nextValue as InventoryItemType }))} includeEmptyOption={false} options={typeOptions.filter((o) => o.value)} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Unit<input value={form.unit} onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Unit Cost<input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm((c) => ({ ...c, unitCost: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Reorder Level<input type="number" min="0" step="0.01" value={form.reorderLevel} onChange={(e) => setForm((c) => ({ ...c, reorderLevel: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="mt-7 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} /> Active</label>
          <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">Description<textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save Item"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
