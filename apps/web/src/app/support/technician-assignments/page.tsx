"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createTechnicianAssignment,
  deleteTechnicianAssignment,
  fetchSupportUsers,
  fetchTechnicianAssignments,
  fetchTickets,
  runTechnicianAssignmentAction,
  updateTechnicianAssignment,
  useSupportList,
} from "@/hooks/use-support";
import { formatDate, toDateInputValue } from "@/lib/format";
import type {
  SupportUser,
  TechnicianAssignment,
  TechnicianAssignmentStatus,
  Ticket,
} from "@/types/support";

type AssignmentForm = {
  ticketId: string;
  technicianId: string;
  status: TechnicianAssignmentStatus;
  scheduledAt: string;
  notes: string;
};

const emptyForm: AssignmentForm = {
  ticketId: "",
  technicianId: "",
  status: "assigned",
  scheduledAt: "",
  notes: "",
};

const statuses: Array<{ label: string; value: TechnicianAssignmentStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Assigned", value: "assigned" },
  { label: "Accepted", value: "accepted" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function toPayload(form: AssignmentForm) {
  return {
    ticketId: Number(form.ticketId),
    technicianId: Number(form.technicianId),
    status: form.status,
    scheduledAt: form.scheduledAt || null,
    notes: form.notes || null,
  };
}

export default function TechnicianAssignmentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TechnicianAssignmentStatus | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TechnicianAssignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => ({ search, status, page, limit: 10 }), [page, search, status]);
  const { data, loading, error, reload } = useSupportList<TechnicianAssignment>(
    fetchTechnicianAssignments,
    query,
    "Unable to load technician assignments",
  );
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  async function loadLookups() {
    const [ticketResponse, userResponse] = await Promise.all([
      fetchTickets({ limit: 200 }),
      fetchSupportUsers(),
    ]);
    setTickets(ticketResponse.items.filter((ticket) => !["closed", "cancelled"].includes(ticket.status)));
    setUsers(userResponse.items);
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

  function openEdit(assignment: TechnicianAssignment) {
    setEditing(assignment);
    setForm({
      ticketId: String(assignment.ticketId),
      technicianId: String(assignment.technicianId),
      status: assignment.status,
      scheduledAt: toDateInputValue(assignment.scheduledAt),
      notes: assignment.notes ?? "",
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
        await updateTechnicianAssignment(editing.id, toPayload(form));
        setMessage("Technician assignment updated.");
      } else {
        await createTechnicianAssignment(toPayload(form));
        setMessage("Technician assignment created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Unable to save assignment");
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
      setLocalError(caught instanceof Error ? caught.message : "Unable to update assignment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Support</p>
          <h1 className="text-2xl font-semibold text-slate-950">Technician Assignments</h1>
          <p className="text-sm text-slate-600">Dispatch technicians and update field-work progress.</p>
        </div>
        <button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Technician</button>
      </header>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket, subject, technician, or notes" className="w-full rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={status} onChange={(nextValue) => { setStatus(nextValue as TechnicianAssignmentStatus | ""); setPage(1); }} includeEmptyOption={false} options={statuses} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Technician</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Scheduled</th><th className="px-4 py-3">Started</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {data.items.map((assignment) => (
                <tr key={assignment.id} className="border-b">
                  <td className="px-4 py-3"><div className="font-medium">{assignment.ticket.ticketNumber}</div><div className="text-xs text-slate-500">{assignment.ticket.subject}</div></td>
                  <td className="px-4 py-3"><div>{assignment.technician.name}</div><div className="text-xs text-slate-500">{assignment.technician.mobileNumber ?? assignment.technician.email}</div></td>
                  <td className="px-4 py-3"><StatusBadge status={assignment.status} /></td>
                  <td className="px-4 py-3">{formatDate(assignment.scheduledAt)}</td>
                  <td className="px-4 py-3">{formatDate(assignment.startedAt)}</td>
                  <td className="px-4 py-3">{formatDate(assignment.completedAt)}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                    {assignment.status === "assigned" ? <button onClick={() => runAction(() => runTechnicianAssignmentAction(assignment.id, "accept"), "Assignment accepted.")} className="rounded-md border border-sky-600 px-2.5 py-1.5 text-xs text-sky-700">Accept</button> : null}
                    {assignment.status !== "in_progress" && assignment.status !== "completed" && assignment.status !== "cancelled" ? <button onClick={() => runAction(() => runTechnicianAssignmentAction(assignment.id, "start"), "Assignment started.")} className="rounded-md border border-amber-600 px-2.5 py-1.5 text-xs text-amber-700">Start</button> : null}
                    {assignment.status !== "completed" && assignment.status !== "cancelled" ? <button onClick={() => runAction(() => runTechnicianAssignmentAction(assignment.id, "complete", "Completed from dispatch board"), "Assignment completed.")} className="rounded-md border border-emerald-600 px-2.5 py-1.5 text-xs text-emerald-700">Complete</button> : null}
                    {assignment.status !== "completed" && assignment.status !== "cancelled" ? <button onClick={() => runAction(() => runTechnicianAssignmentAction(assignment.id, "cancel"), "Assignment cancelled.")} className="rounded-md border px-2.5 py-1.5 text-xs">Cancel</button> : null}
                    <button onClick={() => openEdit(assignment)} className="rounded-md border px-2.5 py-1.5 text-xs">Edit</button>
                    <button disabled={saving} onClick={() => window.confirm("Delete assignment?") && runAction(() => deleteTechnicianAssignment(assignment.id), "Assignment deleted.")} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700">Delete</button>
                  </div></td>
                </tr>
              ))}
              {!data.items.length ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No technician assignments found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>

      <Modal open={formOpen} title={editing ? "Edit Assignment" : "Assign Technician"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">Ticket<SearchableSelect required value={form.ticketId} onChange={(nextValue) => setForm((c) => ({ ...c, ticketId: nextValue }))} emptyOptionLabel="Select ticket" options={tickets.map((ticket) => ({ label: `${ticket.ticketNumber} - ${ticket.subject}`, value: String(ticket.id) }))} className="rounded-md border px-3 py-2" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">Technician<SearchableSelect required value={form.technicianId} onChange={(nextValue) => setForm((c) => ({ ...c, technicianId: nextValue }))} emptyOptionLabel="Select technician" options={users.map((user) => ({ label: user.name, value: String(user.id) }))} className="rounded-md border px-3 py-2" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Status<SearchableSelect value={form.status} onChange={(nextValue) => setForm((c) => ({ ...c, status: nextValue as TechnicianAssignmentStatus }))} includeEmptyOption={false} options={statuses.filter((s) => s.value)} className="rounded-md border px-3 py-2" /></label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">Scheduled At<input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((c) => ({ ...c, scheduledAt: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={3} className="rounded-md border px-3 py-2" /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save Assignment"}</button></div>
        </form>
      </Modal>
    </section>
  );
}
