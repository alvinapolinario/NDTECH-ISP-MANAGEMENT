"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/network/status-badge";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchCustomers } from "@/hooks/use-customers";
import { createProject, deleteProject, fetchProjects, updateProject, useProjectList } from "@/hooks/use-projects";
import { useStaffByRole } from "@/hooks/use-staff";
import { customerDisplayName, formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import type { CustomerSummary } from "@/types/customer";
import {
  OUTSOURCED_PROJECT_TYPES,
  type Project,
  type ProjectStatus,
  type ProjectType,
} from "@/types/project";
import { STAFF_ROLE_NAMES } from "@/types/staff";

const statuses: Array<{ label: string; value: ProjectStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Planning", value: "planning" },
  { label: "Active", value: "active" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
const types: Array<{ label: string; value: ProjectType | "" }> = [
  { label: "All types", value: "" },
  { label: "Expansion", value: "expansion" },
  { label: "Backbone", value: "backbone" },
  { label: "Customer Install", value: "customer_install" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Other", value: "other" },
  { label: "CCTV", value: "cctv" },
  { label: "Solar", value: "solar" },
  { label: "Outsourced", value: "outsourced" },
];
const emptyForm = {
  code: "",
  name: "",
  description: "",
  projectType: "expansion" as ProjectType,
  status: "planning" as ProjectStatus,
  customerId: "",
  location: "",
  startDate: "",
  targetDate: "",
  budget: "0",
  managerName: "",
  contractorUserId: "",
  notes: "",
};

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [projectType, setProjectType] = useState<ProjectType | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useMemo(() => ({ search, status, projectType, page, limit: 10 }), [page, projectType, search, status]);
  const { data, loading, error, reload } = useProjectList<Project>(fetchProjects, query, "Unable to load projects");
  const { staff: contractors } = useStaffByRole(STAFF_ROLE_NAMES.CONTRACTOR);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const isOutsourcedType = OUTSOURCED_PROJECT_TYPES.includes(form.projectType);

  useEffect(() => { fetchCustomers("", 200).then((r) => setCustomers(r.items)).catch(() => undefined); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setLocalError(""); setFormOpen(true); }
  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      code: project.code,
      name: project.name,
      description: project.description ?? "",
      projectType: project.projectType,
      status: project.status,
      customerId: project.customerId ? String(project.customerId) : "",
      location: project.location ?? "",
      startDate: toDateInputValue(project.startDate),
      targetDate: toDateInputValue(project.targetDate),
      budget: String(project.budget),
      managerName: project.managerName ?? "",
      contractorUserId: project.contractorUserId ? String(project.contractorUserId) : "",
      notes: project.notes ?? "",
    });
    setLocalError("");
    setFormOpen(true);
  }
  function payload() {
    return {
      code: form.code || null,
      name: form.name,
      description: form.description || null,
      projectType: form.projectType,
      status: form.status,
      customerId: form.customerId ? Number(form.customerId) : null,
      location: form.location || null,
      startDate: form.startDate || null,
      targetDate: form.targetDate || null,
      budget: Number(form.budget || 0),
      managerName: form.managerName || null,
      contractorUserId: form.contractorUserId ? Number(form.contractorUserId) : null,
      notes: form.notes || null,
    };
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(""); setLocalError("");
    try {
      if (editing) { await updateProject(editing.id, payload()); setMessage("Project updated."); }
      else { await createProject(payload()); setMessage("Project created."); }
      setFormOpen(false); await reload();
    } catch (caught) { setLocalError(caught instanceof Error ? caught.message : "Unable to save project"); }
    finally { setSaving(false); }
  }
  async function remove(project: Project) {
    if (!window.confirm(`Delete ${project.code}?`)) return;
    setSaving(true); setMessage(""); setLocalError("");
    try { await deleteProject(project.id); setMessage("Project deleted."); await reload(); }
    catch (caught) { setLocalError(caught instanceof Error ? caught.message : "Unable to delete project"); }
    finally { setSaving(false); }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Projects</p><h1 className="text-2xl font-semibold text-slate-950">Project Registry</h1><p className="text-sm text-slate-600">Track ISP expansion projects and outsourced CCTV, solar, and contractor-led installations.</p></div>
        <button onClick={openCreate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create Project</button>
      </header>
      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project, customer, manager, or location" className="w-full rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={status} onChange={(nextValue) => { setStatus(nextValue as ProjectStatus | ""); setPage(1); }} includeEmptyOption={false} options={statuses} className="rounded-md border px-3 py-2 text-sm" />
          <SearchableSelect value={projectType} onChange={(nextValue) => { setProjectType(nextValue as ProjectType | ""); setPage(1); }} includeEmptyOption={false} options={types} className="rounded-md border px-3 py-2 text-sm" />
          <button onClick={() => { setPage(1); reload(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {(localError || error) ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{localError || error}</div> : null}
        <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-emerald-950 text-white"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Docs</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{data.items.map((project) => <tr key={project.id} className="border-b"><td className="px-4 py-3"><div className="font-medium">{project.code}</div><div className="text-xs text-slate-500">{project.name}</div></td><td className="px-4 py-3">{project.customer ? customerDisplayName(project.customer) : "-"}</td><td className="px-4 py-3 capitalize">{project.projectType.replace(/_/g, " ")}</td><td className="px-4 py-3">{project.contractor?.name || project.managerName || "-"}</td><td className="px-4 py-3"><StatusBadge status={project.status} /></td><td className="px-4 py-3">{formatDate(project.targetDate)}</td><td className="px-4 py-3">{formatMoney(project.budget)}</td><td className="px-4 py-3">{project._count?.estimates ?? 0} estimates / {project._count?.boms ?? 0} BOMs</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openEdit(project)} className="rounded-md border px-2.5 py-1.5 text-xs">Edit</button><button disabled={saving} onClick={() => remove(project)} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700">Delete</button></div></td></tr>)}
          {!data.items.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No projects found."}</td></tr> : null}</tbody></table></div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>Page {data.meta.page} of {totalPages} - {data.meta.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>
      <Modal open={formOpen} title={editing ? "Edit Project" : "Create Project"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} className="grid gap-4"><div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">Code<input value={form.code} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))} placeholder="Auto if blank" className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Name<input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Type<SearchableSelect value={form.projectType} onChange={(nextValue) => setForm((c) => ({ ...c, projectType: nextValue as ProjectType, contractorUserId: OUTSOURCED_PROJECT_TYPES.includes(nextValue as ProjectType) ? c.contractorUserId : "" }))} includeEmptyOption={false} options={types.filter((t) => t.value)} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Status<SearchableSelect value={form.status} onChange={(nextValue) => setForm((c) => ({ ...c, status: nextValue as ProjectStatus }))} includeEmptyOption={false} options={statuses.filter((s) => s.value)} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Customer<SearchableSelect value={form.customerId} onChange={(nextValue) => setForm((c) => ({ ...c, customerId: nextValue }))} emptyOptionLabel="No customer" options={customers.map((customer) => ({ label: `${customer.accountNumber} - ${customerDisplayName(customer)}`, value: String(customer.id) }))} className="rounded-md border px-3 py-2" /></label>
          {isOutsourcedType ? (
            <label className="flex flex-col gap-1 text-sm font-medium">Contractor<SearchableSelect required value={form.contractorUserId} onChange={(nextValue) => setForm((c) => ({ ...c, contractorUserId: nextValue }))} emptyOptionLabel="Select contractor" searchPlaceholder="Search contractors..." options={contractors.map((contractor) => ({ label: `${contractor.name} · ${contractor.email}`, value: String(contractor.id) }))} className="rounded-md border px-3 py-2" /></label>
          ) : (
            <label className="flex flex-col gap-1 text-sm font-medium">Manager<input value={form.managerName} onChange={(e) => setForm((c) => ({ ...c, managerName: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">Start Date<input type="date" value={form.startDate} onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Target Date<input type="date" value={form.targetDate} onChange={(e) => setForm((c) => ({ ...c, targetDate: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Budget<input type="number" min="0" step="0.01" value={form.budget} onChange={(e) => setForm((c) => ({ ...c, budget: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Location<input value={form.location} onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))} className="rounded-md border px-3 py-2" /></label>
        </div><label className="flex flex-col gap-1 text-sm font-medium">Description<textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label><label className="flex flex-col gap-1 text-sm font-medium">Notes<textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} className="rounded-md border px-3 py-2" /></label><div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save Project"}</button></div></form>
      </Modal>
    </section>
  );
}
