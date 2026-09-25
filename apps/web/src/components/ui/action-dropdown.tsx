"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ActionDropdownTone =
  | "default"
  | "success"
  | "info"
  | "warning"
  | "destructive";

export type ActionDropdownItem = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  variant?: "default" | "destructive";
  tone?: ActionDropdownTone;
};

type ActionDropdownProps = {
  items: ActionDropdownItem[];
  disabled?: boolean;
  label?: string;
};

const toneStyles: Record<
  ActionDropdownTone,
  { item: string; icon: string }
> = {
  default: {
    item: "text-slate-700 hover:bg-slate-50",
    icon: "bg-slate-100 text-slate-600",
  },
  success: {
    item: "text-emerald-700 hover:bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
  },
  info: {
    item: "text-indigo-700 hover:bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-700",
  },
  warning: {
    item: "text-amber-700 hover:bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
  },
  destructive: {
    item: "text-red-700 hover:bg-red-50",
    icon: "bg-red-100 text-red-700",
  },
};

function resolveTone(item: ActionDropdownItem): ActionDropdownTone {
  if (item.tone) return item.tone;
  if (item.variant === "destructive") return "destructive";
  return "default";
}

export function ActionDropdown({
  items,
  disabled = false,
  label = "Actions",
}: ActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!items.length) {
    return null;
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
      >
        <MoreHorizontal className="h-3.5 w-3.5 text-slate-500" />
        <span>{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10.5rem] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => {
            const tone = resolveTone(item);
            const styles = toneStyles[tone];
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled || disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium disabled:opacity-50 ${styles.item}`}
              >
                {Icon ? (
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${styles.icon}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                ) : null}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
