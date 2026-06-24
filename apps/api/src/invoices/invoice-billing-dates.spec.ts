import {
  addUtcDays,
  billingDateInMonth,
  computeInvoiceDatesForCycle,
  firstBillingDate,
} from './invoice-billing-dates';

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

describe('invoice-billing-dates', () => {
  const mayCycle = {
    periodStart: date('2026-05-01'),
    periodEnd: date('2026-05-31'),
    dueDate: date('2026-05-18'),
  };

  it('bills on billing day in the month after install', () => {
    const result = computeInvoiceDatesForCycle(
      {
        billingDay: 11,
        gracePeriodDays: 7,
        startDate: date('2026-01-10'),
      },
      mayCycle,
    );

    expect(result).not.toBeNull();
    expect(result?.issueDate.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    expect(result?.dueDate.toISOString()).toBe('2026-05-18T00:00:00.000Z');
  });

  it('skips install-month billing for a subscriber installed on the 25th', () => {
    const result = computeInvoiceDatesForCycle(
      {
        billingDay: 26,
        gracePeriodDays: 7,
        startDate: date('2026-05-25'),
      },
      mayCycle,
    );

    expect(result).toBeNull();
  });

  it('includes a subscriber installed last month on the 25th', () => {
    const result = computeInvoiceDatesForCycle(
      {
        billingDay: 26,
        gracePeriodDays: 7,
        startDate: date('2026-04-25'),
      },
      mayCycle,
    );

    expect(result).not.toBeNull();
    expect(result?.issueDate.toISOString()).toBe('2026-05-26T00:00:00.000Z');
    expect(result?.dueDate.toISOString()).toBe('2026-06-02T00:00:00.000Z');
  });

  it('clamps billing day 31 in february', () => {
    expect(
      billingDateInMonth(2026, 1, 31).toISOString(),
    ).toBe('2026-02-28T00:00:00.000Z');
  });

  it('computes first billing date in the following month for mid-month installs', () => {
    expect(
      firstBillingDate(date('2026-01-10'), 11).toISOString(),
    ).toBe('2026-02-11T00:00:00.000Z');
  });

  it('bills on the install month when the subscription starts on the 1st', () => {
    const januaryCycle = {
      periodStart: date('2026-01-01'),
      periodEnd: date('2026-01-31'),
      dueDate: date('2026-01-07'),
    };

    expect(
      firstBillingDate(date('2026-01-01'), 1).toISOString(),
    ).toBe('2026-01-01T00:00:00.000Z');

    const result = computeInvoiceDatesForCycle(
      {
        billingDay: 1,
        gracePeriodDays: 7,
        startDate: date('2026-01-01'),
      },
      januaryCycle,
    );

    expect(result).not.toBeNull();
    expect(result?.issueDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(result?.dueDate.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('adds grace period days in utc', () => {
    expect(addUtcDays(date('2026-05-11'), 7).toISOString()).toBe(
      '2026-05-18T00:00:00.000Z',
    );
  });
});
