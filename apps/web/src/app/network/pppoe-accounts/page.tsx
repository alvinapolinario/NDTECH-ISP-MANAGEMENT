"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/network/status-badge";
import { useCustomers } from "@/hooks/use-customers";
import {
  createPppoeAccount,
  deletePppoeAccount,
  fetchMikrotikRouters,
  fetchPppoeAccounts,
  fetchPppoeActionLogs,
  fetchPppoeProfiles,
  type PppoeAccountActionLog,
  linkPppoeAccountToSubscription,
  runPppoeAction,
  syncPppoeAccounts,
  updatePppoeAccount,
} from "@/hooks/use-mikrotik";
import { fetchSubscriptions } from "@/hooks/use-subscriptions";
import { useServicePlans } from "@/hooks/use-service-plans";
import { customerDisplayName, formatDate } from "@/lib/format";
import type { PppoeAccount, PppoeAccountStatus } from "@/types/mikrotik";
import type { MikrotikRouter } from "@/types/mikrotik";
import type { Subscription } from "@/types/subscription";

type AccountForm = {
  customerId: string;
  servicePlanId: string;
  routerId: string;
  username: string;
  password: string;
  profileName: string;
  remoteAddress: string;
  status: PppoeAccountStatus;
};

const emptyForm: AccountForm = {
  customerId: "",
  servicePlanId: "",
  routerId: "",
  username: "",
  password: "",
  profileName: "",
  remoteAddress: "",
  status: "active",
};

