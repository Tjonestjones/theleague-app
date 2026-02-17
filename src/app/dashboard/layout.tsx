import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Home, Trophy, Users, DollarSign, Settings } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b p-6">
            <Link href="/dashboard" className="text-xl font-bold">
              TheLegue 🏈
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <NavLink href="/dashboard" icon={<Home className="h-5 w-5" />}>
              Dashboard
            </NavLink>
            <NavLink
              href="/dashboard/leagues"
              icon={<Trophy className="h-5 w-5" />}
            >
              My Leagues
            </NavLink>
            <NavLink
              href="/dashboard/members"
              icon={<Users className="h-5 w-5" />}
            >
              Members
            </NavLink>
            <NavLink
              href="/dashboard/finances"
              icon={<DollarSign className="h-5 w-5" />}
            >
              Finances
            </NavLink>
            <NavLink
              href="/dashboard/settings"
              icon={<Settings className="h-5 w-5" />}
            >
              Settings
            </NavLink>
          </nav>

          {/* User */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <span className="text-sm font-medium">Account</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
    >
      {icon}
      {children}
    </Link>
  )
}
