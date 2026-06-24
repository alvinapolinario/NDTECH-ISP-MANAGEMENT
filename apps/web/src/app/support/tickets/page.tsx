"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchCustomers } from "@/hooks/use-customers";
import { fetchSubscriptions } from "@/hooks/use-subscriptions";
import {
  closeTicket,
  createTicket,
  deleteTicket,
  fetchTicketCategories,
  fetchTickets,
  resolveTicket,
  updateTicket,
  useSupportList,
} from "@/hooks/use-support";
import { customerDisplayName, formatDate, toDateInputValue } from "@/lib/format";
import type { CustomerSummary } from "@/types/customer";
import type { Subscription } from "@/types/subscription";
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from "@/types/support";

type TicketForm = {
  ticketNumber: string;
  customerId: string;
  subscriptionId: string;
  categoryId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  reportedBy: string;
  contactNumber: string;
  location: string;
  dueAt: string;
  resolution: string;
  notes: string;
};

const emptyForm: TicketForm = {
  ticketNumber: "",
  customerId: "",
  subscriptionId: "",
  categoryId: "",
  subject: "",
  description: "",
  status: "open",
  priority: "normal",
  reportedBy: "",
  contactNumber: "",
  location: "",
  dueAt: "",
  resolution: "",
  notes: "",
};

