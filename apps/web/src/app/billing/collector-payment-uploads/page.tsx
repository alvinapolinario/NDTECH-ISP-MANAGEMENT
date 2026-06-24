"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useCollectorPaymentUploads,
  useCollectorPaymentUploadSummary,
} from "@/hooks/use-collector-sync";
import { useStaffByRole } from "@/hooks/use-staff";
import { formatDate, formatMoney } from "@/lib/format";
import { STAFF_ROLE_NAMES } from "@/types/staff";
import type {
  CollectorMobileEventStatus,
  CollectorPaymentUpload,
  CollectorPaymentUploadListParams,
} from "@/types/collector-sync";

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

export default function CollectorPaymentUploadsPage() {
  const [collectorUserId, setCollectorUserId] = useState("");
  const [resultStatus, setResultStatus] = useState<CollectorMobileEventStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUpload, setSelectedUpload] = useState<CollectorPaymentUpload | null>(
    null,
  );

  const { staff: collectors } = useStaffByRole(STAFF_ROLE_NAMES.COLLECTOR);

  const query = useMemo<CollectorPaymentUploadListParams>(
    () => ({
      page,
      limit: 20,
      collectorUserId: collectorUserId ? Number(collectorUserId) : "",
      resultStatus,
      from: from ? `${from}T00:00:00.000Z` : "",
      to: to ? `${to}T23:59:59.999Z` : "",
    }),
    [collectorUserId, from, page, resultStatus, to],
  );

  const { data, loading, error } = useCollectorPaymentUploads(query);
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useCollectorPaymentUploadSummary(query);

  const totalPages = Math.max(Math.ceil(data.meta.total / data.meta.limit), 1);
  const issueCount =
    (summary?.byStatus.rejected ?? 0) + (summary?.byStatus.adjusted ?? 0);

  const collectorOptions = [
    { label: "All collectors", value: "" },
    ...collectors.map((collector) => ({
      label: collector.name,
      value: String(collector.id),
    })),
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Collector Payment Uploads</h1>
        <p className="text-sm text-slate-500">
          Audit log of payment uploads from the Flutter collector app, including
          accepted, adjusted, rejected, and duplicate sync results.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Upload attempts"
          value={summaryLoading ? "…" : String(summary?.totalUploads ?? 0)}
          hint="Payment events in selected range"
          tone="sky"
        />
        <SummaryCard
          label="Amount uploaded"
          value={summaryLoading ? "…" : formatMoney(summary?.totalUploaded ?? 0)}
          hint="Requested by collectors"
          tone="violet"
        />
        <SummaryCard
          label="Amount posted"
          value={summaryLoading ? "…" : formatMoney(summary?.totalPosted ?? 0)}
          hint="Successfully recorded in billing"
          tone="emerald"
        />
        <SummaryCard
          label="Issues"
          value={summaryLoading ? "…" : String(issueCount)}
          hint="Rejected or adjusted uploads"
          tone={issueCount > 0 ? "amber" : "slate"}
        />
      </div>

      {(summaryError || error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {summaryError || error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                <th className="px-3 py-2 font-medium">Uploaded</th>
                <th className="px-3 py-2 font-medium">Collector</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Invoice</th>
                <th className="px-3 py-2 font-medium">Uploaded</th>
                <th className="px-3 py-2 font-medium">Posted</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Result</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    Loading payment uploads…
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    No collector payment uploads found for the selected filters.
                  </td>
                </tr>
              ) : (
                data.items.map((upload) => {
                  const needsAttention =
                    upload.resultStatus === "rejected" ||
                    upload.resultStatus === "adjusted";

                  return (
                    <tr
                      key={upload.id}
                      className={`border-b border-slate-100 ${
                        needsAttention ? "bg-amber-50/60" : ""
                      }`}
                    >
                      <td className="px-3 py-3">{formatDate(upload.processedAt)}</td>
                      <td className="px-3 py-3">{upload.collector.name}</td>
                      <td className="px-3 py-3">
                        <div>{upload.customerName ?? "—"}</div>
                        {upload.customerAccountNumber ? (
                          <div className="text-xs text-slate-500">
                            {upload.customerAccountNumber}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        {upload.invoiceNumber ?? `Invoice #${upload.invoiceId}`}
                      </td>
                      <td className="px-3 py-3">{formatMoney(upload.uploadedAmount)}</td>
                      <td className="px-3 py-3">
                        {upload.payment ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {upload.payment.paymentNumber}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatMoney(upload.payment.amount)}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {upload.paymentMethod
                          ? titleCase(upload.paymentMethod)
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            resultStyles[upload.resultStatus]
                          }`}
                        >
                          {titleCase(upload.resultStatus)}
                        </span>
                        {upload.resultMessage ? (
                          <div
                            className={`mt-1 text-xs ${
                              needsAttention
                                ? "font-medium text-amber-800"
                                : "text-slate-500"
                            }`}
                          >
                            {upload.resultMessage}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUpload(upload)}
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
            Page {data.meta.page} of {totalPages} — {data.meta.total} uploads
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

      <Modal
        open={Boolean(selectedUpload)}
        onClose={() => setSelectedUpload(null)}
        title="Payment upload details"
      >
        {selectedUpload ? (
          <div className="space-y-4 text-sm">
            <DetailRow label="Local ID" value={selectedUpload.localId} mono />
            <DetailRow label="Collector" value={selectedUpload.collector.name} />
            <DetailRow label="Uploaded" value={formatDate(selectedUpload.processedAt)} />
            <DetailRow label="Collection date" value={formatDate(selectedUpload.paymentDate)} />
            <DetailRow
              label="Customer"
              value={selectedUpload.customerName ?? "—"}
            />
            <DetailRow
              label="Account"
              value={selectedUpload.customerAccountNumber ?? "—"}
            />
            <DetailRow
              label="Invoice"
              value={
                selectedUpload.invoiceNumber ??
                `Invoice #${selectedUpload.invoiceId}`
              }
            />
            <DetailRow
              label="Uploaded amount"
              value={formatMoney(selectedUpload.uploadedAmount)}
            />
            <DetailRow
              label="Payment method"
              value={
                selectedUpload.paymentMethod
                  ? titleCase(selectedUpload.paymentMethod)
                  : "—"
              }
            />
            <DetailRow
              label="Mobile receipt"
              value={selectedUpload.localReceiptNumber ?? "—"}
              mono
            />
            <DetailRow label="Result" value={titleCase(selectedUpload.resultStatus)} />
            <DetailRow label="Message" value={selectedUpload.resultMessage ?? "—"} />
            <DetailRow label="Device" value={selectedUpload.deviceId} mono />
            <DetailRow
              label="Posted payment"
              value={
                selectedUpload.payment
                  ? `${selectedUpload.payment.paymentNumber} (${formatMoney(selectedUpload.payment.amount)})`
                  : "—"
              }
            />
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
