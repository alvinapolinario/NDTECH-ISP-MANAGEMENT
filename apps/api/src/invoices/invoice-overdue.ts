import { InvoiceStatus, Prisma, PrismaClient } from '@prisma/client';

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function overdueInvoiceWhere(): Prisma.InvoiceWhereInput {
  return {
    deletedAt: null,
    balance: { gt: 0 },
    dueDate: { lt: startOfToday() },
    status: { in: [InvoiceStatus.issued, InvoiceStatus.partially_paid] },
  };
}

export async function markOverdueInvoices(
  prisma: PrismaClient | Prisma.TransactionClient,
): Promise<number> {
  const result = await prisma.invoice.updateMany({
    where: overdueInvoiceWhere(),
    data: { status: InvoiceStatus.overdue },
  });

  return result.count;
}

export function isInvoiceOverdue(input: {
  status: InvoiceStatus | string;
  balance: number | Prisma.Decimal;
  dueDate: Date | string;
}): boolean {
  const balance = Number(input.balance);
  if (balance <= 0) return false;

  const status = String(input.status);
  if (status === InvoiceStatus.paid || status === InvoiceStatus.cancelled) {
    return false;
  }
  if (status === InvoiceStatus.overdue) return true;

  const dueDate =
    input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate);
  return dueDate < startOfToday();
}
