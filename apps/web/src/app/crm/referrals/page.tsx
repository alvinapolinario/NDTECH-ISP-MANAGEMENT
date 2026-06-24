"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchCustomers } from "@/hooks/use-customers";
import { customerDisplayName } from "@/lib/format";
import type { CustomerSummary } from "@/types/customer";

export default function ReferralsPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchCustomers(search, 500);
      setCustomers(response.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load referrals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const referrals = useMemo(
    () => customers.filter((customer) => customer.referredByCustomerId || customer.referredByCustomer),
    [customers],
  );

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">CRM</p>
        <h1 className="text-2xl font-semibold text-slate-950">Referrals</h1>
        <p className="text-sm text-slate-600">Review customers and prospects created through subscriber referrals.</p>
      </header>

      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search referred customer or referrer" className="w-full rounded-md border px-3 py-2 text-sm" />
          <button onClick={load} className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-700">Search</button>
        </div>
        {error ? <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-emerald-950 text-white">
              <tr><th className="px-4 py-3">Referred Customer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3">Referred By</th><th className="px-4 py-3">Referrer Mobile</th></tr>
            </thead>
            <tbody>
              {referrals.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="px-4 py-3"><Link href={`/crm/customers/${customer.id}`} className="font-medium text-emerald-700 hover:underline">{customer.accountNumber} - {customerDisplayName(customer)}</Link></td>
                  <td className="px-4 py-3 capitalize">{customer.status}</td>
                  <td className="px-4 py-3">{customer.mobileNumber}</td>
                  <td className="px-4 py-3">{customer.referredByCustomer ? `${customer.referredByCustomer.accountNumber} - ${customerDisplayName(customer.referredByCustomer)}` : `Customer #${customer.referredByCustomerId}`}</td>
                  <td className="px-4 py-3">{customer.referredByCustomer?.mobileNumber ?? "-"}</td>
                </tr>
              ))}
              {!referrals.length ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading..." : "No referrals found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
