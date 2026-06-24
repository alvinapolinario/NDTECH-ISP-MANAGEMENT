"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  groupHasActive,
  isActivePath,
  isNavEnabled,
  navToneClasses,
  navigationGroups,
  type NavChild,
  type NavGroup,
} from "@/lib/navigation";

function NavChildLink({
  child,
  pathname,
  tone,
}: {
  child: NavChild;
  pathname: string;
  tone: NavGroup["tone"];
}) {
  const enabled = isNavEnabled(child.href);
  const active = isActivePath(pathname, child.href);
  const toneClass = navToneClasses[tone];

  const ChildIcon = child.icon;

  if (!enabled) {
    return (
      <span
        className="flex items-center gap-2 rounded-md py-1.5 pl-2 pr-3 text-xs text-slate-300"
        title="Coming in a later phase"
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${toneClass.childIcon} opacity-50`}>
          <ChildIcon className="h-3.5 w-3.5" />
        </span>
        <span>{child.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={child.href}
      className={`flex items-center gap-2 rounded-md py-1.5 pl-2 pr-3 text-xs transition ${
        active
          ? toneClass.childActive
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
          active ? toneClass.icon : toneClass.childIcon
        }`}
      >
        <ChildIcon className="h-3.5 w-3.5" />
      </span>
      <span>{child.label}</span>
    </Link>
  );
}

function NavGroupItem({
  group,
  pathname,
  open,
  onToggle,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const toneClass = navToneClasses[group.tone];
  const Icon = group.icon;
  const active = groupHasActive(pathname, group);
  const hasChildren = group.children.length > 0;

  if (!hasChildren && group.href) {
    const enabled = isNavEnabled(group.href);
    const isCurrent = isActivePath(pathname, group.href);

    if (!enabled) {
      return (
        <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass.icon} opacity-50`}>
            <Icon className="h-4 w-4" />
          </span>
          <span>{group.label}</span>
        </div>
      );
    }

    return (
      <Link
        href={group.href}
        className={`relative mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
          isCurrent
            ? `${toneClass.active} font-medium`
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {isCurrent ? (
          <span
            className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r ${toneClass.bar}`}
          />
        ) : null}
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span>{group.label}</span>
      </Link>
    );
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
          active && !open
            ? `${toneClass.active} font-medium`
            : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        {active ? (
          <span
            className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r ${toneClass.bar}`}
          />
        ) : null}
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 font-medium">{group.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="mt-1 space-y-0.5 border-l border-slate-200 ml-4 pl-3">
          {group.children.map((child) => (
            <NavChildLink
              key={child.href}
              child={child}
              pathname={pathname}
              tone={group.tone}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const activeGroupIds = useMemo(
    () =>
      navigationGroups
        .filter((group) => group.children.length > 0 && groupHasActive(pathname, group))
        .map((group) => group.id),
    [pathname],
  );

  useEffect(() => {
    if (!activeGroupIds.length) return;
    setOpenGroups((current) => {
      const next = { ...current };
      for (const id of activeGroupIds) {
        next[id] = true;
      }
      return next;
    });
  }, [activeGroupIds]);

  function toggleGroup(id: string) {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 bg-white md:h-screen md:w-64">
      <Link href="/" className="border-b border-slate-200 px-5 py-4">
        <div className="text-lg font-bold tracking-tight text-slate-900">
          ND<span className="text-violet-600">TECH</span>
        </div>
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
          ISP Billing
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => (
          <NavGroupItem
            key={group.id}
            group={group}
            pathname={pathname}
            open={Boolean(openGroups[group.id])}
            onToggle={() => toggleGroup(group.id)}
          />
        ))}
      </nav>
    </aside>
  );
}
