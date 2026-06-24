export type ReportSummaryItem = {
  label: string;
  value: string | number;
  format?: "money" | "text";
};

export type ReportMeta = {
  total: number;
  page: number;
  limit: number;
  generatedAt: string;
  totals?: Record<string, number>;
};

export type ReportResponse<T> = {
  summary: ReportSummaryItem[];
  items: T[];
  meta: ReportMeta;
};
