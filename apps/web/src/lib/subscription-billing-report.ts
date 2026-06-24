import { customerDisplayName, formatDate, formatMoney } from "@/lib/format";
import type { Invoice } from "@/types/invoice";
import type { Payment } from "@/types/payment";
import type { Subscription } from "@/types/subscription";

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type SubscriptionBillingReportData = {
  subscription: Subscription;
  invoices: Invoice[];
  payments: Payment[];
};

function buildReportHtml(data: SubscriptionBillingReportData) {
  const { subscription, invoices, payments } = data;
  const customerName = customerDisplayName(subscription.customer);
  const generatedAt = new Date().toLocaleString();

  const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const totalPaid = payments
    .filter((payment) => payment.status === "posted")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.balance), 0);

  const invoiceRows = invoices
    .map(
      (invoice) => `
        <tr>
          <td>${escapeHtml(invoice.invoiceNumber)}</td>
          <td>${escapeHtml(invoice.billingCycle.name)}</td>
          <td>${escapeHtml(formatDate(invoice.issueDate))}</td>
          <td>${escapeHtml(formatDate(invoice.dueDate))}</td>
          <td class="num">${escapeHtml(formatMoney(invoice.total))}</td>
          <td class="num">${escapeHtml(formatMoney(invoice.amountPaid))}</td>
          <td class="num">${escapeHtml(formatMoney(invoice.balance))}</td>
          <td>${escapeHtml(titleCase(invoice.status))}</td>
        </tr>
      `,
    )
    .join("");

  const paymentRows = payments
    .map(
      (payment) => `
        <tr>
          <td>${escapeHtml(payment.paymentNumber)}</td>
          <td>${escapeHtml(payment.invoice.invoiceNumber)}</td>
          <td>${escapeHtml(formatDate(payment.paymentDate))}</td>
          <td class="num">${escapeHtml(formatMoney(payment.amount))}</td>
          <td>${escapeHtml(titleCase(payment.paymentMethod))}</td>
          <td>${escapeHtml(payment.referenceNumber || "—")}</td>
          <td>${escapeHtml(payment.receivedBy || "—")}</td>
          <td>${escapeHtml(titleCase(payment.status))}</td>
        </tr>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Subscription #${subscription.id} Billing History</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        margin: 24px;
        font-size: 12px;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 4px;
      }
      .meta {
        color: #64748b;
        margin-bottom: 18px;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin: 16px 0 24px;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
      }
      .card-label {
        color: #64748b;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .card-value {
        font-size: 18px;
        font-weight: 700;
        margin-top: 4px;
      }
      h2 {
        font-size: 14px;
        margin: 24px 0 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }
      th, td {
        border: 1px solid #e2e8f0;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f8fafc;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .footer {
        margin-top: 24px;
        color: #64748b;
        font-size: 11px;
      }
      @media print {
        body { margin: 12mm; }
      }
    </style>
  </head>
  <body>
    <h1>Subscription Billing History</h1>
    <div class="meta">
      Subscription #${subscription.id} · ${escapeHtml(customerName)} ·
      ${escapeHtml(subscription.customer.accountNumber)} ·
      ${escapeHtml(subscription.servicePlan.name)}<br />
      Generated ${escapeHtml(generatedAt)}
    </div>

    <div class="summary">
      <div class="card">
        <div class="card-label">Total Invoiced</div>
        <div class="card-value">${escapeHtml(formatMoney(totalInvoiced))}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Collected</div>
        <div class="card-value">${escapeHtml(formatMoney(totalPaid))}</div>
      </div>
      <div class="card">
        <div class="card-label">Outstanding Balance</div>
        <div class="card-value">${escapeHtml(formatMoney(outstanding))}</div>
      </div>
    </div>

    <h2>Invoices (${invoices.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Cycle</th>
          <th>Issue Date</th>
          <th>Due Date</th>
          <th>Total</th>
          <th>Paid</th>
          <th>Balance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceRows || '<tr><td colspan="8">No invoices found.</td></tr>'}
      </tbody>
    </table>

    <h2>Payments (${payments.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Payment</th>
          <th>Invoice</th>
          <th>Date</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Reference</th>
          <th>Received By</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${paymentRows || '<tr><td colspan="8">No payments found.</td></tr>'}
      </tbody>
    </table>

    <div class="footer">NDTECH ISP Billing · Subscription monitoring report</div>
  </body>
</html>`;
}

export function openSubscriptionBillingReport(
  data: SubscriptionBillingReportData,
  mode: "print" | "pdf",
) {
  const html = buildReportHtml(data);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");

  if (!popup) {
    window.alert("Allow pop-ups to print or export this billing report.");
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();

  window.setTimeout(() => {
    popup.print();
  }, 300);
}
