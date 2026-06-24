"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

type SmsMessage = {
  id: number;
  recipient: string;
  message: string;
  senderName?: string | null;
  status: "queued" | "sent" | "failed" | "skipped";
  semaphoreStatus?: string | null;
  network?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  customer?: {
    id: number;
    accountNumber: string;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
  } | null;
  sentBy?: { id: number; name: string } | null;
};

type SmsListResponse = {
  items: SmsMessage[];
  meta: { total: number; page: number; limit: number };
};

type SemaphoreAccount = {
  account_name: string;
  credit_balance: number;
  status: string;
};

const statusStyles: Record<SmsMessage["status"], string> = {
  sent: "bg-emerald-50 text-emerald-700",
  queued: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  skipped: "bg-slate-100 text-slate-600",
};

export default function SmsPage() {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const [account, setAccount] = useState<SemaphoreAccount | null>(null);
  const [accountError, setAccountError] = useState("");
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);

  const loadAccount = useCallback(async () => {
    try {
      const data = await apiRequest<SemaphoreAccount>("/sms/account");
      setAccount(data);
      setAccountError("");
    } catch (error) {
      setAccount(null);
      setAccountError(
        error instanceof Error ? error.message : "Unable to load Semaphore account",
      );
    }
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<SmsListResponse>(
        `/sms/messages?page=${page}&limit=20`,
      );
      setMessages(data.items);
      setListError("");
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Unable to load SMS log");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setSendError("");
    setSendSuccess("");

    try {
      await apiRequest("/sms/send", {
        method: "POST",
        body: JSON.stringify({ number, message }),
      });
      setSendSuccess("SMS queued successfully.");
      setNumber("");
      setMessage("");
      await Promise.all([loadMessages(), loadAccount()]);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send SMS");
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
          <MessageSquareText className="h-4 w-4" />
          Administration
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">SMS (Semaphore)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Send SMS to Philippine mobile numbers and review delivery logs.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form
          onSubmit={handleSend}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Send SMS</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use formats like 09171234567 or 639171234567.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Mobile number
              <input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="09171234567"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Your billing reminder or notice..."
                required
              />
            </label>
          </div>

          {sendError ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {sendError}
            </p>
          ) : null}
          {sendSuccess ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {sendSuccess}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send SMS"}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Semaphore Account</h2>
          {account ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Account</dt>
                <dd className="font-medium text-slate-900">{account.account_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Credits</dt>
                <dd className="text-2xl font-bold text-violet-700">
                  {account.credit_balance}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium capitalize text-slate-900">{account.status}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-red-600">
              {accountError || "Semaphore account unavailable."}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">SMS Log</h2>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-500">Loading messages...</p>
        ) : listError ? (
          <p className="px-5 py-8 text-sm text-red-600">{listError}</p>
        ) : messages.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">No SMS messages yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Recipient</th>
                  <th className="px-5 py-3 font-medium">Message</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{item.recipient}</td>
                    <td className="px-5 py-3 max-w-md truncate" title={item.message}>
                      {item.message}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                      >
                        {item.status}
                      </span>
                      {item.errorMessage ? (
                        <p className="mt-1 text-xs text-red-600">{item.errorMessage}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {item.customer?.accountNumber ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button
            type="button"
            disabled={messages.length < 20}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
