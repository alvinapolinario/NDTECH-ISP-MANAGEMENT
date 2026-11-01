import type { CustomerDisplayNameInput } from "@/types/customer";

export function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

/** Billed monthly fee: custom subscription amount, else plan catalog price. */
export function subscriptionMonthlyFee(subscription: {
  monthlyAmount?: string | number | null;
  servicePlan: { monthlyPrice: string | number };
}) {
  if (
    subscription.monthlyAmount !== null &&
    subscription.monthlyAmount !== undefined &&
    subscription.monthlyAmount !== ""
  ) {
    return Number(subscription.monthlyAmount);
  }
  return Number(subscription.servicePlan.monthlyPrice);
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

/** Civil YYYY-MM-DD in the browser's local timezone (never use toISOString for this). */
export function formatLocalDate(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthBoundsLocal(date: Date = new Date()) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: formatLocalDate(from),
    to: formatLocalDate(to),
  };
}
