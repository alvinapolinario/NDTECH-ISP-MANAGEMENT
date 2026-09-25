import type {
  CreateSubscriptionPayload,
  SubscriptionFormValues,
  UpdateSubscriptionPayload,
} from "@/types/subscription";

function parseMonthlyAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Custom monthly amount must be greater than zero");
  }
  return Math.round(amount * 100) / 100;
}

export function toCreateSubscriptionPayload(
  values: SubscriptionFormValues,
): CreateSubscriptionPayload {
  const radiusUsername = values.radiusUsername.trim() || undefined;
  return {
    customerId: Number(values.customerId),
    servicePlanId: Number(values.servicePlanId),
    pppoeAccountId: values.pppoeAccountId
      ? Number(values.pppoeAccountId)
      : undefined,
    radiusUsername: values.pppoeAccountId ? undefined : radiusUsername,
    label: values.label.trim() || undefined,
    monthlyAmount: parseMonthlyAmount(values.monthlyAmount),
    billingDay: Number(values.billingDay),
    startDate: values.startDate,
    endDate: values.endDate || undefined,
    status: values.status,
    autoSuspendEnabled: values.autoSuspendEnabled,
    gracePeriodDays: Number(values.gracePeriodDays),
  };
}

export function toUpdateSubscriptionPayload(
  values: SubscriptionFormValues,
): UpdateSubscriptionPayload {
  const radiusUsername = values.radiusUsername.trim() || undefined;
  const monthlyAmount = parseMonthlyAmount(values.monthlyAmount);
  return {
    customerId: Number(values.customerId),
    servicePlanId: Number(values.servicePlanId),
    pppoeAccountId: values.pppoeAccountId
      ? Number(values.pppoeAccountId)
      : radiusUsername
        ? undefined
        : null,
    radiusUsername: values.pppoeAccountId ? undefined : radiusUsername,
    label: values.label.trim() || null,
    monthlyAmount: monthlyAmount ?? null,
    billingDay: Number(values.billingDay),
    startDate: values.startDate,
    endDate: values.endDate || null,
    status: values.status,
    autoSuspendEnabled: values.autoSuspendEnabled,
    gracePeriodDays: Number(values.gracePeriodDays),
  };
}
