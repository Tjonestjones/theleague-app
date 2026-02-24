import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { MobileNav } from "@/components/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-black">
      {/* Mobile Navigation */}
      <MobileNav />

      {/* Sidebar - Hidden on Mobile - PREMIUM DARK */}
      <aside className="hidden md:flex w-80 border-r border-emerald-500/20 bg-gradient-to-b from-slate-900 to-slate-950 p-6 flex-col shadow-2xl">
        {/* Logo */}
        <div className="mb-12">
          <Link href="/dashboard" className="group block">
            <div className="text-3xl font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">
              TheLeague
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full group-hover:w-20 transition-all"></div>
              <span className="text-2xl">🏈</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-3 flex-1">
          <Link
            href="/dashboard"
            className="group flex items-center gap-4 px-5 py-4 text-base font-bold rounded-2xl hover:bg-emerald-500/20 hover:border-emerald-500/30 border-2 border-transparent transition-all text-white hover:text-emerald-400"
          >
            <span className="text-3xl group-hover:scale-125 transition-transform">📊</span>
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard/leagues/create"
            className="group flex items-center gap-4 px-5 py-4 text-base font-bold rounded-2xl hover:bg-yellow-500/20 hover:border-yellow-500/30 border-2 border-transparent transition-all text-white hover:text-yellow-400"
          >
            <span className="text-3xl group-hover:scale-125 transition-transform">➕</span>
            <span>Create League</span>
          </Link>
          <Link
            href="/dashboard/leagues/import"
            className="group flex items-center gap-4 px-5 py-4 text-base font-bold rounded-2xl hover:bg-blue-500/20 hover:border-blue-500/30 border-2 border-transparent transition-all text-white hover:text-blue-400"
          >
            <span className="text-3xl group-hover:scale-125 transition-transform">📥</span>
            <span>Import Data</span>
          </Link>
        </nav>

        {/* User Section */}
        <div className="pt-6 border-t border-emerald-500/20">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-emerald-500/20">
            <UserButton afterSignOutUrl="/" />
            <span className="text-sm font-bold text-slate-400">My Account</span>
          </div>
        </div>
      </aside>

      {/* Main Content - Dark background */}
      <main className="flex-1 pt-20 md:pt-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black overflow-auto">
        {children}
      </main>
    </div>
  );
}
