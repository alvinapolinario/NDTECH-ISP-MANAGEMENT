import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { createDatabasePoolConfig } from '../src/prisma/database-pool.config';
import { computeInvoiceDatesForCycle } from '../src/invoices/invoice-billing-dates';

const adapter = new PrismaMariaDb(createDatabasePoolConfig());
const prisma = new PrismaClient({ adapter });

async function main() {
  const subs = await prisma.subscription.findMany({
    include: {
      servicePlan: { select: { name: true, monthlyPrice: true } },
      customer: { select: { accountNumber: true } },
      invoices: {
        where: { deletedAt: null },
        select: { id: true, billingCycleId: true, invoiceNumber: true },
      },
    },
  });

  const cycles = await prisma.billingCycle.findMany({
    where: { deletedAt: null },
    orderBy: { periodStart: 'asc' },
  });

  console.log('\n=== SUBSCRIPTIONS ===');
  for (const sub of subs) {
    console.log({
      id: sub.id,
      customer: sub.customer.accountNumber,
      status: sub.status,
      billingDay: sub.billingDay,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate?.toISOString() ?? null,
      gracePeriodDays: sub.gracePeriodDays,
      existingInvoices: sub.invoices.length,
    });
  }

  console.log('\n=== BILLING CYCLES ===');
  for (const cycle of cycles) {
    console.log({
      id: cycle.id,
      name: cycle.name,
      periodStart: cycle.periodStart.toISOString(),
      periodEnd: cycle.periodEnd.toISOString(),
      status: cycle.status,
    });
  }

  console.log('\n=== DATE CHECK PER CYCLE ===');
  for (const cycle of cycles) {
    console.log(`\n-- ${cycle.name} (id ${cycle.id}) --`);
    for (const sub of subs) {
      const dates = computeInvoiceDatesForCycle(
        {
          billingDay: sub.billingDay,
          gracePeriodDays: sub.gracePeriodDays,
          startDate: sub.startDate,
          endDate: sub.endDate,
        },
        cycle,
      );
      const hasInvoice = sub.invoices.some((inv) => inv.billingCycleId === cycle.id);
      console.log({
        subId: sub.id,
        billingDay: sub.billingDay,
        dates: dates
          ? {
              issue: dates.issueDate.toISOString(),
              due: dates.dueDate.toISOString(),
            }
          : null,
        hasInvoice,
        wouldCreate: dates && !hasInvoice && sub.status === 'active',
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
