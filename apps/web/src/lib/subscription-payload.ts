import type {
  CreateSubscriptionPayload,
  SubscriptionFormValues,
  UpdateSubscriptionPayload,
} from "@/types/subscription";

export function toCreateSubscriptionPayload(
  values: SubscriptionFormValues,
): CreateSubscriptionPayload {
  return {
    customerId: Number(values.customerId),
    servicePlanId: Number(values.servicePlanId),
    pppoeAccountId: values.pppoeAccountId
      ? Number(values.pppoeAccountId)
      : undefined,
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
  return {
    customerId: Number(values.customerId),
    servicePlanId: Number(values.servicePlanId),
    pppoeAccountId: values.pppoeAccountId
      ? Number(values.pppoeAccountId)
      : null,
    billingDay: Number(values.billingDay),
    startDate: values.startDate,
    endDate: values.endDate || null,
    status: values.status,
    autoSuspendEnabled: values.autoSuspendEnabled,
    gracePeriodDays: Number(values.gracePeriodDays),
  };
}
