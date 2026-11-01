"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiRequest } from "@/lib/api";
import { formatDate, formatMoney, monthBoundsLocal } from "@/lib/format";
import { useStaffByRole } from "@/hooks/use-staff";
import { STAFF_ROLE_NAMES } from "@/types/staff";

type Remittance = {
  id: number;
  remittanceNumber: string;
  collectorUserId: number;
  periodStart: string;
  periodEnd: string;
  expectedAmount: string;
  cashReceivedAmount: string;
  variance: string;
  notes?: string | null;
  status: "recorded" | "voided";
  remittanceDate: string;
  collector: { id: number; name: string; email: string };
  receivedBy: { id: number; name: string; email: string };
};

type RemittanceListResponse = {
  items: Remittance[];
  meta: { total: number; page: number; limit: number };
};

type RemittancePreview = {
  collectorUserId: number;
  periodStart: string;
  periodEnd: string;
  paymentCount: number;
  expectedAmount: string;
};

export default function CollectorRemittancesPage() {
  const bounds = monthBoundsLocal();
  const { staff: collectors } = useStaffByRole(STAFF_ROLE_NAMES.COLLECTOR);

  const [collectorUserId, setCollectorUserId] = useState("");
  const [periodStart, setPeriodStart] = useState(bounds.from);
  const [periodEnd, setPeriodEnd] = useState(bounds.to);
  const [cashReceivedAmount, setCashReceivedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<RemittancePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const [items, setItems] = useState<Remittance[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [listCollectorId, setListCollectorId] = useState("");
  const [voidingId, setVoidingId] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (listCollectorId) params.set("collectorUserId", listCollectorId);

      const data = await apiRequest<RemittanceListResponse>(
        `/collector-remittances?${params.toString()}`,
      );
      setItems(data.items);
    } catch (caught) {
      setListError(
        caught instanceof Error ? caught.message : "Unable to load remittances",
      );
    } finally {
      setListLoading(false);
    }
  }, [listCollectorId, page, statusFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!collectorUserId || !periodStart || !periodEnd) {
      setPreview(null);
      return;
    }

    let active = true;
    setPreviewLoading(true);

    const params = new URLSearchParams({
      collectorUserId,
      from: periodStart,
      to: periodEnd,
    });

    apiRequest<RemittancePreview>(`/collector-remittances/preview?${params}`)
      .then((data) => {
        if (!active) return;
        setPreview(data);
        // Do not auto-fill received — Finance must enter physical cash count.
      })
      .catch(() => {
        if (active) setPreview(null);
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collectorUserId, periodEnd, periodStart]);

  const variancePreview = useMemo(() => {
    if (!preview || cashReceivedAmount === "") return null;
    const received = Number(cashReceivedAmount);
    const expected = Number(preview.expectedAmount);
    if (!Number.isFinite(received) || !Number.isFinite(expected)) return null;
    return received - expected;
  }, [cashReceivedAmount, preview]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormMessage("");

    try {
      if (!collectorUserId) {
        throw new Error("Select a collector");
      }

      if (cashReceivedAmount.trim() === "") {
        throw new Error("Enter cash received amount from physical count");
      }

      const received = Number(cashReceivedAmount);
      if (!Number.isFinite(received) || received < 0) {
        throw new Error("Cash received must be a valid amount");
      }

      await apiRequest("/collector-remittances", {
        method: "POST",
        body: JSON.stringify({
          collectorUserId: Number(collectorUserId),
          periodStart,
          periodEnd,
          cashReceivedAmount: received,
          notes: notes.trim() || undefined,
        }),
      });

      setFormMessage("Remittance recorded.");
      setNotes("");
      await loadList();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Unable to record remittance",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid(id: number) {
    const confirmed = window.confirm(`Void remittance #${id}?`);
    if (!confirmed) return;

    setVoidingId(id);
    try {
      await apiRequest(`/collector-remittances/${id}/void`, { method: "POST" });
      await loadList();
    } catch (caught) {
      setListError(
        caught instanceof Error ? caught.message : "Unable to void remittance",
      );
    } finally {
      setVoidingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Billing
        </p>
        <h1 className="text-2xl font-semibold text-slate-950">
          Collector Remittances
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Finance records cash received from a collector based on cash collected
          for the selected period.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-emerald-900/10 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Record cash received
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Collector</span>
            <SearchableSelect
              required
              value={collectorUserId}
              onChange={setCollectorUserId}
              emptyOptionLabel="Select collector"
              options={collectors.map((collector) => ({
                label: `${collector.name} (${collector.email})`,
                value: String(collector.id),
              }))}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Cash Received</span>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={cashReceivedAmount}
              onChange={(event) => setCashReceivedAmount(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Period Start</span>
            <input
              type="date"
              required
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Period End</span>
            <input
              type="date"
              required
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="rounded-md border border-slate-200 px-3 py-2"
              placeholder="Optional notes"
            />
          </label>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          {previewLoading ? (
            <p className="text-slate-500">Loading amount collected...</p>
          ) : preview ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Cash payments
                </p>
                <p className="font-semibold text-slate-900">
                  {preview.paymentCount}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Amount Collected (cash)
                </p>
                <p className="font-semibold text-slate-900">
                  {formatMoney(preview.expectedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Variance
                </p>
                <p
                  className={`font-semibold ${
                    variancePreview == null
                      ? "text-slate-500"
                      : variancePreview === 0
                        ? "text-emerald-700"
                        : "text-amber-700"
                  }`}
                >
                  {variancePreview == null
                    ? "—"
                    : formatMoney(variancePreview)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">
              Select a collector and period to preview cash collected.
            </p>
          )}
        </div>

        {formError ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        ) : null}
        {formMessage ? (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {formMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Record remittance"}
        </button>
      </form>

      <div className="rounded-md border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Filter collector</span>
            <SearchableSelect
              value={listCollectorId}
              onChange={(value) => {
                setPage(1);
                setListCollectorId(value);
              }}
              emptyOptionLabel="All collectors"
              options={collectors.map((collector) => ({
                label: collector.name,
                value: String(collector.id),
              }))}
              className="min-w-[220px] rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="rounded-md border border-slate-200 px-3 py-2"
            >
              <option value="">All</option>
              <option value="recorded">Recorded</option>
              <option value="voided">Voided</option>
            </select>
          </label>
        </div>

        {listError ? (
          <p className="px-4 py-3 text-sm text-red-700">{listError}</p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Remittance</th>
                <th className="px-4 py-3 font-semibold">Collector</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Collected</th>
                <th className="px-4 py-3 font-semibold">Cash Received</th>
                <th className="px-4 py-3 font-semibold">Variance</th>
                <th className="px-4 py-3 font-semibold">Received By</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const variance = Number(item.variance);
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {item.remittanceNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(item.remittanceDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.collector.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(item.periodStart)} –{" "}
                      {formatDate(item.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(item.expectedAmount)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatMoney(item.cashReceivedAmount)}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        variance === 0
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {formatMoney(item.variance)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.receivedBy.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.status === "recorded"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "recorded" ? (
                        <button
                          type="button"
                          disabled={voidingId === item.id}
                          onClick={() => handleVoid(item.id)}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {voidingId === item.id ? "Voiding..." : "Void"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {!items.length ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {listLoading ? "Loading..." : "No remittances yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button
            type="button"
            disabled={items.length < 20}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
