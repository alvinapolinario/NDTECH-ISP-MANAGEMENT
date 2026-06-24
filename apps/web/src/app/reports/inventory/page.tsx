"use client";

import { ReportPage } from "@/components/reports/report-page";
import { fetchInventoryReport } from "@/hooks/use-reports";
import { formatMoney } from "@/lib/format";

export default function InventoryReportsPage() {
  return (
    <ReportPage
      title="Inventory Reports"
      description="Stock summary, low-stock items, and inventory movement totals."
      searchPlaceholder="Search item, category, or warehouse"
      filterOptions={[
        { label: "All stock", value: "" },
        { label: "Low stock only", value: "low_stock" },
      ]}
      load={fetchInventoryReport}
      columns={[
        { key: "code", label: "Item Code" },
        { key: "name", label: "Item" },
        { key: "category", label: "Category" },
        { key: "warehouse", label: "Warehouse" },
        {
          key: "quantity",
          label: "Qty",
          render: (item) => `${item.quantity} ${item.unit}`,
        },
        {
          key: "reorderLevel",
          label: "Reorder Level",
          render: (item) => String(item.reorderLevel),
        },
        {
          key: "stockValue",
          label: "Stock Value",
          render: (item) => formatMoney(item.stockValue as string),
        },
        {
          key: "isLowStock",
          label: "Low Stock",
          render: (item) => (item.isLowStock ? "Yes" : "No"),
        },
      ]}
    />
  );
}
