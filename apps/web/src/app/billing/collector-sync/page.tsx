"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useCollectorDaySummary,
  useCollectorSyncEvents,
} from "@/hooks/use-collector-sync";
import { useStaffByRole } from "@/hooks/use-staff";
import { formatDate, formatMoney } from "@/lib/format";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import type {
  CollectorMobileEventStatus,
  CollectorMobileEventType,
  CollectorSyncEvent,
  CollectorDaySummaryParams,
  CollectorSyncEventListParams,
} from "@/types/collector-sync";

const eventTypeOptions: Array<{ label: string; value: CollectorMobileEventType | "" }> = [
  { label: "All event types", value: "" },
  { label: "Payment", value: "payment" },
  { label: "Collection update", value: "collection_update" },
  { label: "Visit note", value: "visit_note" },
];

const resultStatusOptions: Array<{
  label: string;
  value: CollectorMobileEventStatus | "";
}> = [
  { label: "All results", value: "" },
  { label: "Accepted", value: "accepted" },
  { label: "Adjusted", value: "adjusted" },
  { label: "Rejected", value: "rejected" },
  { label: "Duplicate", value: "duplicate" },
];

const resultStyles: Record<CollectorMobileEventStatus, string> = {
  accepted: "bg-emerald-50 text-emerald-700",
  adjusted: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
  duplicate: "bg-slate-100 text-slate-600",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventSummary(event: CollectorSyncEvent) {
  const payload = event.eventPayload;

  if (event.eventType === "payment") {
    const amount = payload.amount;
    const invoiceId = payload.invoiceId;
    return `Invoice #${invoiceId} — ${typeof amount === "number" ? formatMoney(amount) : "payment"}`;
  }

  if (event.eventType === "visit_note") {
    return `Invoice #${payload.invoiceId} — ${titleCase(String(payload.visitOutcome ?? "visit"))}`;
  }

  return `Invoice #${payload.invoiceId} — ${titleCase(String(payload.status ?? "update"))}`;
}

export default function CollectorSyncPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [collectorUserId, setCollectorUserId] = useState("");
  const [summaryDate, setSummaryDate] = useState(today);
  const [eventType, setEventType] = useState<CollectorMobileEventType | "">("");
  const [resultStatus, setResultStatus] = useState<CollectorMobileEventStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<CollectorSyncEvent | null>(null);

  const { staff: collectors } = useStaffByRole(STAFF_ROLE_NAMES.COLLECTOR);

  const eventsQuery = useMemo<CollectorSyncEventListParams>(
    () => ({
      page,
      limit: 20,
      collectorUserId: collectorUserId ? Number(collectorUserId) : "",
      eventType,
      resultStatus,
      from: from ? `${from}T00:00:00.000Z` : "",
      to: to ? `${to}T23:59:59.999Z` : "",
    }),
    [collectorUserId, eventType, from, page, resultStatus, to],
  );

  const summaryQuery = useMemo<CollectorDaySummaryParams>(
    () => ({
      date: summaryDate,
      collectorUserId: collectorUserId ? Number(collectorUserId) : "",
    }),
    [collectorUserId, summaryDate],
  );

  const { data, loading, error } = useCollectorSyncEvents(eventsQuery);
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useCollectorDaySummary(summaryQuery);

  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const issueCount =
    (summary?.sync.byStatus.rejected ?? 0) + (summary?.sync.byStatus.adjusted ?? 0);

  const collectorOptions = [
    { label: "All collectors", value: "" },
    ...collectors.map((collector) => ({
      label: collector.name,
      value: String(collector.id),
    })),
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collector Mobile Sync</h1>
          <p className="text-sm text-slate-500">
            Review mobile upload history, reconcile daily collections, and investigate
            rejected sync events.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Collected today"
          value={summaryLoading ? "…" : formatMoney(summary?.collections.totalCollected ?? 0)}
          hint={`${summary?.collections.paymentCount ?? 0} posted payments`}
          tone="emerald"
        />
        <SummaryCard
          label="Sync events today"
          value={summaryLoading ? "…" : String(summary?.sync.total ?? 0)}
          hint="Mobile uploads processed"
          tone="sky"
        />
        <SummaryCard
          label="Issues today"
          value={summaryLoading ? "…" : String(issueCount)}
          hint="Rejected or adjusted events"
          tone={issueCount > 0 ? "amber" : "slate"}
        />
        <SummaryCard
          label="Collector"
          value={summary?.collector.name ?? "—"}
          hint={summaryDate}
          tone="violet"
        />
      </div>

      {(summaryError || error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {summaryError || error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Collector">
            <SearchableSelect
              value={collectorUserId}
              onChange={(value) => {
                setCollectorUserId(value);
                setPage(1);
              }}
              options={collectorOptions}
              placeholder="All collectors"
            />
          </FilterField>

          <FilterField label="Summary date">
            <input
              type="date"
              value={summaryDate}
              onChange={(event) => setSummaryDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </FilterField>

          <FilterField label="Event type">
            <select
              value={eventType}
              onChange={(event) => {
                setEventType(event.target.value as CollectorMobileEventType | "");
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {eventTypeOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Result">
            <select
              value={resultStatus}
              onChange={(event) => {
                setResultStatus(event.target.value as CollectorMobileEventStatus | "");
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {resultStatusOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="From">
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </FilterField>

          <FilterField label="To">
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </FilterField>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">Processed</th>
                <th className="px-3 py-2 font-medium">Collector</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Summary</th>
                <th className="px-3 py-2 font-medium">Result</th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 font-medium">Device</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    Loading sync events…
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    No mobile sync events found for the selected filters.
                  </td>
                </tr>
              ) : (
                data.items.map((event) => {
                  const needsAttention =
                    event.resultStatus === "rejected" || event.resultStatus === "adjusted";

                  return (
                    <tr
                      key={event.id}
                      className={`border-b border-slate-100 ${
                        needsAttention ? "bg-amber-50/60" : ""
                      }`}
                    >
                      <td className="px-3 py-3">{formatDate(event.processedAt)}</td>
                      <td className="px-3 py-3">{event.collector.name}</td>
                      <td className="px-3 py-3">{titleCase(event.eventType)}</td>
                      <td className="px-3 py-3">
                        <div>{eventSummary(event)}</div>
                        {event.resultMessage ? (
                          <div
                            className={`mt-1 text-xs ${
                              needsAttention ? "font-medium text-amber-800" : "text-slate-500"
                            }`}
                          >
                            {event.resultMessage}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            resultStyles[event.resultStatus]
                          }`}
                        >
                          {titleCase(event.resultStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {event.payment ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {event.payment.paymentNumber}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatMoney(event.payment.amount)}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{event.deviceId}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {data.meta.page} of {totalPages} — {data.meta.total} events
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {summary?.collections.payments.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Posted payments on {formatDate(summaryDate)}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Payment #</th>
                  <th className="px-3 py-2 font-medium">Invoice</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {summary.collections.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100">
                    <td className="px-3 py-3">{payment.paymentNumber}</td>
                    <td className="px-3 py-3">#{payment.invoiceId}</td>
                    <td className="px-3 py-3">{formatMoney(payment.amount)}</td>
                    <td className="px-3 py-3">{titleCase(payment.paymentMethod)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title="Sync event details"
      >
        {selectedEvent ? (
          <div className="space-y-4 text-sm">
            <DetailRow label="Local ID" value={selectedEvent.localId} mono />
            <DetailRow label="Collector" value={selectedEvent.collector.name} />
            <DetailRow label="Processed" value={formatDate(selectedEvent.processedAt)} />
            <DetailRow label="Event type" value={titleCase(selectedEvent.eventType)} />
            <DetailRow label="Result" value={titleCase(selectedEvent.resultStatus)} />
            <DetailRow label="Message" value={selectedEvent.resultMessage ?? "—"} />
            <DetailRow label="Device" value={selectedEvent.deviceId} mono />
            <div>
              <div className="mb-2 font-medium text-slate-700">Payload</div>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify(selectedEvent.eventPayload, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "sky" | "amber" | "violet" | "slate";
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs opacity-80">{hint}</div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
