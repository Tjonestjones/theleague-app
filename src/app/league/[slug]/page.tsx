import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getAllTimeStandings, getSeasonStandings, getRecordBook } from "@/lib/records";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const league = await prisma.league.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  if (!league) return { title: "League Not Found" };

  return {
    title: `${league.name} — TheLeague`,
    description: league.description || `${league.name} fantasy football league on TheLeague`,
  };
}

export default async function PublicLeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      _count: { select: { members: true, seasons: true } },
    },
  });

  if (!league || league.visibility === "PRIVATE") {
    notFound();
  }

  const [standings, seasons, records] = await Promise.all([
    getAllTimeStandings(league.id),
    getSeasonStandings(league.id),
    getRecordBook(league.id),
  ]);

  const latestSeason = seasons[0];
  const topRecords = records.slice(0, 6);

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-900 opacity-90"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.05) 2px, transparent 2px),
                             linear-gradient(90deg, rgba(255,255,255,.05) 2px, transparent 2px)`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 text-[150px] opacity-10 animate-pulse">🏆</div>
          <div className="absolute bottom-10 left-10 text-[150px] opacity-10 animate-pulse delay-500">🏈</div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-20 relative z-10 text-center">
          {league.logoUrl && (
            <img src={league.logoUrl} alt="" className="w-28 h-28 rounded-full mx-auto mb-8 border-4 border-white/30 shadow-2xl" />
          )}
          <h1 className="text-7xl md:text-8xl font-black text-white mb-4 tracking-tighter drop-shadow-2xl">{league.name}</h1>
          {league.description && (
            <p className="text-2xl text-white/90 mb-6 font-semibold max-w-2xl mx-auto">{league.description}</p>
          )}
          <div className="flex gap-6 justify-center text-white/80 font-bold text-lg">
            <span className="flex items-center gap-2"><span className="text-2xl">👥</span> {league._count.members} Members</span>
            <span className="text-white/30">•</span>
            <span className="flex items-center gap-2"><span className="text-2xl">📅</span> {league._count.seasons} Seasons</span>
            <span className="text-white/30">•</span>
            <span className="flex items-center gap-2"><span className="text-2xl">🏈</span> {league.sport}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        {/* All-Time Standings */}
        {standings.length > 0 && (
          <section>
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full px-6 py-3 mb-4">
                <span className="text-3xl">🏆</span>
                <span className="font-black text-emerald-400 uppercase tracking-wider">All-Time</span>
              </div>
              <h2 className="text-5xl font-black text-white">All-Time Standings</h2>
            </div>
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-2xl">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b-2 border-emerald-500/20">
                  <tr>
                    <th className="text-left px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">#</th>
                    <th className="text-left px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Member</th>
                    <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">W</th>
                    <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">L</th>
                    <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Win %</th>
                    <th className="text-right px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">PF</th>
                    <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Seasons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {standings.map((s, i) => (
                    <tr key={s.memberId} className={`hover:bg-slate-700/30 transition-colors ${i === 0 ? "bg-yellow-900/10" : ""}`}>
                      <td className="px-6 py-5 font-black text-white text-lg">
                        {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </td>
                      <td className="px-6 py-5 font-bold text-white text-lg">{s.memberName}</td>
                      <td className="text-center px-6 py-5 text-green-400 font-black">{s.wins}</td>
                      <td className="text-center px-6 py-5 text-red-400 font-bold">{s.losses}</td>
                      <td className="text-center px-6 py-5 font-black text-white">{(s.winPct * 100).toFixed(1)}%</td>
                      <td className="text-right px-6 py-5 font-bold text-white">{s.pointsFor.toFixed(0)}</td>
                      <td className="text-center px-6 py-5 font-bold text-white">{s.seasons}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Latest Season */}
        {latestSeason && (
          <section>
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 bg-blue-500/20 border-2 border-blue-500/30 rounded-full px-6 py-3 mb-4">
                <span className="text-3xl">📅</span>
                <span className="font-black text-blue-400 uppercase tracking-wider">Latest</span>
              </div>
              <h2 className="text-5xl font-black text-white">{latestSeason.year} Season</h2>
            </div>
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-blue-500/20 shadow-2xl">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b-2 border-blue-500/20">
                  <tr>
                    <th className="text-left px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">#</th>
                    <th className="text-left px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Team</th>
                    <th className="text-left px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Owner</th>
                    <th className="text-center px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">Record</th>
                    <th className="text-right px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">PF</th>
                    <th className="text-right px-6 py-5 font-black text-blue-400 uppercase tracking-wider text-sm">PA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {latestSeason.teams.map((t, i) => (
                    <tr key={t.teamId} className={`hover:bg-slate-700/30 transition-colors ${i === 0 ? "bg-yellow-900/10" : ""}`}>
                      <td className="px-6 py-5 font-black text-white text-lg">{i === 0 ? "🏆" : i + 1}</td>
                      <td className="px-6 py-5 font-black text-white">{t.teamName}</td>
                      <td className="px-6 py-5 text-slate-400 font-semibold">{t.memberName}</td>
                      <td className="text-center px-6 py-5 font-bold">
                        <span className="text-green-400">{t.wins}</span>
                        <span className="text-slate-600">-</span>
                        <span className="text-red-400">{t.losses}</span>
                        {t.ties > 0 && <span className="text-slate-500">-{t.ties}</span>}
                      </td>
                      <td className="text-right px-6 py-5 font-bold text-white">{t.pointsFor.toFixed(1)}</td>
                      <td className="text-right px-6 py-5 font-bold text-slate-400">{t.pointsAgainst.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Record Book Highlights */}
        {topRecords.length > 0 && (
          <section>
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 bg-yellow-500/20 border-2 border-yellow-500/30 rounded-full px-6 py-3 mb-4">
                <span className="text-3xl">🎯</span>
                <span className="font-black text-yellow-400 uppercase tracking-wider">Records</span>
              </div>
              <h2 className="text-5xl font-black text-white">Record Book Highlights</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {topRecords.map((r, i) => (
                <div key={i} className="group relative bg-gradient-to-br from-yellow-900/20 to-amber-900/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 transform hover:scale-[1.02] shadow-xl">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">{r.title}</p>
                      <p className="font-black text-white text-lg group-hover:text-yellow-400 transition-colors">{r.holder}</p>
                      <p className="text-xs text-slate-500 font-medium mt-2">{r.detail}</p>
                    </div>
                    <p className="text-4xl font-black text-yellow-400 shrink-0">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Season Champions */}
        {seasons.length > 1 && (
          <section>
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 bg-purple-500/20 border-2 border-purple-500/30 rounded-full px-6 py-3 mb-4">
                <span className="text-3xl">📜</span>
                <span className="font-black text-purple-400 uppercase tracking-wider">History</span>
              </div>
              <h2 className="text-5xl font-black text-white">Season Champions</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {seasons.map((s) => {
                const champ = s.teams[0];
                if (!champ) return null;
                return (
                  <div key={s.year} className="group relative bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-purple-500/20 hover:border-purple-500/50 transition-all duration-500 transform hover:scale-105 shadow-xl text-center">
                    <div className="text-5xl mb-4 group-hover:scale-125 transition-transform">🏆</div>
                    <p className="text-3xl font-black text-white mb-2">{s.year}</p>
                    <p className="text-purple-400 font-black text-lg">{champ.teamName}</p>
                    <p className="text-slate-400 font-semibold">{champ.memberName}</p>
                    <p className="text-sm text-slate-500 font-bold mt-2">
                      {champ.wins}-{champ.losses} • {champ.pointsFor.toFixed(0)} pts
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 text-center">
        <p className="text-slate-600 font-semibold">
          Powered by <a href="/" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">TheLeague</a>
        </p>
      </footer>
    </div>
  );
}
