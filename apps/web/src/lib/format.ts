import type { CustomerDisplayNameInput } from "@/types/customer";

export function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function customerDisplayName(customer: CustomerDisplayNameInput) {
  return (
    customer.businessName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.accountNumber
  );
}

export function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}
