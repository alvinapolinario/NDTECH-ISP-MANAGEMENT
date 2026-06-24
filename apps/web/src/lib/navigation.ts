import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgePercent,
  BarChart3,
  Bell,
  BellRing,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HandCoins,
  KeyRound,
  Layers,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Network,
  Package,
  Radar,
  Receipt,
  Router,
  Server,
  Settings,
  Share2,
  Shield,
  ShoppingCart,
  Smartphone,
  Tags,
  Ticket,
  Truck,
  Upload,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  Wifi,
  Wrench,
} from "lucide-react";

export type NavTone = "purple" | "green" | "blue" | "amber" | "rose" | "slate";

export type NavChild = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: NavTone;
  href?: string;
  children: NavChild[];
};

export const navToneClasses: Record<
  NavTone,
  { icon: string; active: string; bar: string; childActive: string; childIcon: string }
> = {
  purple: {
    icon: "bg-violet-100 text-violet-600",
    active: "bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
    childActive: "bg-violet-50 text-violet-700 font-medium",
    childIcon: "bg-violet-50 text-violet-500",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-600",
    active: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    childActive: "bg-emerald-50 text-emerald-700 font-medium",
    childIcon: "bg-emerald-50 text-emerald-500",
  },
  blue: {
    icon: "bg-sky-100 text-sky-600",
    active: "bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
    childActive: "bg-sky-50 text-sky-700 font-medium",
    childIcon: "bg-sky-50 text-sky-500",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600",
    active: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    childActive: "bg-amber-50 text-amber-700 font-medium",
    childIcon: "bg-amber-50 text-amber-500",
  },
  rose: {
    icon: "bg-rose-100 text-rose-600",
    active: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    childActive: "bg-rose-50 text-rose-700 font-medium",
    childIcon: "bg-rose-50 text-rose-500",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600",
    active: "bg-slate-100 text-slate-800",
    bar: "bg-slate-500",
    childActive: "bg-slate-100 text-slate-800 font-medium",
    childIcon: "bg-slate-100 text-slate-500",
  },
};

const enabledPrefixes = [
  "/",
  "/admin",
  "/crm/customers",
  "/crm/leads",
  "/crm/referrals",
  "/crm/customer-documents",
  "/isp",
  "/billing",
  "/finance",
  "/network",
  "/support",
  "/projects",
  "/inventory",
  "/procurement",
  "/reports",
];

export function isNavEnabled(href: string) {
  return enabledPrefixes.some((prefix) =>
    prefix === "/" ? href === "/" : href.startsWith(prefix),
  );
}

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function groupHasActive(pathname: string, group: NavGroup) {
  if (group.href && isActivePath(pathname, group.href)) {
    return true;
  }
  return group.children.some((child) => isActivePath(pathname, child.href));
}

