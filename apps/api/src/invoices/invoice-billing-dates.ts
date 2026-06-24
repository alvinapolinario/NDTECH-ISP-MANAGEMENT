export type CyclePeriod = {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

export type SubscriptionBillingProfile = {
  billingDay: number;
  gracePeriodDays: number;
  startDate: Date;
  endDate?: Date | null;
};

export type ComputedInvoiceDates = {
  issueDate: Date;
  dueDate: Date;
};

function startOfUtcDay(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

export function billingDateInMonth(
  year: number,
  monthIndex: number,
  billingDay: number,
) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(billingDay, lastDay);
  return new Date(Date.UTC(year, monthIndex, day));
}

export function addUtcDays(date: Date, days: number) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function firstBillingDate(startDate: Date, billingDay: number) {
  const year = startDate.getUTCFullYear();
  const monthIndex = startDate.getUTCMonth();

  // Subscribers who start on the 1st are active for the full month and bill
  // on their billing day in the install month. Mid-month installs skip that month.
  if (startDate.getUTCDate() === 1) {
    return billingDateInMonth(year, monthIndex, billingDay);
  }

  const nextMonthIndex = monthIndex + 1;
  const nextYear = year + Math.floor(nextMonthIndex / 12);
  const normalizedMonth = nextMonthIndex % 12;
  return billingDateInMonth(nextYear, normalizedMonth, billingDay);
}

export function computeInvoiceDatesForCycle(
  subscription: SubscriptionBillingProfile,
  cycle: CyclePeriod,
): ComputedInvoiceDates | null {
  const cycleBillDate = billingDateInMonth(
    cycle.periodStart.getUTCFullYear(),
    cycle.periodStart.getUTCMonth(),
    subscription.billingDay,
  );
  const firstBillDate = firstBillingDate(
    subscription.startDate,
    subscription.billingDay,
  );

  if (startOfUtcDay(cycleBillDate) < startOfUtcDay(firstBillDate)) {
    return null;
  }

  if (startOfUtcDay(cycleBillDate) < startOfUtcDay(cycle.periodStart)) {
    return null;
  }

  if (startOfUtcDay(cycleBillDate) > startOfUtcDay(cycle.periodEnd)) {
    return null;
  }

  if (subscription.endDate) {
    if (startOfUtcDay(cycleBillDate) > startOfUtcDay(subscription.endDate)) {
      return null;
    }
  }

  const graceDays = subscription.gracePeriodDays ?? 7;
  const issueDate = cycleBillDate;
  const dueDate = addUtcDays(cycleBillDate, graceDays);

  return { issueDate, dueDate };
}
