import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { MobileNav } from "@/components/mobile-nav";
import { BrandMark } from "@/components/brand-mark";
import { LayoutDashboard, Plus, Download, type LucideIcon } from "lucide-react";
import { HideOnLeagueRoutes } from "@/components/hide-on-league-routes";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-black">
      <HideOnLeagueRoutes>
        {/* Mobile Navigation */}
        <MobileNav />

      {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/6 bg-slate-950 flex-col">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-white/6">
          <Link href="/dashboard" className="group block">
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                TheLeague
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/leagues/create" icon={Plus} label="Create League" color="yellow" />
          <NavItem href="/dashboard/leagues/import" icon={Download} label="Import Data" color="blue" />
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-white/6">
          <div className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-white/4 transition-colors">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm font-medium text-slate-500">My Account</span>
          </div>
        </div>
      </aside>
      </HideOnLeagueRoutes>

      {/* ── MAIN ──────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black overflow-x-clip">
        <HideOnLeagueRoutes>
          <div className="md:hidden h-16" />
        </HideOnLeagueRoutes>
        {children}
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  color?: "emerald" | "yellow" | "blue";
}) {
  const hover = {
    emerald: "hover:bg-emerald-500/10 hover:text-emerald-400",
    yellow:  "hover:bg-yellow-500/10  hover:text-yellow-400",
    blue:    "hover:bg-blue-500/10    hover:text-blue-400",
  };
  const cls = hover[color ?? "emerald"];
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-400 ${cls} transition-all`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
      {label}
    </Link>
  );
}