export const navigationGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    tone: "purple",
    href: "/",
    children: [],
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    tone: "purple",
    children: [
      { label: "Customers", href: "/crm/customers", icon: Users },
      { label: "Leads / Prospects", href: "/crm/leads", icon: UserPlus },
      { label: "Referrals", href: "/crm/referrals", icon: Share2 },
      { label: "Customer Documents", href: "/crm/customer-documents", icon: FileText },
    ],
  },
  {
    id: "isp",
    label: "ISP Services",
    icon: Wifi,
    tone: "green",
    children: [
      { label: "Service Plans", href: "/isp/service-plans", icon: Layers },
      { label: "Subscriptions", href: "/isp/subscriptions", icon: Wifi },
      { label: "Installation Requests", href: "/isp/installation-requests", icon: Wrench },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: FileSpreadsheet,
    tone: "green",
    children: [
      { label: "Billing Cycles", href: "/billing/cycles", icon: Calendar },
      { label: "Invoices", href: "/billing/invoices", icon: FileSpreadsheet },
      { label: "Payments", href: "/billing/payments", icon: Wallet },
      { label: "Credits / Adjustments", href: "/billing/credits", icon: BadgePercent },
      { label: "Collections", href: "/billing/collections", icon: HandCoins },
      { label: "Collector Sync", href: "/billing/collector-sync", icon: Smartphone },
      {
        label: "Payment Upload Logs",
        href: "/billing/collector-payment-uploads",
        icon: Upload,
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Receipt,
    tone: "green",
    children: [
      { label: "Expenses", href: "/finance/expenses", icon: Receipt },
      { label: "Expense Categories", href: "/finance/expense-categories", icon: Tags },
    ],
  },
  {
    id: "network",
    label: "Network Operations",
    icon: Network,
    tone: "green",
    children: [
      { label: "MikroTik Routers", href: "/network/mikrotik-routers", icon: Router },
      { label: "PPPoE Accounts", href: "/network/pppoe-accounts", icon: Network },
      { label: "OLT Devices", href: "/network/olt-devices", icon: Server },
      { label: "ONU Devices", href: "/network/onu-devices", icon: Server },
      { label: "Switches", href: "/network/switches", icon: Router },
      { label: "PPPoE Sessions", href: "/network/pppoe-sessions", icon: Activity },
      { label: "Network Monitoring", href: "/network/monitoring", icon: Radar },
      { label: "Network Alerts", href: "/network/alerts", icon: BellRing },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: Ticket,
    tone: "green",
    children: [
      { label: "Tickets", href: "/support/tickets", icon: Ticket },
      { label: "Ticket Categories", href: "/support/ticket-categories", icon: Tags },
      { label: "Technician Assignments", href: "/support/technician-assignments", icon: UserCog },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    tone: "green",
    children: [
      { label: "Project Registry", href: "/projects", icon: FolderKanban },
      { label: "Estimates", href: "/projects/estimates", icon: ClipboardList },
      { label: "Bill of Materials", href: "/projects/bom", icon: Package },
      { label: "Material Usage", href: "/projects/material-usage", icon: Wrench },
      { label: "Project Costing", href: "/projects/costing", icon: BarChart3 },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    tone: "green",
    children: [
      { label: "Inventory Items", href: "/inventory/items", icon: Package },
      { label: "Categories", href: "/inventory/categories", icon: Tags },
      { label: "Warehouses", href: "/inventory/warehouses", icon: Warehouse },
      { label: "Stock Movements", href: "/inventory/movements", icon: Truck },
      { label: "Stock Adjustments", href: "/inventory/adjustments", icon: ClipboardList },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    tone: "green",
    children: [
      { label: "Suppliers", href: "/procurement/suppliers", icon: Users },
      { label: "Purchase Requests", href: "/procurement/purchase-requests", icon: FileText },
      { label: "Purchase Orders", href: "/procurement/purchase-orders", icon: ShoppingCart },
      { label: "Goods Receiving", href: "/procurement/goods-receiving", icon: Truck },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    tone: "green",
    children: [
      { label: "Subscriber Reports", href: "/reports/subscribers", icon: Users },
      { label: "Billing Reports", href: "/reports/billing", icon: FileSpreadsheet },
      { label: "Collection Reports", href: "/reports/collections", icon: HandCoins },
      { label: "Referral Reports", href: "/reports/referrals", icon: Share2 },
      { label: "Network Reports", href: "/reports/network", icon: Network },
      { label: "Inventory Reports", href: "/reports/inventory", icon: Package },
      { label: "Project Reports", href: "/reports/projects", icon: FolderKanban },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: Settings,
    tone: "slate",
    children: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Collector API Tokens", href: "/admin/collector-tokens", icon: KeyRound },
      { label: "Roles", href: "/admin/roles", icon: Shield },
      { label: "Permissions", href: "/admin/permissions", icon: Shield },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "SMS", href: "/admin/sms", icon: MessageSquare },
      { label: "Integration Settings", href: "/admin/integration-settings", icon: KeyRound },
      { label: "Provinces", href: "/admin/provinces", icon: MapPin },
      { label: "Municipalities", href: "/admin/municipalities", icon: MapPin },
      { label: "Barangays", href: "/admin/barangays", icon: MapPin },
    ],
  },
];