export default function PppoeAccountsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [routerId, setRouterId] = useState("");
  const [importRouterId, setImportRouterId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: PppoeAccount[]; meta: { total: number; page: number; limit: number } }>({
    items: [],
    meta: { total: 0, page: 1, limit: 10 },
  });
  const [routers, setRouters] = useState<MikrotikRouter[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsAccount, setLogsAccount] = useState<PppoeAccount | null>(null);
  const [actionLogs, setActionLogs] = useState<PppoeAccountActionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editing, setEditing] = useState<PppoeAccount | null>(null);
  const [linkingAccount, setLinkingAccount] = useState<PppoeAccount | null>(null);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [pppProfiles, setPppProfiles] = useState<string[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { customers } = useCustomers();
  const { plans } = useServicePlans();

  const query = useMemo(
    () => ({
      search,
      status,
      routerId: routerId ? Number(routerId) : ("" as const),
      page,
      limit: 10,
    }),
    [page, routerId, search, status],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await fetchPppoeAccounts(query));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query.page, query.search, query.status, query.routerId]);

  useEffect(() => {
    fetchMikrotikRouters({ limit: 100 })
      .then((response) => setRouters(response.items))
      .catch(() => setRouters([]));
  }, []);

  async function loadPppProfiles(routerId: string) {
    if (!routerId) {
      setPppProfiles([]);
      return;
    }

    setProfilesLoading(true);
    try {
      const response = await fetchPppoeProfiles(Number(routerId));
      setPppProfiles(response.items.map((profile) => profile.name));
    } catch {
      setPppProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }

  useEffect(() => {
    if (!formOpen) return;
    loadPppProfiles(form.routerId);
  }, [formOpen, form.routerId]);

  const profileOptions = useMemo(() => {
    const names = new Set(pppProfiles);
    if (form.profileName) {
      names.add(form.profileName);
    }

    return Array.from(names)
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({ label: name, value: name }));
  }, [form.profileName, pppProfiles]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(account: PppoeAccount) {
    setEditing(account);
    setForm({
      customerId: account.customerId ? String(account.customerId) : "",
      servicePlanId: account.servicePlanId ? String(account.servicePlanId) : "",
      routerId: String(account.routerId),
      username: account.username,
      password: "",
      profileName: account.profileName,
      remoteAddress: account.remoteAddress ?? "",
      status: account.status,
    });
    setFormOpen(true);
  }

  async function openLink(account: PppoeAccount) {
    setLinkingAccount(account);
    setSubscriberSearch("");
    setLinkOpen(true);
    await loadSubscribers("");
  }

  async function loadSubscribers(searchValue = subscriberSearch) {
    setSubscribersLoading(true);
    setError("");

    try {
      const response = await fetchSubscriptions({
        search: searchValue,
        status: "active",
        limit: 100,
      });
      setSubscribers(response.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load subscribers");
    } finally {
      setSubscribersLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const body: Record<string, unknown> = {
      customerId: Number(form.customerId),
      servicePlanId: Number(form.servicePlanId),
      routerId: Number(form.routerId),
      username: form.username,
      profileName: form.profileName,
      remoteAddress: form.remoteAddress || undefined,
      status: form.status,
    };
    if (form.password) body.password = form.password;

    try {
      if (editing) {
        await updatePppoeAccount(editing.id, body);
        setMessage("PPPoE account updated and pushed to MikroTik /ppp/secret.");
      } else {
        if (!form.password) {
          setError("Password is required for new PPPoE accounts.");
          return;
        }
        await createPppoeAccount(body);
        setMessage("PPPoE account created.");
      }
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save account");
    } finally {
      setLoading(false);
    }
  }

  async function openActionLogs(account: PppoeAccount) {
    setLogsAccount(account);
    setLogsOpen(true);
    setLogsLoading(true);
    setActionLogs([]);
    try {
      const response = await fetchPppoeActionLogs(account.id);
      setActionLogs(response.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load action logs");
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleAction(id: number, action: "enable" | "disable" | "suspend") {
    setLoading(true);
    setMessage("");
    try {
      await runPppoeAction(id, action);
      const labels = {
        enable: "enabled / profile restored",
        suspend: "suspended (limited profile on router)",
        disable: "disabled on router",
      };
      setMessage(`PPPoE account ${labels[action]}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to ${action} account`);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportFromMikrotik() {
    if (!importRouterId) {
      setError("Select a MikroTik router before importing PPPoE accounts.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await syncPppoeAccounts(Number(importRouterId));
      setRouterId(importRouterId);
      setPage(1);
      setMessage(
        `${result.message}: fetched ${result.fetched}, imported ${result.imported}, updated ${result.updated}.`,
      );
      setData(
        await fetchPppoeAccounts({
          search,
          status,
          routerId: Number(importRouterId),
          page: 1,
          limit: 10,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to import PPPoE accounts from MikroTik",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkSubscription(subscription: Subscription) {
    if (!linkingAccount) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await linkPppoeAccountToSubscription(linkingAccount.id, subscription.id);
      setMessage(
        `${linkingAccount.username} linked to ${customerDisplayName(subscription.customer)}.`,
      );
      setLinkOpen(false);
      setLinkingAccount(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to link subscriber");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Network Operations
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">PPPoE Accounts</h1>
          <p className="text-sm text-slate-600">
            Manage subscriber PPPoE credentials linked to customers, plans, and routers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Add PPPoE Account
          </button>
        </div>
      </header>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-emerald-900/10 bg-emerald-50/60 p-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">
              Import accounts from MikroTik
            </div>
            <p className="text-xs text-slate-600">
              Reads RouterOS PPP accounts from /ppp/secret/print for the selected router.
            </p>
          </div>
          <SearchableSelect
            value={importRouterId}
            onChange={(nextValue) => setImportRouterId(nextValue)}
            emptyOptionLabel="Select MikroTik router"
            options={routers.map((router) => ({
              label: `${router.name} (${router.host})`,
              value: String(router.id),
            }))}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleImportFromMikrotik}
            disabled={!importRouterId || loading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            Import Accounts
          </button>
        </div>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, customer, or profile"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <SearchableSelect
            value={status}
            onChange={(nextValue) => {
              setStatus(nextValue);
              setPage(1);
            }}
            includeEmptyOption={false}
            options={[
              { label: "All statuses", value: "" },
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
              { label: "Disabled", value: "disabled" },
            ]}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <SearchableSelect
            value={routerId}
            onChange={(nextValue) => {
              setRouterId(nextValue);
              setPage(1);
            }}
            includeEmptyOption={false}
            options={[
              { label: "All routers", value: "" },
              ...routers.map((router) => ({
                label: router.name,
                value: String(router.id),
              })),
            ]}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => { setPage(1); load(); }} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">
            Search
          </button>
        </div>

        {message ? <div className="border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Router</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Synced</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((account) => (
                <tr key={account.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {account.customer ? (
                      customerDisplayName(account.customer)
                    ) : (
                      <button
                        type="button"
                        onClick={() => openLink(account)}
                        className="rounded border border-emerald-600 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        Link subscriber
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{account.username}</td>
                  <td className="px-4 py-3">
                    {account.servicePlan?.name ?? "Unmatched"}
                  </td>
                  <td className="px-4 py-3">{account.router.name}</td>
                  <td className="px-4 py-3">
                    <div>{account.profileName}</div>
                    {account.activeProfileName &&
                    account.status === "suspended" ? (
                      <div className="text-xs text-slate-500">
                        restores to {account.activeProfileName}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={account.status} /></td>
                  <td className="px-4 py-3">{formatDate(account.lastSyncedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" onClick={() => handleAction(account.id, "enable")} className="rounded border px-2 py-1 text-xs">Enable</button>
                      <button type="button" onClick={() => handleAction(account.id, "suspend")} className="rounded border px-2 py-1 text-xs">Suspend</button>
                      <button type="button" onClick={() => handleAction(account.id, "disable")} className="rounded border px-2 py-1 text-xs">Disable</button>
                      <button type="button" onClick={() => openActionLogs(account)} className="rounded border px-2 py-1 text-xs">Logs</button>
                      <button type="button" onClick={() => openEdit(account)} className="rounded border px-2 py-1 text-xs">Edit</button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${account.username}?`)) return;
                          await deletePppoeAccount(account.id);
                          setMessage("PPPoE account deleted.");
                          await load();
                        }}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {loading ? "Loading..." : "No PPPoE accounts found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600">
          <span>Page {data.meta.page} of {totalPages} · {data.meta.total} records</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "Edit PPPoE Account" : "Add PPPoE Account"}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Customer</span>
            <SearchableSelect required value={form.customerId} onChange={(nextValue) => setForm((c) => ({ ...c, customerId: nextValue }))} emptyOptionLabel="Select customer" options={customers.map((customer) => ({ label: customerDisplayName(customer), value: String(customer.id) }))} className="rounded-md border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Service Plan</span>
            <SearchableSelect required value={form.servicePlanId} onChange={(nextValue) => setForm((c) => ({ ...c, servicePlanId: nextValue }))} emptyOptionLabel="Select plan" options={plans.map((plan) => ({ label: plan.name, value: String(plan.id) }))} className="rounded-md border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Router</span>
            <SearchableSelect
              required
              value={form.routerId}
              onChange={(nextValue) =>
                setForm((current) => ({
                  ...current,
                  routerId: nextValue,
                  profileName:
                    current.routerId === nextValue ? current.profileName : "",
                }))
              }
              emptyOptionLabel="Select router"
              options={routers.map((router) => ({
                label: router.name,
                value: String(router.id),
              }))}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Username</span>
            <input required value={form.username} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} className="rounded-md border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium">Password {editing ? "(optional)" : ""}</span>
            <input type="password" required={!editing} value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} className="rounded-md border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Profile</span>
            <SearchableSelect
              required
              value={form.profileName}
              onChange={(nextValue) =>
                setForm((current) => ({ ...current, profileName: nextValue }))
              }
              disabled={!form.routerId || profilesLoading}
              emptyOptionLabel={
                !form.routerId
                  ? "Select router first"
                  : profilesLoading
                    ? "Loading profiles..."
                    : "Select PPP profile"
              }
              options={profileOptions}
              className="rounded-md border px-3 py-2 disabled:bg-slate-100"
            />
            <span className="text-xs text-slate-500">
              Loaded from MikroTik /ppp/profile on the selected router.
              {editing ? " Saving applies the profile to /ppp/secret." : ""}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Remote Address</span>
            <input value={form.remoteAddress} onChange={(e) => setForm((c) => ({ ...c, remoteAddress: e.target.value }))} className="rounded-md border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Status</span>
            <SearchableSelect value={form.status} onChange={(nextValue) => setForm((c) => ({ ...c, status: nextValue as PppoeAccountStatus }))} includeEmptyOption={false} options={[{ label: "Active", value: "active" }, { label: "Suspended", value: "suspended" }, { label: "Disabled", value: "disabled" }]} className="rounded-md border px-3 py-2" />
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={loading || !form.profileName || profilesLoading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {editing ? "Save Changes" : "Create Account"}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={logsOpen}
        title={logsAccount ? `Action logs — ${logsAccount.username}` : "Action logs"}
        onClose={() => setLogsOpen(false)}
      >
        <div className="max-h-[480px] overflow-auto rounded-md border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Profile</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Invoice / Payment</th>
              </tr>
            </thead>
            <tbody>
              {actionLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-3 py-2 capitalize">{log.action.replace("_", " ")}</td>
                  <td className="px-3 py-2">
                    {log.previousProfile || log.newProfile ? (
                      <span>
                        {log.previousProfile ?? "—"} → {log.newProfile ?? "—"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {log.previousStatus || log.newStatus ? (
                      <span>
                        {log.previousStatus ?? "—"} → {log.newStatus ?? "—"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="capitalize">{log.triggerSource}</div>
                    {log.performedBy ? (
                      <div className="text-xs text-slate-500">{log.performedBy.name}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {log.invoice ? (
                      <div>{log.invoice.invoiceNumber}</div>
                    ) : null}
                    {log.payment ? (
                      <div className="text-slate-500">{log.payment.paymentNumber}</div>
                    ) : null}
                    {!log.invoice && !log.payment ? "—" : null}
                  </td>
                </tr>
              ))}
              {!actionLogs.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    {logsLoading ? "Loading logs..." : "No actions recorded yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal
        open={linkOpen}
        title={linkingAccount ? `Link ${linkingAccount.username}` : "Link Subscriber"}
        onClose={() => setLinkOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-2 md:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              loadSubscribers();
            }}
          >
            <input
              value={subscriberSearch}
              onChange={(event) => setSubscriberSearch(event.target.value)}
              placeholder="Search subscriber name or account number"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={subscribersLoading}
              className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700"
            >
              Browse
            </button>
          </form>

          <div className="max-h-[420px] overflow-auto rounded-md border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-emerald-950 text-white">
                <tr>
                  <th className="px-3 py-2">Subscriber</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">PPPoE</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {customerDisplayName(subscription.customer)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {subscription.customer.accountNumber}
                      </div>
                    </td>
                    <td className="px-3 py-2">{subscription.servicePlan.name}</td>
                    <td className="px-3 py-2 capitalize">{subscription.status}</td>
                    <td className="px-3 py-2">
                      {subscription.pppoeAccount?.username ?? "None"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={
                          loading ||
                          Boolean(
                            subscription.pppoeAccount &&
                              subscription.pppoeAccount.id !== linkingAccount?.id,
                          )
                        }
                        onClick={() => handleLinkSubscription(subscription)}
                        className="rounded border border-emerald-600 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:border-slate-200 disabled:text-slate-400"
                      >
                        Link
                      </button>
                    </td>
                  </tr>
                ))}
                {!subscribers.length ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      {subscribersLoading ? "Loading subscribers..." : "No active subscribers found."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </section>
  );
}
