import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function DashboardPage() {
  const clerkUser = await currentUser()
  
  if (!clerkUser) {
    redirect('/sign-in')
  }

  // Get or create user in database
  let user = await db.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: {
      ownedLeagues: {
        include: {
          members: true,
          seasons: {
            orderBy: { year: 'desc' },
            take: 1,
          },
        },
      },
      memberships: {
        include: {
          league: {
            include: {
              seasons: {
                orderBy: { year: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    // Create user on first login
    user = await db.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      },
      include: {
        ownedLeagues: {
          include: {
            members: true,
            seasons: {
              orderBy: { year: 'desc' },
              take: 1,
            },
          },
        },
        memberships: {
          include: {
            league: {
              include: {
                seasons: {
                  orderBy: { year: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })
  }

  const ownedLeagues = user.ownedLeagues
  const memberLeagues = user.memberships.map((m) => m.league)
  const allLeagues = [...ownedLeagues, ...memberLeagues]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user.firstName || 'Commissioner'}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your fantasy football leagues in one place.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/leagues/new">
            <Plus className="mr-2 h-4 w-4" />
            Create League
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Leagues"
          value={allLeagues.length}
          description="Leagues you own or are a member of"
        />
        <StatCard
          title="Owned Leagues"
          value={ownedLeagues.length}
          description="Leagues where you're the commissioner"
        />
        <StatCard
          title="Active Seasons"
          value={
            allLeagues.filter((l) => l.seasons.length > 0 && l.seasons[0].year === new Date().getFullYear()).length
          }
          description={`Leagues active in ${new Date().getFullYear()}`}
        />
      </div>

      {/* Leagues List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Your Leagues</h2>
        
        {allLeagues.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <h3 className="mb-2 text-lg font-semibold">No leagues yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first league to start preserving your fantasy football
              history.
            </p>
            <Button asChild>
              <Link href="/dashboard/leagues/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First League
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function LeagueCard({ league }: { league: any }) {
  const currentYear = new Date().getFullYear()
  const latestSeason = league.seasons?.[0]
  const isActive = latestSeason?.year === currentYear

  return (
    <Link
      href={`/dashboard/leagues/${league.id}`}
      className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{league.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {league.members?.length || 0} members
            {latestSeason && ` • ${latestSeason.year}`}
          </p>
        </div>
        {isActive && (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            Active
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{league.sport.toLowerCase()}</span>
        <span>•</span>
        <span>{league.visibility.toLowerCase()}</span>
      </div>
    </Link>
  )
}
