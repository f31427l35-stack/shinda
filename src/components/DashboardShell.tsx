"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ListChecks, Trophy, Megaphone, UserCog, LogOut, ShoppingBag,
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
      <aside className="w-64 border-r border-neutral-800 flex-shrink-0">
        <div className="px-6 py-5 border-b border-neutral-800">
          <h1 className="text-white font-semibold text-lg leading-tight">Promo Draw Admin</h1>
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
      <main className="flex-1 overflow-x-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-neutral-800">
          <h1 className="text-white text-xl font-semibold">
            {nav.find((n) => n.href === pathname)?.label || "Dashboard"}
          </h1>
          <div className="relative">
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
