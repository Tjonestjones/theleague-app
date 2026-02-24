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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* Welcome Header - MASSIVE */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-700/10 to-emerald-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/30 rounded-3xl p-10 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <div className="inline-flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">Dashboard Live</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-4">
                Welcome back{user.firstName ? `, ${user.firstName}` : ""}! 🏈
              </h1>
              <p className="text-2xl text-slate-400 font-semibold">
                {leagues.length === 0
                  ? "Ready to create your first league?"
                  : `You're managing ${leagues.length} league${leagues.length === 1 ? "" : "s"} like a pro.`}
              </p>
            </div>
            <Link href="/dashboard/leagues/create">
              <button className="group relative px-8 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110 overflow-hidden">
                <span className="relative z-10">+ Create League</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards - HUGE Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-500 transform hover:scale-105 hover:-rotate-1 shadow-2xl hover:shadow-emerald-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <p className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-3">Total Leagues</p>
            <p className="text-7xl font-black text-white mb-2">{leagues.length}</p>
            <div className="h-1 w-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="group relative bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-xl rounded-3xl p-8 border-2 border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl hover:shadow-yellow-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <p className="text-sm font-black text-yellow-400 uppercase tracking-wider mb-3">Leagues I Own</p>
            <p className="text-7xl font-black text-white mb-2">
              {leagues.filter((l) => l.members[0]?.role === "COMMISSIONER").length}
            </p>
            <div className="h-1 w-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="group relative bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-xl rounded-3xl p-8 border-2 border-blue-500/20 hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 hover:rotate-1 shadow-2xl hover:shadow-blue-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <p className="text-sm font-black text-blue-400 uppercase tracking-wider mb-3">Total Seasons</p>
            <p className="text-7xl font-black text-white mb-2">
              {leagues.reduce((sum, l) => sum + l._count.seasons, 0)}
            </p>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* League Cards - PREMIUM STYLE */}
      {leagues.length === 0 ? (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-700/10 to-emerald-900/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-emerald-500/30 rounded-3xl p-20 text-center shadow-2xl">
            <div className="text-9xl mb-8 animate-bounce">🏈</div>
            <h2 className="text-5xl font-black mb-6 text-white">No Leagues Yet</h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-semibold leading-relaxed">
              Create your first league and start preserving your fantasy football history from ESPN, Sleeper, Yahoo, or Fleaflicker.
            </p>
            <Link href="/dashboard/leagues/create">
              <button className="group relative px-12 py-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110 overflow-hidden">
                <span className="relative z-10">Create Your First League</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-5xl font-black text-white">My Leagues</h2>
            <Link href="/dashboard/leagues/create">
              <button className="px-6 py-3 bg-emerald-500/20 border-2 border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/30 hover:border-emerald-500/50 font-bold transition-all">
                + Add Another
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {leagues.map((league) => (
              <Link key={league.id} href={`/dashboard/leagues/${league.id}`}>
                <div className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-500 transform hover:scale-105 hover:-rotate-1 shadow-2xl hover:shadow-emerald-500/20 cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors leading-tight">
                        {league.name}
                      </h3>
                      <span className={`text-xs px-4 py-2 rounded-full font-black uppercase tracking-wider ${
                        league.members[0]?.role === "COMMISSIONER"
                          ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30"
                          : "bg-slate-700/50 text-slate-400 border-2 border-slate-600/30"
                      }`}>
                        {league.members[0]?.role === "COMMISSIONER" ? "👑 OWNER" : "MEMBER"}
                      </span>
                    </div>
                    
                    {league.description && (
                      <p className="text-base text-slate-400 mb-6 line-clamp-2 font-medium">{league.description}</p>
                    )}
                    
                    <div className="flex gap-8 text-base">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">👥</span>
                        <div>
                          <span className="text-white font-black text-xl">{league._count.members}</span>
                          <span className="text-slate-400 font-semibold ml-1">Members</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">📅</span>
                        <div>
                          <span className="text-white font-black text-xl">{league._count.seasons}</span>
                          <span className="text-slate-400 font-semibold ml-1">Seasons</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">🏈</span>
                        <span className="text-emerald-400 font-black uppercase text-sm tracking-wider">{league.sport}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
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
