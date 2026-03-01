import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllTimeStandings, getSeasonStandings } from "@/lib/records";
import Link from "next/link";
import { SeasonTabs } from "./season-tabs";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true },
  });

  if (!league) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">League not found</div>;

  const [allTimeStandings, seasonStandings] = await Promise.all([
    getAllTimeStandings(leagueId),
    getSeasonStandings(leagueId),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-700/10 to-emerald-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/30 rounded-3xl p-10 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <Link href={`/dashboard/leagues/${leagueId}`} className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold mb-4 transition-colors">
                <span className="text-2xl">←</span>
                <span>Back to {league.name}</span>
              </Link>
              <h1 className="text-6xl md:text-7xl font-black tracking-tight">League History</h1>
            </div>
            <div className="flex gap-3">
              <Link href={`/dashboard/leagues/${leagueId}/records`}>
                <button className="px-6 py-3 bg-yellow-500/20 border-2 border-yellow-500/30 text-yellow-400 rounded-xl hover:bg-yellow-500/30 hover:border-yellow-500/50 font-bold transition-all">
                  🏆 Record Book
                </button>
              </Link>
              <Link href={`/dashboard/leagues/${leagueId}/members`}>
                <button className="px-6 py-3 bg-blue-500/20 border-2 border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/30 hover:border-blue-500/50 font-bold transition-all">
                  👥 Members
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* All-Time Standings */}
      <div>
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full px-6 py-3 mb-4">
            <span className="text-3xl">🏆</span>
            <span className="font-black text-emerald-400 uppercase tracking-wider">All-Time</span>
          </div>
          <h2 className="text-5xl font-black text-white">All-Time Standings</h2>
        </div>

        {allTimeStandings.length === 0 ? (
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-emerald-500/30 rounded-3xl p-16 text-center shadow-2xl">
            <div className="text-9xl mb-6">📊</div>
            <p className="text-2xl text-slate-400 font-semibold">No data yet. Import some seasons first!</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-2xl">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b-2 border-emerald-500/20">
                <tr>
                  <th className="text-left px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">#</th>
                  <th className="text-left px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Member</th>
                  <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">W</th>
                  <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">L</th>
                  <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">T</th>
                  <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Win %</th>
                  <th className="text-right px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">PF</th>
                  <th className="text-right px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">PA</th>
                  <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Seasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {allTimeStandings.map((s, i) => (
                  <tr key={s.memberId} className={`hover:bg-slate-700/30 transition-colors ${i === 0 ? "bg-yellow-900/10" : ""}`}>
                    <td className="px-6 py-5 font-black text-white text-lg">
                      {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-6 py-5">
                      <Link href={`/dashboard/leagues/${leagueId}/members/${s.memberId}`} className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors text-lg">
                        {s.memberName}
                      </Link>
                    </td>
                    <td className="text-center px-6 py-5 text-green-400 font-black text-lg">{s.wins}</td>
                    <td className="text-center px-6 py-5 text-red-400 font-bold">{s.losses}</td>
                    <td className="text-center px-6 py-5 text-slate-500 font-bold">{s.ties}</td>
                    <td className="text-center px-6 py-5 font-black text-white text-lg">{(s.winPct * 100).toFixed(1)}%</td>
                    <td className="text-right px-6 py-5 font-bold text-white">{s.pointsFor.toFixed(1)}</td>
                    <td className="text-right px-6 py-5 font-bold text-slate-400">{s.pointsAgainst.toFixed(1)}</td>
                    <td className="text-center px-6 py-5 font-bold text-white">{s.seasons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Season-by-Season */}
      {seasonStandings.length > 0 && (
        <SeasonTabs seasons={seasonStandings} leagueId={leagueId} />
      )}
    </div>
  );
}
