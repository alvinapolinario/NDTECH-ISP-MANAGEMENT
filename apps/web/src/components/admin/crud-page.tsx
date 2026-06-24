"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiRequest } from "@/lib/api";

type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "date"
  | "select"
  | "textarea"
  | "checkbox";

export type FieldConfig = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  createOnly?: boolean;
  editOnly?: boolean;
  placeholder?: string;
  emptyOptionLabel?: string;
  options?: { label: string; value: string }[];
};

export type ColumnConfig<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
};

type ListResponse<T> = {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

type Entity = {
  id: number;
  [key: string]: unknown;
};

type CrudPageProps<T extends Entity> = {
  title: string;
  description: string;
  sectionLabel?: string;
  endpoint: string;
  fields: FieldConfig[];
  columns: ColumnConfig<T>[];
  searchPlaceholder?: string;
  filterOptions?: { label: string; value: string }[];
  canDelete?: boolean;
  canEdit?: boolean;
  canCreate?: boolean;
  transformSubmit?: (
    values: Record<string, unknown>,
    editing: T | null,
    raw?: Record<string, unknown>,
  ) => Record<string, unknown>;
  mapItemToForm?: (item: T) => Record<string, unknown>;
  initialForm?: Record<string, unknown>;
  initialFilter?: string;
  formMode?: "inline" | "modal";
  openFormOnMount?: boolean;
  onEditingChange?: (item: T | null) => void;
};

const emptyList = {
  items: [],
  meta: { total: 0, page: 1, limit: 10 },
};

export function CrudPage<T extends Entity>({
  title,
  description,
  sectionLabel = "Administration",
  endpoint,
  fields,
  columns,
  searchPlaceholder = "Search",
  filterOptions,
  canDelete = true,
  canEdit = true,
  canCreate = true,
  transformSubmit,
  mapItemToForm,
  initialForm = {},
  initialFilter = "",
  formMode = "inline",
  openFormOnMount = false,
  onEditingChange,
}: CrudPageProps<T>) {
  const [data, setData] = useState<ListResponse<T>>(emptyList);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<T | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const useModal = formMode === "modal";

  const visibleFields = useMemo(
    () =>
      fields.filter((field) =>
        editing ? !field.createOnly : !field.editOnly,
      ),
    [editing, fields],
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
      if (filter) params.set("filter", filter);

      const response = await apiRequest<ListResponse<T>>(
        `${endpoint}?${params.toString()}`,
      );
      setData(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, filter]);

  useEffect(() => {
    if (openFormOnMount && canCreate) {
      startCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFormOnMount, canCreate]);

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    onEditingChange?.(null);
    setForm(initialForm);
    setError("");
  }

  function startCreate() {
    setEditing(null);
    onEditingChange?.(null);
    setForm(initialForm);
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function startEdit(item: T) {
    setEditing(item);
    onEditingChange?.(item);
    setForm(mapItemToForm ? mapItemToForm(item) : item);
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const cleaned = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value !== ""),
      );
      const body = transformSubmit
        ? transformSubmit(cleaned, editing, form)
        : cleaned;

      if (editing) {
        await apiRequest(`${endpoint}/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setMessage(`${title} updated.`);
      } else {
        await apiRequest(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage(`${title} created.`);
      }

      closeForm();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save");
    } finally {
      setLoading(false);
    }
  }

  async function remove(item: T) {
    const confirmed = window.confirm(`Delete ${title.toLowerCase()} #${item.id}?`);
    if (!confirmed) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await apiRequest(`${endpoint}/${item.id}`, { method: "DELETE" });
      setMessage(`${title} deleted.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const showInlineForm = !useModal && (canCreate || editing);
  const formTitle = editing ? `Edit ${title}` : `Create ${title}`;
  const formDescription = editing
    ? `Update the selected ${title.toLowerCase()} record.`
    : `Add a new ${title.toLowerCase()} record.`;

  const formFields = (
    <div className="grid gap-3 md:grid-cols-2">
      {visibleFields.map((field) => (
        <label key={field.name} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">{field.label}</span>
          {field.type === "select" ? (
            <SearchableSelect
              required={field.required}
              value={String(form[field.name] ?? "")}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  [field.name]: nextValue,
                }))
              }
              options={field.options ?? []}
              emptyOptionLabel={field.emptyOptionLabel ?? "Select"}
              searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
            />
          ) : field.type === "textarea" ? (
            <textarea
              required={field.required}
              placeholder={field.placeholder}
              value={String(form[field.name] ?? "")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))
              }
              className="min-h-24 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
            />
          ) : field.type === "checkbox" ? (
            <input
              type="checkbox"
              checked={Boolean(form[field.name])}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [field.name]: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-slate-300 text-emerald-600"
            />
          ) : (
            <input
              type={field.type ?? "text"}
              required={field.required}
              placeholder={field.placeholder}
              value={String(form[field.name] ?? "")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))
              }
              className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
            />
          )}
        </label>
      ))}
    </div>
  );

  const formActions = (
    <div className="flex gap-3">
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {editing ? "Save Changes" : "Create"}
      </button>
      {useModal ? (
        <button
          type="button"
          onClick={closeForm}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          Cancel
        </button>
      ) : editing ? (
        <button
          type="button"
          onClick={startCreate}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel Edit
        </button>
      ) : null}
    </div>
  );

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {sectionLabel}
        </p>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </header>

      {showInlineForm ? (
        <form
          onSubmit={submit}
          className="rounded-md border border-emerald-900/10 bg-white p-4 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">{formTitle}</h2>
          </div>
          {formFields}
          <div className="mt-4">{formActions}</div>
        </form>
      ) : null}

      {useModal ? (
        <Modal
          open={formOpen}
          title={formTitle}
          description={formDescription}
          onClose={closeForm}
        >
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error ? (
              <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {formFields}
            <div className="border-t border-slate-200 pt-4">{formActions}</div>
          </form>
        </Modal>
      ) : null}

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
              placeholder={searchPlaceholder}
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
            {useModal && canCreate ? (
              <button
                type="button"
                onClick={startCreate}
                className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Create {title}
              </button>
            ) : null}
          </div>

          {filterOptions ? (
            <div className="w-full shrink-0 lg:w-48">
              <SearchableSelect
                value={filter}
                onChange={(nextValue) => {
                  setFilter(nextValue);
                  setPage(1);
                }}
                options={filterOptions}
                emptyOptionLabel="All"
                searchPlaceholder="Search filters..."
              />
            </div>
          ) : null}
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
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 font-semibold">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-700">
                      {column.render
                        ? column.render(item)
                        : String(item[column.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {loading ? "Loading..." : "No records found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>
            Page {data.meta.page} of {totalPages} · {data.meta.total} records
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
    </section>
  );
}
