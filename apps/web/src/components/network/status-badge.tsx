const styles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  suspended: "bg-amber-50 text-amber-700",
  disabled: "bg-red-50 text-red-700",
  maintenance: "bg-amber-50 text-amber-700",
  pending: "bg-sky-50 text-sky-700",
  los: "bg-red-50 text-red-700",
  degraded: "bg-amber-50 text-amber-700",
  unknown: "bg-slate-100 text-slate-600",
  acknowledged: "bg-sky-50 text-sky-700",
  resolved: "bg-emerald-50 text-emerald-700",
  assigned: "bg-sky-50 text-sky-700",
  in_progress: "bg-amber-50 text-amber-700",
  closed: "bg-slate-100 text-slate-600",
  completed: "bg-emerald-50 text-emerald-700",
  accepted: "bg-sky-50 text-sky-700",
  dismissed: "bg-slate-100 text-slate-600",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
  draft: "bg-slate-100 text-slate-600",
  planning: "bg-slate-100 text-slate-600",
  on_hold: "bg-amber-50 text-amber-700",
  final: "bg-emerald-50 text-emerald-700",
  submitted: "bg-sky-50 text-sky-700",
  approved: "bg-emerald-50 text-emerald-700",
  issued: "bg-sky-50 text-sky-700",
  partially_received: "bg-amber-50 text-amber-700",
  received: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  online: "bg-emerald-50 text-emerald-700",
  offline: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}
