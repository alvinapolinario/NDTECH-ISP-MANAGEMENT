import type { SubscriptionStatus } from "@/types/subscription";

const statusStyles: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-amber-50 text-amber-700",
  cancelled: "bg-slate-100 text-slate-600",
  terminated: "bg-red-50 text-red-700",
};

const statusLabels: Record<SubscriptionStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  cancelled: "Cancelled",
  terminated: "Terminated",
};

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
