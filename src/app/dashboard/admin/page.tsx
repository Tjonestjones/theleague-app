import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

// Simple admin panel — only accessible by the app owner
const ADMIN_EMAILS = [
  "tgjtgj7777@gmail.com",
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    redirect("/dashboard");
  }

  const [userCount, leagueCount, seasonCount, matchupCount, memberCount] = await Promise.all([
    prisma.user.count(),
    prisma.league.count(),
    prisma.season.count(),
    prisma.matchup.count(),
    prisma.member.count(),
  ]);

  const recentLeagues = await prisma.league.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      owner: { select: { email: true, firstName: true } },
      _count: { select: { members: true, seasons: true } },
    },
  });

  const subStats = await prisma.league.groupBy({
    by: ["subscriptionStatus"],
    _count: true,
  });

  const statCards = [
    { label: "Users", value: userCount, icon: "👤", color: "emerald" },
    { label: "Leagues", value: leagueCount, icon: "🏈", color: "blue" },
    { label: "Seasons", value: seasonCount, icon: "📅", color: "purple" },
    { label: "Matchups", value: matchupCount, icon: "⚔️", color: "red" },
    { label: "Members", value: memberCount, icon: "👥", color: "yellow" },
  ];

  const colorClasses: Record<string, string> = {
    emerald: "from-emerald-900/30 to-green-900/30 border-emerald-500/20 hover:border-emerald-500/50",
    blue: "from-blue-900/30 to-indigo-900/30 border-blue-500/20 hover:border-blue-500/50",
    purple: "from-purple-900/30 to-pink-900/30 border-purple-500/20 hover:border-purple-500/50",
    red: "from-red-900/30 to-orange-900/30 border-red-500/20 hover:border-red-500/50",
    yellow: "from-yellow-900/30 to-amber-900/30 border-yellow-500/20 hover:border-yellow-500/50",
  };

  const textColors: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 via-slate-700/10 to-slate-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-slate-500/30 rounded-3xl p-10 shadow-2xl">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight">🔧 Admin Panel</h1>
          <p className="text-2xl text-slate-400 font-semibold mt-3">System overview and management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`group relative bg-gradient-to-br ${colorClasses[card.color]} backdrop-blur-xl rounded-2xl p-6 text-center border-2 transition-all duration-500 transform hover:scale-105 shadow-xl`}>
            <span className="text-3xl block mb-2 group-hover:scale-125 transition-transform">{card.icon}</span>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">{card.label}</p>
            <p className={`text-4xl font-black ${textColors[card.color]}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Subscription Stats */}
      <div>
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full px-6 py-3 mb-4">
            <span className="text-3xl">💳</span>
            <span className="font-black text-emerald-400 uppercase tracking-wider">Subscriptions</span>
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          {subStats.map((s) => (
            <div key={s.subscriptionStatus} className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-emerald-500/20 shadow-xl">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">{s.subscriptionStatus}</p>
              <p className="text-3xl font-black text-emerald-400">{s._count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Leagues */}
      <div>
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 bg-blue-500/20 border-2 border-blue-500/30 rounded-full px-6 py-3 mb-4">
            <span className="text-3xl">🏈</span>
            <span className="font-black text-blue-400 uppercase tracking-wider">Recent Leagues</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-blue-500/20 shadow-2xl">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b-2 border-blue-500/20">
              <tr>
                <th className="text-left px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">League</th>
                <th className="text-left px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Owner</th>
                <th className="text-center px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Members</th>
                <th className="text-center px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Seasons</th>
                <th className="text-center px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Status</th>
                <th className="text-left px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {recentLeagues.map((l) => (
                <tr key={l.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-5 font-black text-white">{l.name}</td>
                  <td className="px-6 py-5 font-semibold text-slate-300">{l.owner.firstName ?? l.owner.email}</td>
                  <td className="text-center px-6 py-5 font-bold text-white">{l._count.members}</td>
                  <td className="text-center px-6 py-5 font-bold text-white">{l._count.seasons}</td>
                  <td className="text-center px-6 py-5">
                    <span className={`text-xs px-3 py-1.5 rounded-full font-black uppercase tracking-wider border ${
                      l.subscriptionStatus === "ACTIVE" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                      l.subscriptionStatus === "TRIAL" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                      "bg-slate-700/50 text-slate-400 border-slate-600/30"
                    }`}>
                      {l.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-slate-500 font-semibold">{l.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
