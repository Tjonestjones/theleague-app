import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LeagueMembers } from "./league-members";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        include: {
          user: { select: { firstName: true, lastName: true, imageUrl: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      seasons: {
        include: {
          _count: { select: { teams: true, weeks: true } },
        },
        orderBy: { year: "desc" },
      },
    },
  });

  if (!league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">🔍</div>
          <h2 className="text-4xl font-black mb-4">League Not Found</h2>
          <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 font-bold text-lg transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentMember = league.members.find((m) => m.userId === user.id);
  const isCommissioner = currentMember?.role === "COMMISSIONER" || currentMember?.role === "CO_COMMISSIONER";

  const navItems = [
    { href: `/dashboard/leagues/${leagueId}/history`, icon: "📊", label: "History", color: "emerald" },
    { href: `/dashboard/leagues/${leagueId}/records`, icon: "🏆", label: "Records", color: "yellow" },
    { href: `/dashboard/leagues/${leagueId}/analytics`, icon: "🎯", label: "Analytics", color: "cyan" },
    { href: `/dashboard/leagues/${leagueId}/members`, icon: "👥", label: "Members", color: "blue" },
    { href: `/dashboard/leagues/${leagueId}/finances`, icon: "💰", label: "Finances", color: "green" },
    { href: `/dashboard/leagues/${leagueId}/newsletter`, icon: "📰", label: "Newsletter", color: "purple" },
  ];

  const colorMap: Record<string, string> = {
    emerald: "hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400",
    yellow: "hover:bg-yellow-500/20 hover:border-yellow-500/30 hover:text-yellow-400",
    cyan: "hover:bg-cyan-500/20 hover:border-cyan-500/30 hover:text-cyan-400",
    blue: "hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-400",
    green: "hover:bg-green-500/20 hover:border-green-500/30 hover:text-green-400",
    purple: "hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-purple-400",
    slate: "hover:bg-slate-500/20 hover:border-slate-500/30 hover:text-slate-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* League Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-700/10 to-emerald-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/30 rounded-3xl p-10 shadow-2xl">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold mb-6 transition-colors">
            <span className="text-2xl">←</span>
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">{league.name}</h1>
              {league.description && (
                <p className="text-xl text-slate-400 font-semibold mb-4">{league.description}</p>
              )}
              <div className="flex flex-wrap gap-4 items-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 font-bold text-sm uppercase tracking-wider">
                  🏈 {league.sport}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-slate-600/30 rounded-full text-slate-300 font-bold text-sm">
                  👥 {league.members.length} Members
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-slate-600/30 rounded-full text-slate-300 font-bold text-sm">
                  📅 {league.seasons.length} Seasons
                </span>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                  league.visibility === "PUBLIC"
                    ? "bg-green-500/20 border border-green-500/30 text-green-400"
                    : league.visibility === "UNLISTED"
                    ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-400"
                    : "bg-slate-700/50 border border-slate-600/30 text-slate-400"
                }`}>
                  {league.visibility === "PUBLIC" ? "🌐" : league.visibility === "UNLISTED" ? "🔗" : "🔒"} {league.visibility.charAt(0) + league.visibility.slice(1).toLowerCase()}
                </span>
                {league.visibility !== "PRIVATE" && (
                  <a href={`/league/${league.slug}`} target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 font-bold text-sm hover:bg-blue-500/30 transition-colors">
                    Public Page ↗
                  </a>
                )}
              </div>
            </div>

            {isCommissioner && (
              <Link href={`/dashboard/leagues/${leagueId}/settings`}>
                <button className="px-6 py-3 bg-slate-700/50 border-2 border-slate-600/30 text-slate-300 rounded-xl hover:bg-slate-600/50 hover:border-slate-500/50 font-bold transition-all">
                  ⚙️ Settings
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-transparent transition-all duration-500 transform hover:scale-105 shadow-xl cursor-pointer text-center ${colorMap[item.color]}`}>
              <span className="text-4xl block mb-3 group-hover:scale-125 transition-transform duration-500">{item.icon}</span>
              <span className="font-black text-white text-lg">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Seasons */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full px-6 py-3 mb-4">
              <span className="text-3xl">📅</span>
              <span className="font-black text-emerald-400 uppercase tracking-wider">Seasons</span>
            </div>
            <h2 className="text-5xl font-black text-white">Imported Data</h2>
          </div>
          {isCommissioner && (
            <Link href={`/dashboard/leagues/import?leagueId=${leagueId}`}>
              <button className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-lg shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden">
                <span className="relative z-10">📥 Import Data</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>
          )}
        </div>

        {league.seasons.length === 0 ? (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-emerald-500/30 rounded-3xl p-16 text-center shadow-2xl">
              <div className="text-9xl mb-6 animate-bounce">📥</div>
              <h3 className="text-4xl font-black mb-4 text-white">No Seasons Imported Yet</h3>
              <p className="text-xl text-slate-400 font-semibold max-w-2xl mx-auto mb-8">
                Import your first season from ESPN, Sleeper, Yahoo, or Fleaflicker to unlock your league&apos;s full history.
              </p>
              {isCommissioner && (
                <Link href={`/dashboard/leagues/import?leagueId=${leagueId}`}>
                  <button className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110">
                    Import Your First Season →
                  </button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {league.seasons.map((season) => (
              <div key={season.id} className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-500 shadow-xl hover:shadow-emerald-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-5xl font-black text-white group-hover:text-emerald-400 transition-colors">
                      {season.year}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-white">{season.year} Season</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-slate-400 font-semibold">
                          {season.platform ? (
                            <span className="inline-flex items-center gap-1">
                              {season.platform === "ESPN" ? "🏈" : season.platform === "SLEEPER" ? "😴" : season.platform === "YAHOO" ? "🟣" : "🪲"}
                              {season.platform}
                            </span>
                          ) : "Manual"}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-semibold">{season._count.teams} teams</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-semibold">{season._count.weeks} weeks</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-4 py-2 rounded-full font-black uppercase tracking-wider ${
                    season.syncStatus === "COMPLETED" ? "bg-green-500/20 text-green-400 border-2 border-green-500/30" :
                    season.syncStatus === "SYNCING" ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30 animate-pulse" :
                    season.syncStatus === "FAILED" ? "bg-red-500/20 text-red-400 border-2 border-red-500/30" :
                    "bg-slate-700/50 text-slate-400 border-2 border-slate-600/30"
                  }`}>
                    {season.syncStatus === "COMPLETED" ? "✓ " : season.syncStatus === "SYNCING" ? "⟳ " : season.syncStatus === "FAILED" ? "✗ " : ""}{season.syncStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Members */}
      <LeagueMembers
        leagueId={leagueId}
        members={league.members.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          email: m.email,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          firstName: m.user?.firstName ?? null,
          lastName: m.user?.lastName ?? null,
          imageUrl: m.user?.imageUrl ?? null,
        }))}
        isCommissioner={isCommissioner}
      />
    </div>
  );
}
