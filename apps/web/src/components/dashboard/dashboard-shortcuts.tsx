import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  FileSpreadsheet,
  Network,
  Router,
  UserPlus,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";

type Shortcut = {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: string;
};

const shortcuts: Shortcut[] = [
  {
    label: "Add customer",
    href: "/crm/customers/create",
    icon: UserPlus,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    label: "Customers",
    href: "/crm/customers",
    icon: Users,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    label: "Subscriptions",
    href: "/isp/subscriptions",
    icon: Wifi,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    label: "Add invoice",
    href: "/billing/invoices",
    icon: FileSpreadsheet,
    tone: "bg-sky-100 text-sky-600",
  },
  {
    label: "Record payment",
    href: "/billing/payments",
    icon: Wallet,
    tone: "bg-amber-100 text-amber-600",
  },
  {
    label: "PPPoE accounts",
    href: "/network/pppoe-accounts",
    icon: Network,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    label: "MikroTik routers",
    href: "/network/mikrotik-routers",
    icon: Router,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    label: "PPPoE sessions",
    href: "/network/pppoe-sessions",
    icon: Network,
    tone: "bg-emerald-100 text-emerald-600",
  },
];

export function DashboardShortcuts() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Shortcuts</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.href + shortcut.label}
              href={shortcut.href}
              className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-3 text-sm text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${shortcut.tone}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-medium">{shortcut.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
