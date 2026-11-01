"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Info,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { UserProfileModal } from "@/components/user-profile-modal";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const quickLinks = [
  { label: "Add customer", href: "/crm/customers/create" },
  { label: "Add invoice", href: "/billing/invoices" },
  { label: "Record payment", href: "/billing/payments" },
  { label: "PPPoE account", href: "/network/pppoe-accounts" },
];

export function AppTopNav() {
  const { user, ready, logout, refresh } = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !quickOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (!quickRef.current?.contains(event.target as Node)) {
        setQuickOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen, quickOpen]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="hidden text-sm font-medium text-slate-500 md:block">
            Operations Portal
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <div className="relative" ref={quickRef}>
              <button
                type="button"
                onClick={() => setQuickOpen((current) => !current)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                title="Quick add"
              >
                <Plus className="h-5 w-5" />
              </button>
              {quickOpen ? (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setQuickOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:block"
              title="Help"
            >
              <CircleHelp className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:block"
              title="Information"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="relative ml-1" ref={menuRef}>
              {!ready ? (
                <div className="px-2 text-sm text-slate-400">Loading...</div>
              ) : user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((current) => !current)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                      {getInitials(user.name)}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block text-sm font-medium text-slate-900">
                        {user.name}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>

                  {menuOpen ? (
                    <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                            <UserRound className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {user.name}
                            </div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(true);
                            setMenuOpen(false);
                          }}
                          className="rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Edit profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            logout();
                          }}
                          className="rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <UserProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={refresh}
      />
    </>
  );
}
