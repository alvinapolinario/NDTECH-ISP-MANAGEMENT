import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName: string;
  href?: string;
  hint?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
  href,
  hint,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-medium text-slate-600">{label}</div>
            {href ? (
              <Link
                href={href}
                className="text-xs font-medium text-violet-600 hover:underline"
              >
                View
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <div className={`mt-4 text-3xl font-bold tracking-tight ${valueClassName}`}>
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
