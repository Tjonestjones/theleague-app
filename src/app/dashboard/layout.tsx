import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <div className="mb-8">
          <Link href="/dashboard" className="text-xl font-bold">
            TheLeague 🏈
          </Link>
        </div>

        <nav className="space-y-1 flex-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-200 transition-colors"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/dashboard/leagues/create"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-200 transition-colors"
          >
            ➕ Create League
          </Link>
          <Link
            href="/dashboard/leagues/import-espn"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-200 transition-colors"
          >
            📥 Import ESPN
          </Link>
        </nav>

        <div className="pt-4 border-t flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <span className="text-sm text-gray-600">Account</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
