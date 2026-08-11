"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ListChecks, Trophy, Megaphone, UserCog, LogOut, ShoppingBag, Menu, X,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/entries", label: "Entries", icon: ListChecks },
  { href: "/dashboard/winners", label: "Winners", icon: Trophy },
  { href: "/dashboard/users", label: "Users", icon: UserCog },
];

export default function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-black flex" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Backdrop for mobile drawer */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`w-64 border-r border-neutral-800 flex-shrink-0 bg-black fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between">
          <h1 className="text-white font-semibold text-lg leading-tight">Shinda Soap</h1>
          <button
            onClick={() => setNavOpen(false)}
            className="text-neutral-400 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            if (item.href === "/dashboard/users" && user.role !== "admin") return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                  isActive ? "text-amber-500 bg-amber-500/10" : "text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-x-hidden min-w-0">
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setNavOpen(true)}
              className="text-neutral-400 hover:text-white lg:hidden flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-white text-lg sm:text-xl font-semibold truncate">
              {nav.find((n) => n.href === pathname)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl p-2 z-20">
                <div className="px-3 py-2 text-white text-sm border-b border-neutral-800 mb-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-neutral-500 text-xs">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-800 rounded-md text-sm"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
