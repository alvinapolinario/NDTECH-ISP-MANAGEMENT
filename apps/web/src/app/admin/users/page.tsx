"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useRoles } from "@/hooks/use-roles";
import { apiRequest } from "@/lib/api";

type UserRole = {
  role: {
    id: number;
    name: string;
  };
};

type User = {
  id: number;
  name: string;
  email: string;
  mobileNumber?: string | null;
  status: string;
  roles?: UserRole[];
  createdAt: string;
};

type UserForm = {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  status: string;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  mobileNumber: "",
  password: "",
  status: "active",
};

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
];

const ADMIN_PORTAL_ROLES = new Set(["Super Admin", "Admin"]);

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const { roles } = useRoles();
  const { isSuperAdmin } = useAuthUser();

  const totalPages = Math.max(Math.ceil(meta.total / meta.limit), 1);

  const roleGroups = useMemo(
    () => ({
      portal: roles.filter((role) => ADMIN_PORTAL_ROLES.has(role.name)),
      staff: roles.filter((role) => !ADMIN_PORTAL_ROLES.has(role.name)),
    }),
    [roles],
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("filter", statusFilter);

      const response = await apiRequest<{
        items: User[];
        meta: { total: number; page: number; limit: number };
      }>(`/users?${params.toString()}`);

      setUsers(response.items);
      setMeta(response.meta);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSelectedRoleIds([]);
    setFormOpen(true);
    setError("");
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber ?? "",
      password: "",
      status: user.status,
    });
    setSelectedRoleIds(user.roles?.map((userRole) => userRole.role.id) ?? []);
    setFormOpen(true);
    setError("");
  }

  async function submitUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        mobileNumber: form.mobileNumber || undefined,
        status: form.status,
      };

      if (form.password) {
        body.password = form.password;
      }

      if (isSuperAdmin) {
        body.roleIds = selectedRoleIds;
      }

      if (editing) {
        await apiRequest(`/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setMessage("User updated.");
      } else {
        if (!form.password) {
          throw new Error("Password is required for new users.");
        }
        await apiRequest("/users", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage("User created.");
      }

      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save user");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(user: User) {
    if (!window.confirm(`Delete user ${user.name}?`)) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`/users/${user.id}`, { method: "DELETE" });
      setMessage("User deleted.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete user");
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(roleId: number) {
    setSelectedRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  }

  function renderRolePicker() {
    return (
      <div className="flex flex-col gap-4 md:col-span-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Portal Access</h3>
          <p className="mt-1 text-xs text-slate-500">
            Portal access requires Super Admin or Admin. Field staff roles are
            used for assignments only.
          </p>
          <div className="mt-2 space-y-2">
            {roleGroups.portal.map((role) => (
              <label
                key={role.id}
                className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {role.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {role.description || "Can sign in to the admin portal"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Field Staff</h3>
          <div className="mt-2 space-y-2">
            {roleGroups.staff.map((role) => (
              <label
                key={role.id}
                className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {role.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {role.description || "Assignable field staff role"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderRoleBadges(user: User) {
    const names = user.roles?.map((userRole) => userRole.role.name) ?? [];
    if (!names.length) return "None";

    return (
      <div className="flex flex-wrap gap-1">
        {names.map((name) => (
          <span
            key={name}
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              ADMIN_PORTAL_ROLES.has(name)
                ? "bg-emerald-50 text-emerald-700"
                : "bg-sky-50 text-sky-700"
            }`}
          >
            {name}
          </span>
        ))}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Administration
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Users</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Manage admin portal access and field staff accounts. Only users with
            Super Admin or Admin roles can sign in to this system.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Create User
        </button>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setPage(1);
                  load();
                }
              }}
              placeholder="Search by name, email, or mobile"
              className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                load();
              }}
              className="shrink-0 rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Search
            </button>
          </div>

          <div className="w-full shrink-0 lg:w-48">
            <SearchableSelect
              value={statusFilter}
              onChange={(nextValue) => {
                setStatusFilter(nextValue);
                setPage(1);
              }}
              emptyOptionLabel="All statuses"
              options={statusOptions}
            />
          </div>
        </div>

        {message ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Mobile</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Roles</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{user.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 text-slate-700">{user.email}</td>
                  <td className="px-4 py-3 text-slate-700">{user.mobileNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{renderRoleBadges(user)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUser(user)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? "Loading..." : "No users found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>
            Page {meta.page} of {totalPages} · {meta.total} records
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? `Edit ${editing.name}` : "Create User"}
        description="Admin users can access this portal. Field staff accounts are used for assignments and the future field API."
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={submitUser} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Mobile Number</span>
            <input
              value={form.mobileNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, mobileNumber: event.target.value }))
              }
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Status</span>
            <SearchableSelect
              value={form.status}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, status: nextValue }))
              }
              includeEmptyOption={false}
              options={statusOptions}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">
              {editing ? "New Password" : "Password"}
            </span>
            <input
              type="password"
              required={!editing}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder={editing ? "Leave blank to keep current password" : ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
          {isSuperAdmin ? renderRolePicker() : null}
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
