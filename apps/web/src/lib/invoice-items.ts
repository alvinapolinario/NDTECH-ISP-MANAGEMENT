import type { Invoice, InvoiceItemType } from "@/types/invoice";

export const INVOICE_ITEM_TYPE_OPTIONS: Array<{
  value: InvoiceItemType;
  label: string;
}> = [
  { value: "recurring_service", label: "Monthly service" },
  { value: "installation_fee", label: "Installation fee" },
  { value: "repair", label: "Repair" },
  { value: "connector", label: "Connectors / materials" },
  { value: "previous_balance", label: "Previous balance" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
];

export type InvoiceItemFormRow = {
  key: string;
  itemType: InvoiceItemType;
  description: string;
  quantity: string;
  unitPrice: string;
};

export function titleCaseItemType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function defaultItemDescription(
  itemType: InvoiceItemType,
  invoice?: Pick<Invoice, "billingCycle" | "subscription">,
) {
  switch (itemType) {
    case "recurring_service":
      return invoice?.subscription?.servicePlan
        ? `${invoice.subscription.servicePlan.name} - ${invoice.billingCycle.name}`
        : "Monthly internet service";
    case "installation_fee":
      return "Installation fee";
    case "repair":
      return "Repair service";
    case "connector":
      return "Connectors / materials";
    case "previous_balance":
      return "Previous balance carried forward";
    case "adjustment":
      return "Billing adjustment";
    case "other":
      return "Additional charge";
  }
}

export function invoiceItemsToFormRows(invoice: Invoice): InvoiceItemFormRow[] {
  if (!invoice.items.length) {
    return [
      {
        key: crypto.randomUUID(),
        itemType: "recurring_service",
        description: defaultItemDescription("recurring_service", invoice),
        quantity: "1",
        unitPrice: String(
          invoice.subscription?.monthlyAmount ??
            invoice.subscription?.servicePlan.monthlyPrice ??
            invoice.total,
        ),
      },
    ];
  }

  return invoice.items.map((item) => ({
    key: String(item.id),
    itemType: item.itemType,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
  }));
}

export function createEmptyItemRow(
  invoice: Invoice,
  itemType: InvoiceItemType = "other",
): InvoiceItemFormRow {
  return {
    key: crypto.randomUUID(),
    itemType,
    description: defaultItemDescription(itemType, invoice),
    quantity: "1",
    unitPrice: "0",
  };
}

export function lineItemAmount(row: InvoiceItemFormRow) {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unitPrice);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return quantity * unitPrice;
}

export function formRowsSubtotal(rows: InvoiceItemFormRow[]) {
  return rows.reduce((sum, row) => sum + lineItemAmount(row), 0);
}

export function formRowsToPayload(
  rows: InvoiceItemFormRow[],
  invoice?: Pick<Invoice, "subscription">,
) {
  return rows.map((row) => ({
    itemType: row.itemType,
    description: row.description.trim(),
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    ...(row.itemType === "recurring_service" &&
    invoice?.subscription?.servicePlan
      ? { servicePlanId: invoice.subscription.servicePlan.id }
      : {}),
  }));
}

export function summarizeInvoiceItems(invoice: Invoice) {
  if (!invoice.items.length) {
    return invoice.subscription?.servicePlan.name ?? "No line items";
  }

  const preview = invoice.items
    .slice(0, 2)
    .map((item) => item.description)
    .join(" · ");

  if (invoice.items.length > 2) {
    return `${preview} · +${invoice.items.length - 2} more`;
  }

  return preview;
}
