import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const leagues = await prisma.league.findMany({
    where: {
      members: { some: { userId: user.id } },
    },
    include: {
      _count: { select: { members: true, seasons: true } },
      members: {
        where: { userId: user.id },
        select: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Welcome Header - ESPN Style */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary p-6 rounded-lg">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            Welcome back{user.firstName ? `, ${user.firstName}` : ""}! 🏈
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {leagues.length === 0
              ? "Create your first league to get started."
              : `You're managing ${leagues.length} league${leagues.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Link href="/dashboard/leagues/create">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-accent font-bold shadow-lg hover:shadow-xl transition-all">
            + Create League
          </button>
        </Link>
      </div>

      {/* Stats Cards - Big Numbers ESPN Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Leagues</p>
          <p className="text-5xl font-bold text-primary">{leagues.length}</p>
        </div>
        <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Leagues I Own</p>
          <p className="text-5xl font-bold text-accent">
            {leagues.filter((l) => l.members[0]?.role === "COMMISSIONER").length}
          </p>
        </div>
        <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Seasons</p>
          <p className="text-5xl font-bold text-foreground">
            {leagues.reduce((sum, l) => sum + l._count.seasons, 0)}
          </p>
        </div>
      </div>

      {/* League Cards - ESPN Style */}
      {leagues.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-16 text-center">
          <span className="text-6xl mb-4 block">🏈</span>
          <h2 className="text-2xl font-bold mb-3">No leagues yet</h2>
          <p className="text-muted-foreground mb-6 text-lg max-w-md mx-auto">
            Create a league and start importing your fantasy football history from ESPN, Sleeper, Yahoo, or Fleaflicker.
          </p>
          <Link href="/dashboard/leagues/create">
            <button className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-accent font-bold text-lg shadow-lg hover:shadow-xl transition-all">
              Create Your First League
            </button>
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Leagues</h2>
            <Link href="/dashboard/leagues/create" className="text-primary hover:text-accent font-semibold text-sm">
              + Add Another
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leagues.map((league) => (
              <Link key={league.id} href={`/dashboard/leagues/${league.id}`}>
                <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">
                      {league.name}
                    </h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                      league.members[0]?.role === "COMMISSIONER"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {league.members[0]?.role === "COMMISSIONER" ? "OWNER" : "MEMBER"}
                    </span>
                  </div>
                  {league.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{league.description}</p>
                  )}
                  <div className="flex gap-6 text-sm font-medium">
                    <div className="text-muted-foreground">
                      <span className="text-foreground font-bold">{league._count.members}</span> Members
                    </div>
                    <div className="text-muted-foreground">
                      <span className="text-foreground font-bold">{league._count.seasons}</span> Seasons
                    </div>
                    <div className="text-muted-foreground uppercase text-xs">
                      {league.sport}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
