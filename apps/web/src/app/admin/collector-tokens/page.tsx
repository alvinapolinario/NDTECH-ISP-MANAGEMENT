"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode } from "lucide-react";
import { CollectorSetupQr } from "@/components/admin/collector-setup-qr";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createApiAccessToken,
  revokeApiAccessToken,
  useApiAccessTokens,
} from "@/hooks/use-api-access-tokens";
import { useStaffByRole } from "@/hooks/use-staff";
import { API_BASE_URL } from "@/lib/api";
import {
  isLocalhostApiUrl,
  readStoredMobileApiUrl,
  storeMobileApiUrl,
} from "@/lib/collector-auth-qr";
import { formatDate } from "@/lib/format";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import type {
  ApiAccessToken,
  ApiAccessTokenStatus,
  CreateApiAccessTokenResponse,
} from "@/types/api-access-token";

const statusOptions: Array<{ label: string; value: ApiAccessTokenStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Revoked", value: "revoked" },
  { label: "Expired", value: "expired" },
];

const statusStyles: Record<ApiAccessTokenStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  revoked: "bg-red-50 text-red-700",
  expired: "bg-slate-100 text-slate-600",
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CollectorTokensPage() {
  const [collectorUserId, setCollectorUserId] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApiAccessTokenStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [issuedToken, setIssuedToken] = useState<CreateApiAccessTokenResponse | null>(null);
  const [selectedCollectorId, setSelectedCollectorId] = useState("");
  const [mobileApiUrl, setMobileApiUrl] = useState(API_BASE_URL);
  const [label, setLabel] = useState("Collector mobile app");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const { staff: collectors } = useStaffByRole(STAFF_ROLE_NAMES.COLLECTOR);

  useEffect(() => {
    setMobileApiUrl(readStoredMobileApiUrl(API_BASE_URL));
  }, []);

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      search,
      filter: statusFilter,
      userId: collectorUserId ? Number(collectorUserId) : ("" as const),
    }),
    [collectorUserId, page, search, statusFilter],
  );

  const { data, loading, error, reload } = useApiAccessTokens(query);
  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const localhostWarning = isLocalhostApiUrl(mobileApiUrl);

  const collectorOptions = [
    { label: "All collectors", value: "" },
    ...collectors.map((collector) => ({
      label: `${collector.name} (${collector.email})`,
      value: String(collector.id),
    })),
  ];

  const selectedCollector = collectors.find(
    (collector) => String(collector.id) === selectedCollectorId,
  );

  function persistMobileApiUrl() {
    storeMobileApiUrl(mobileApiUrl);
    setActionMessage("Mobile API URL saved for future QR generation.");
  }

  async function handleGenerateQr() {
    if (!selectedCollectorId) {
      setCreateError("Select a collector");
      return;
    }

    if (!mobileApiUrl.trim()) {
      setCreateError("Mobile API URL is required for the Flutter setup QR");
      return;
    }

    setCreating(true);
    setCreateError("");
    storeMobileApiUrl(mobileApiUrl);

    try {
      const result = await createApiAccessToken({
        userId: Number(selectedCollectorId),
        label: label.trim() || "Collector mobile app",
      });
      setIssuedToken(result);
      setActionMessage(`Setup QR generated for ${result.user.name}`);
      await reload();
    } catch (caught) {
      setCreateError(
        caught instanceof Error ? caught.message : "Unable to generate setup QR",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(token: ApiAccessToken) {
    const confirmed = window.confirm(
      `Revoke token for ${token.user.name}? The collector app will stop working with this token immediately.`,
    );
    if (!confirmed) return;

    setRevokingId(token.id);
    setActionError("");
    setActionMessage("");

    try {
      await revokeApiAccessToken(token.id);
      setActionMessage(`Token #${token.id} revoked`);
      await reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to revoke token");
    } finally {
      setRevokingId(null);
    }
  }

  function openGenerateModal() {
    setCreateOpen(true);
    setIssuedToken(null);
    setCreateError("");
    setSelectedCollectorId("");
    setLabel("Collector mobile app");
  }

  function closeCreateModal() {
    setCreateOpen(false);
    setIssuedToken(null);
    setCreateError("");
    setSelectedCollectorId("");
    setLabel("Collector mobile app");
  }

  async function copyToken() {
    if (!issuedToken?.token || !navigator.clipboard) return;
    await navigator.clipboard.writeText(issuedToken.token);
    setActionMessage("Token copied to clipboard");
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Administration
          </p>
          <h1 className="text-2xl font-bold text-slate-950">Collector API Tokens</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Create Bearer tokens and generate setup QR codes for the Flutter collector app.
            Each token is bound to one collector account only.
          </p>
        </div>
        <button
          type="button"
          onClick={openGenerateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <QrCode className="h-4 w-4" />
          Generate setup QR
        </button>
      </div>

      {actionMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold text-slate-900">Flutter app QR setup</h2>
            <p className="mt-1 text-sm text-slate-600">
              Set the API URL that phones on your office Wi-Fi can reach, then generate a
              QR code. Collectors scan it in the app under Settings → Scan setup QR.
            </p>
          </div>
          <div className="w-full max-w-md space-y-2">
            <label className="block text-xs font-medium text-slate-500">
              Default mobile API URL
            </label>
            <input
              value={mobileApiUrl}
              onChange={(event) => setMobileApiUrl(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="http://192.168.1.10:4000"
            />
            {localhostWarning ? (
              <p className="text-xs text-amber-700">
                localhost will not work on physical phones. Use your server LAN IP.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Saved automatically when you generate a setup QR.
              </p>
            )}
            <button
              type="button"
              onClick={persistMobileApiUrl}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Save default URL
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Collector</label>
          <SearchableSelect
            value={collectorUserId}
            onChange={(value) => {
              setCollectorUserId(value);
              setPage(1);
            }}
            options={collectorOptions}
            placeholder="All collectors"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as ApiAccessTokenStatus | "");
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Label, collector name, or email"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {error ? (
          <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Loading tokens…</div>
        ) : data.items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No API tokens yet. Click Generate setup QR to create a token and QR for a
            collector.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Collector</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Last used</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((token) => (
                  <tr key={token.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{token.user.name}</div>
                      <div className="text-xs text-slate-500">{token.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{token.label ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[token.status]}`}
                      >
                        {token.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(token.expiresAt)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(token.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(token.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {token.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(token)}
                          disabled={revokingId === token.id}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {revokingId === token.id ? "Revoking…" : "Revoke"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {data.meta.page} of {totalPages} ({data.meta.total} tokens)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={createOpen}
        title={issuedToken ? "Flutter setup QR ready" : "Generate Flutter setup QR"}
        description={
          issuedToken
            ? "Show this QR to the collector or download it. The token is only shown once."
            : "Creates a collector token and encodes the API URL + token into a QR code."
        }
        onClose={closeCreateModal}
        footer={
          issuedToken ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={copyToken}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Copy token
              </button>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateQr}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <QrCode className="h-4 w-4" />
                {creating ? "Generating…" : "Generate QR"}
              </button>
            </div>
          )
        }
      >
        {issuedToken ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Setup QR for <strong>{issuedToken.user.name}</strong>. Expires{" "}
              {formatDate(issuedToken.expiresAt)}.
            </div>

            <CollectorSetupQr
              apiUrl={mobileApiUrl}
              token={issuedToken.token}
              collectorName={issuedToken.user.name}
              size={300}
            />

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-2">
              <div>
                <div className="font-medium text-slate-700">Mobile API URL</div>
                <code className="mt-1 block break-all">{mobileApiUrl}</code>
              </div>
              <div>
                <div className="font-medium text-slate-700">Collector email</div>
                <code className="mt-1 block break-all">{issuedToken.user.email}</code>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Bearer token (backup)
              </label>
              <textarea
                readOnly
                rows={3}
                value={issuedToken.token}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Collector</label>
              <SearchableSelect
                value={selectedCollectorId}
                onChange={setSelectedCollectorId}
                options={collectors.map((collector) => ({
                  label: `${collector.name} (${collector.email})`,
                  value: String(collector.id),
                }))}
                placeholder="Select collector"
              />
              {selectedCollector ? (
                <p className="mt-1 text-xs text-slate-500">
                  QR will sign in as {selectedCollector.name} only.
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mobile API URL
              </label>
              <input
                value={mobileApiUrl}
                onChange={(event) => setMobileApiUrl(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="http://192.168.1.10:4000"
              />
              {localhostWarning ? (
                <p className="mt-1 text-xs text-amber-700">
                  Physical phones cannot reach localhost. Use your server LAN IP.
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Encoded into the QR so the Flutter app connects to the right server.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Label</label>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Collector mobile app"
              />
            </div>
            {createError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
