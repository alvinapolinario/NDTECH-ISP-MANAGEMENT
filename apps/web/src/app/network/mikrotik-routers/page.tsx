"use client";

import { FormEvent, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/network/status-badge";
import {
  createMikrotikRouter,
  deleteMikrotikRouter,
  syncPppoeAccounts,
  testMikrotikConnection,
  updateMikrotikRouter,
  useMikrotikRouters,
} from "@/hooks/use-mikrotik";
import { formatDate } from "@/lib/format";
import type { MikrotikRouter } from "@/types/mikrotik";

type RouterForm = {
  name: string;
  host: string;
  apiPort: string;
  username: string;
  password: string;
  status: "active" | "inactive";
  notes: string;
};

const emptyForm: RouterForm = {
  name: "",
  host: "",
  apiPort: "8728",
  username: "",
  password: "",
  status: "active",
  notes: "",
};

export default function MikrotikRoutersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MikrotikRouter | null>(null);
  const [form, setForm] = useState<RouterForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const query = useMemo(
    () => ({ search, filter, page, limit: 10 }),
    [search, filter, page],
  );
  const { data, loading, error: loadError, reload } = useMikrotikRouters(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEdit(router: MikrotikRouter) {
    setEditing(router);
    setForm({
      name: router.name,
      host: router.host,
      apiPort: String(router.apiPort),
      username: router.username,
      password: "",
      status: router.status,
      notes: router.notes ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setActionLoading(-1);
    setError("");

    const body = {
      name: form.name,
      host: form.host,
      apiPort: Number(form.apiPort),
      username: form.username,
      status: form.status,
      notes: form.notes || undefined,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (editing) {
        if (!form.password) delete (body as { password?: string }).password;
        await updateMikrotikRouter(editing.id, body);
        setMessage("Router updated.");
      } else {
        if (!form.password) {
          setError("Password is required for new routers.");
          return;
        }
        await createMikrotikRouter(body);
        setMessage("Router created.");
      }
      setFormOpen(false);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save router");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTest(id: number) {
    setActionLoading(id);
    setMessage("");
    try {
      const result = await testMikrotikConnection(id);
      setMessage(result.message);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connection test failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSync(id: number) {
    setActionLoading(id);
    setMessage("");
    try {
      const result = await syncPppoeAccounts(id);
      setMessage(
        `${result.message} (imported ${result.imported}, updated ${result.updated})`,
      );
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sync failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(router: MikrotikRouter) {
    if (!window.confirm(`Delete router ${router.name}?`)) return;
    setActionLoading(router.id);
    try {
      await deleteMikrotikRouter(router.id);
      setMessage("Router deleted.");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete router");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Network Operations
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">MikroTik Routers</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Register routers, test connections, and sync PPPoE accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add Router
        </button>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), reload())}
            placeholder="Search name, host, or username"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <SearchableSelect
            value={filter}
            onChange={(nextValue) => {
              setFilter(nextValue);
              setPage(1);
            }}
            includeEmptyOption={false}
            options={[
              { label: "All statuses", value: "" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              reload();
            }}
            className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700"
          >
            Search
          </button>
        </div>

        {message ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {(error || loadError) ? (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || loadError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Router</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Check</th>
                <th className="px-4 py-3">PPPoE Accounts</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((router) => (
                <tr key={router.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{router.name}</div>
                    <div className="text-xs text-slate-500">{router.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    {router.host}:{router.apiPort}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={router.status} />
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(router.lastConnectionCheckAt)}
                  </td>
                  <td className="px-4 py-3">
                    {router._count?.pppoeAccounts ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === router.id}
                        onClick={() => handleTest(router.id)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === router.id}
                        onClick={() => handleSync(router.id)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium"
                      >
                        Sync PPPoE
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(router)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(router)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {loading ? "Loading..." : "No routers found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600">
          <span>
            Page {data.meta.page} of {totalPages} · {data.meta.total} records
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded-md border px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "Edit Router" : "Add Router"}
        description="Credentials are encrypted before storage and never returned by the API."
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          {error ? (
            <div className="md:col-span-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Host / IP</span>
            <input
              required
              value={form.host}
              onChange={(e) => setForm((c) => ({ ...c, host: e.target.value }))}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">API Port</span>
            <input
              type="number"
              required
              value={form.apiPort}
              onChange={(e) => setForm((c) => ({ ...c, apiPort: e.target.value }))}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Username</span>
            <input
              required
              value={form.username}
              onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">
              Password {editing ? "(leave blank to keep current)" : ""}
            </span>
            <input
              type="password"
              required={!editing}
              value={form.password}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Status</span>
            <SearchableSelect
              value={form.status}
              onChange={(nextValue) =>
                setForm((c) => ({
                  ...c,
                  status: nextValue as RouterForm["status"],
                }))
              }
              includeEmptyOption={false}
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              className="min-h-20 rounded-md border px-3 py-2"
            />
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={actionLoading === -1}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {editing ? "Save Changes" : "Create Router"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
