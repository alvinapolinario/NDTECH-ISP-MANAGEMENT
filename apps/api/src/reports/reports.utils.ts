import { Prisma } from '@prisma/client';

export function money(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export function reportMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    generatedAt: new Date().toISOString(),
  };
}

export function monthRange(month?: string, year?: string) {
  const now = new Date();
  const resolvedYear = Number(year) || now.getFullYear();
  const resolvedMonth = Number(month) || now.getMonth() + 1;
  const start = new Date(resolvedYear, resolvedMonth - 1, 1);
  const end = new Date(resolvedYear, resolvedMonth, 0, 23, 59, 59, 999);

  return { start, end, year: resolvedYear, month: resolvedMonth };
}