const statuses: Array<{ label: string; value: TicketStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Open", value: "open" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
  { label: "Cancelled", value: "cancelled" },
];
const priorities: Array<{ label: string; value: TicketPriority | "" }> = [
  { label: "All priorities", value: "" },
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

function toPayload(form: TicketForm) {
  return {
    ticketNumber: form.ticketNumber || null,
    customerId: form.customerId ? Number(form.customerId) : null,
    subscriptionId: form.subscriptionId ? Number(form.subscriptionId) : null,
    categoryId: Number(form.categoryId),
    subject: form.subject,
    description: form.description,
    status: form.status,
    priority: form.priority,
    reportedBy: form.reportedBy || null,
    contactNumber: form.contactNumber || null,
    location: form.location || null,
    dueAt: form.dueAt || null,
    resolution: form.resolution || null,
    notes: form.notes || null,
  };
}

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => ({ search, status, priority, page, limit: 10 }), [page, priority, search, status]);
  const { data, loading, error, reload } = useSupportList<Ticket>(fetchTickets, query, "Unable to load tickets");
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    const [categoryResponse, customerResponse, subscriptionResponse] = await Promise.all([
      fetchTicketCategories({ filter: "active", limit: 200 }),
      fetchCustomers("", 200),
      fetchSubscriptions({ limit: 200 }),
    ]);
    setCategories(categoryResponse.items);
    setCustomers(customerResponse.items);
    setSubscriptions(subscriptionResponse.items);
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

  function openEdit(ticket: Ticket) {
    setEditing(ticket);
    setForm({
      ticketNumber: ticket.ticketNumber,
      customerId: ticket.customerId ? String(ticket.customerId) : "",
      subscriptionId: ticket.subscriptionId ? String(ticket.subscriptionId) : "",
      categoryId: String(ticket.categoryId),
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      reportedBy: ticket.reportedBy ?? "",
      contactNumber: ticket.contactNumber ?? "",
      location: ticket.location ?? "",
      dueAt: toDateInputValue(ticket.dueAt),
      resolution: ticket.resolution ?? "",
      notes: ticket.notes ?? "",
    });
    setLocalError("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setLocalError("");
    try {
      if (editing) {
        await updateTicket(editing.id, toPayload(form));
        setMessage("Ticket updated.");
      } else {
        await createTicket(toPayload(form));
        setMessage("Ticket created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save ticket");
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
      setLocalError(caught instanceof Error ? caught.message : "Unable to update ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Support</p>
          <h1 className="text-2xl font-semibold text-slate-950">Tickets</h1>
          <p className="text-sm text-slate-600">Log subscriber issues, prioritize work, and track resolution.</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create Ticket</button>
      </header>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket, customer, category, subject, or contact" className="w-full rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={status} onChange={(nextValue) => { setStatus(nextValue as TicketStatus | ""); setPage(1); }} includeEmptyOption={false} options={statuses} className="rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={priority} onChange={(nextValue) => { setPriority(nextValue as TicketPriority | ""); setPage(1); }} includeEmptyOption={false} options={priorities} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {data.items.map((ticket) => (
                <tr key={ticket.id} className="border-b">
                  <td className="px-4 py-3"><div className="font-medium">{ticket.ticketNumber}</div><div className="text-xs text-slate-500">{ticket.subject}</div></td>
                  <td className="px-4 py-3">{ticket.customer ? customerDisplayName(ticket.customer) : "-"}</td>
                  <td className="px-4 py-3">{ticket.category.name}</td>
                  <td className="px-4 py-3 capitalize">{ticket.priority}</td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3">{formatDate(ticket.dueAt)}</td>
                  <td className="px-4 py-3">{ticket.assignments?.[0]?.technician?.name ?? "-"}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                    {ticket.status !== "resolved" && ticket.status !== "closed" ? <button onClick={() => runAction(() => resolveTicket(ticket.id, "Resolved from ticket queue"), "Ticket resolved.")} className="rounded-md border border-emerald-600 px-2.5 py-1.5 text-xs text-emerald-700">Resolve</button> : null}
                    {ticket.status === "resolved" ? <button onClick={() => runAction(() => closeTicket(ticket.id), "Ticket closed.")} className="rounded-md border px-2.5 py-1.5 text-xs">Close</button> : null}
                    <button onClick={() => openEdit(ticket)} className="rounded-md border px-2.5 py-1.5 text-xs">Edit</button>
                    <button disabled={saving} onClick={() => window.confirm(`Delete ${ticket.ticketNumber}?`) && runAction(() => deleteTicket(ticket.id), "Ticket deleted.")} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700">Delete</button>
                  </div></td>
                </tr>
              ))}
              {!data.items.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No tickets found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>

      <Modal open={formOpen} title={editing ? "Edit Ticket" : "Create Ticket"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">Ticket No.<input value={form.ticketNumber} onChange={(e) => setForm((c) => ({ ...c, ticketNumber: e.target.value }))} placeholder="Auto if blank" className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Category<SearchableSelect required value={form.categoryId} onChange={(nextValue) => setForm((c) => ({ ...c, categoryId: nextValue }))} emptyOptionLabel="Select category" options={categories.map((category) => ({ label: category.name, value: String(category.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Customer<SearchableSelect value={form.customerId} onChange={(nextValue) => setForm((c) => ({ ...c, customerId: nextValue }))} emptyOptionLabel="No customer" options={customers.map((customer) => ({ label: `${customer.accountNumber} - ${customerDisplayName(customer)}`, value: String(customer.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Subscription<SearchableSelect value={form.subscriptionId} onChange={(nextValue) => setForm((c) => ({ ...c, subscriptionId: nextValue }))} emptyOptionLabel="No subscription" options={subscriptions.filter((subscription) => !form.customerId || subscription.customerId === Number(form.customerId)).map((subscription) => ({ label: `#${subscription.id} - ${subscription.servicePlan?.name ?? subscription.status}`, value: String(subscription.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Status<SearchableSelect value={form.status} onChange={(nextValue) => setForm((c) => ({ ...c, status: nextValue as TicketStatus }))} includeEmptyOption={false} options={statuses.filter((s) => s.value)} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Priority<SearchableSelect value={form.priority} onChange={(nextValue) => setForm((c) => ({ ...c, priority: nextValue as TicketPriority }))} includeEmptyOption={false} options={priorities.filter((p) => p.value)} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Reported By<input value={form.reportedBy} onChange={(e) => setForm((c) => ({ ...c, reportedBy: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Contact Number<input value={form.contactNumber} onChange={(e) => setForm((c) => ({ ...c, contactNumber: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">Subject<input required value={form.subject} onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">Description<textarea required value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} className="rounded-md border px-3 py-2" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">Due At<input type="datetime-local" value={form.dueAt} onChange={(e) => setForm((c) => ({ ...c, dueAt: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Location<input value={form.location} onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">Resolution<textarea value={form.resolution} onChange={(e) => setForm((c) => ({ ...c, resolution: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save Ticket"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
