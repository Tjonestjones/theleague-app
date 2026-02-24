import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMemberCareerStats } from "@/lib/records";
import Link from "next/link";
import { MemberCharts } from "./member-charts";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string; memberId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId, memberId } = await params;

  const [league, member, latestTeam] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    prisma.member.findUnique({ where: { id: memberId }, select: { displayName: true } }),
    prisma.team.findFirst({
      where: {
        memberId,
        season: { leagueId },
      },
      orderBy: { season: { year: 'desc' } },
      include: {
        season: { select: { year: true } },
        rosters: {
          orderBy: { weekNumber: 'desc' },
          take: 1,
          include: {
            spots: {
              include: { player: true },
              orderBy: [
                { isStarter: 'desc' },
                { position: 'asc' },
              ],
            },
          },
        },
      },
    }),
  ]);

  if (!league || !member) return <div>Not found</div>;

  const stats = await getMemberCareerStats(leagueId, memberId);
  const roster = latestTeam?.rosters[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-700/10 to-emerald-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/30 rounded-3xl p-10 shadow-2xl">
          <Link href={`/dashboard/leagues/${leagueId}/members`} className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold mb-6 transition-colors">
            <span className="text-2xl">←</span>
            <span>Back to Members</span>
          </Link>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">{member.displayName}</h1>
          <p className="text-2xl text-slate-400 font-semibold">{league.name}</p>
        </div>
      </div>

      {/* Debug Info (temporary) */}
      <div className="bg-slate-800 rounded-lg p-4 text-xs font-mono space-y-1">
        <p>Debug: latestTeam = {latestTeam ? 'found' : 'null'}</p>
        {latestTeam && (
          <>
            <p>Debug: latestTeam.season.year = {latestTeam.season.year}</p>
            <p>Debug: latestTeam.rosters.length = {latestTeam.rosters.length}</p>
          </>
        )}
        <p>Debug: roster = {roster ? 'found' : 'null'}</p>
        <p>Debug: spots count = {roster?.spots?.length ?? 0}</p>
        {roster?.spots && <p>Debug: first spot position = {roster.spots[0]?.position}</p>}
      </div>

      {/* Current Roster - PREMIUM SECTION */}
      {roster && roster.spots.length > 0 ? (
        <div>
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full px-6 py-3 mb-4">
              <span className="text-3xl">🏈</span>
              <span className="font-black text-emerald-400 uppercase tracking-wider">Current Roster</span>
              <span className="text-slate-400 font-bold">• {latestTeam.season.year}</span>
            </div>
            <h2 className="text-5xl font-black text-white">Starting Lineup</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roster.spots.map((spot, idx) => (
              <div key={spot.id} className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border-2 border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl hover:shadow-emerald-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  {/* Position Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-4 py-2 rounded-full font-black text-sm uppercase tracking-wider ${
                      spot.position === 'QB' ? 'bg-purple-500/20 text-purple-400 border-2 border-purple-500/30' :
                      spot.position === 'RB' ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30' :
                      spot.position === 'WR' ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/30' :
                      spot.position === 'TE' ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30' :
                      spot.position === 'K' ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/30' :
                      spot.position === 'DEF' ? 'bg-red-500/20 text-red-400 border-2 border-red-500/30' :
                      'bg-slate-600/20 text-slate-400 border-2 border-slate-500/30'
                    }`}>
                      {spot.position}
                    </span>
                    <span className="text-4xl group-hover:scale-125 transition-transform">
                      {spot.position === 'QB' ? '🎯' :
                       spot.position === 'RB' ? '💨' :
                       spot.position === 'WR' ? '⚡' :
                       spot.position === 'TE' ? '🎪' :
                       spot.position === 'K' ? '🦵' :
                       spot.position === 'DEF' ? '🛡️' : '👤'}
                    </span>
                  </div>

                  {/* Player Name */}
                  <h3 className="text-2xl font-black text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    {spot.player?.name || 'Empty Slot'}
                  </h3>

                  {/* Player Details */}
                  {spot.player && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="font-semibold">Position:</span>
                        <span className="font-bold text-white">{spot.player.position}</span>
                      </div>
                      {spot.player.team && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="font-semibold">Team:</span>
                          <span className="font-bold text-white">{spot.player.team}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-slate-800/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-slate-500/30 rounded-3xl p-16 text-center shadow-2xl">
            <div className="text-9xl mb-6">📋</div>
            <h3 className="text-5xl font-black mb-6 text-white">No Roster Data Available</h3>
            <p className="text-2xl text-slate-400 font-semibold max-w-2xl mx-auto leading-relaxed mb-8">
              Roster details (players, positions, lineups) will appear here once you import league data from ESPN, Sleeper, Yahoo, or Fleaflicker.
            </p>
            <Link href={`/dashboard/leagues/${leagueId}`}>
              <button className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-lg shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-105">
                Go to League Dashboard →
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Career Stats - PREMIUM CARDS */}
      <div>
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 bg-yellow-500/20 border-2 border-yellow-500/30 rounded-full px-6 py-3 mb-4">
            <span className="text-3xl">📊</span>
            <span className="font-black text-yellow-400 uppercase tracking-wider">Career Stats</span>
          </div>
          <h2 className="text-5xl font-black text-white">All-Time Performance</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="group relative bg-gradient-to-br from-emerald-900/30 to-green-900/30 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-3">Record</p>
            <p className="text-5xl font-black text-white">{stats.totalWins}-{stats.totalLosses}{stats.totalTies > 0 ? `-${stats.totalTies}` : ""}</p>
          </div>
          <div className="group relative bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-blue-500/20 hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-blue-400 uppercase tracking-wider mb-3">Win %</p>
            <p className="text-5xl font-black text-white">{(stats.winPct * 100).toFixed(1)}%</p>
          </div>
          <div className="group relative bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-purple-500/20 hover:border-purple-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-purple-400 uppercase tracking-wider mb-3">Total Points</p>
            <p className="text-5xl font-black text-white">{stats.totalPF.toFixed(0)}</p>
          </div>
          <div className="group relative bg-gradient-to-br from-cyan-900/30 to-blue-900/30 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-cyan-400 uppercase tracking-wider mb-3">Avg/Game</p>
            <p className="text-5xl font-black text-white">{stats.avgPF.toFixed(1)}</p>
          </div>
          <div className="group relative bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-green-500/20 hover:border-green-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-green-400 uppercase tracking-wider mb-3">Best Week</p>
            <p className="text-5xl font-black text-green-400">{stats.highestWeekScore.toFixed(1)}</p>
          </div>
          <div className="group relative bg-gradient-to-br from-red-900/30 to-orange-900/30 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-red-500/20 hover:border-red-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-red-400 uppercase tracking-wider mb-3">Worst Week</p>
            <p className="text-5xl font-black text-red-400">{stats.lowestWeekScore.toFixed(1)}</p>
          </div>
          <div className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-slate-500/20 hover:border-slate-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Points Against</p>
            <p className="text-5xl font-black text-white">{stats.totalPA.toFixed(0)}</p>
          </div>
          <div className="group relative bg-gradient-to-br from-yellow-900/30 to-amber-900/30 backdrop-blur-xl rounded-3xl p-6 text-center border-2 border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl">
            <p className="text-sm font-black text-yellow-400 uppercase tracking-wider mb-3">Seasons</p>
            <p className="text-5xl font-black text-white">{stats.seasons.length}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <MemberCharts
        weekScores={stats.weekScores}
        seasons={stats.seasons.map((s) => ({
          year: s.year,
          wins: s.wins,
          losses: s.losses,
          pointsFor: s.pointsFor,
        }))}
      />

      {/* Season Breakdown - PREMIUM TABLE */}
      <div>
        <div className="mb-8">
          <h2 className="text-5xl font-black text-white">Season Breakdown</h2>
        </div>
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-2xl">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b-2 border-emerald-500/20">
              <tr>
                <th className="text-left px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Year</th>
                <th className="text-left px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Team</th>
                <th className="text-center px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">W-L-T</th>
                <th className="text-right px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">PF</th>
                <th className="text-right px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">PA</th>
                <th className="text-right px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">High</th>
                <th className="text-right px-6 py-5 font-black text-emerald-400 uppercase tracking-wider text-sm">Low</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {stats.seasons.map((s, idx) => (
                <tr key={s.year} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-5 font-black text-white text-lg">{s.year}</td>
                  <td className="px-6 py-5 font-semibold text-slate-300">{s.teamName}</td>
                  <td className="text-center px-6 py-5 font-bold text-white">{s.wins}-{s.losses}{s.ties > 0 ? `-${s.ties}` : ""}</td>
                  <td className="text-right px-6 py-5 font-bold text-white">{s.pointsFor.toFixed(1)}</td>
                  <td className="text-right px-6 py-5 font-bold text-slate-400">{s.pointsAgainst.toFixed(1)}</td>
                  <td className="text-right px-6 py-5 font-black text-green-400">{s.highWeek.toFixed(1)}</td>
                  <td className="text-right px-6 py-5 font-black text-red-400">{s.lowWeek.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Head-to-Head - PREMIUM TABLE */}
      <div>
        <div className="mb-8">
          <h2 className="text-5xl font-black text-white">Head-to-Head Records</h2>
        </div>
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-yellow-500/20 shadow-2xl">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b-2 border-yellow-500/20">
              <tr>
                <th className="text-left px-6 py-5 font-black text-yellow-400 uppercase tracking-wider text-sm">Opponent</th>
                <th className="text-center px-6 py-5 font-black text-yellow-400 uppercase tracking-wider text-sm">W</th>
                <th className="text-center px-6 py-5 font-black text-yellow-400 uppercase tracking-wider text-sm">L</th>
                <th className="text-center px-6 py-5 font-black text-yellow-400 uppercase tracking-wider text-sm">T</th>
                <th className="text-right px-6 py-5 font-black text-yellow-400 uppercase tracking-wider text-sm">PF</th>
                <th className="text-right px-6 py-5 font-black text-yellow-400 uppercase tracking-wider text-sm">PA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {stats.headToHead.map((h) => (
                <tr key={h.opponentId} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-5">
                    <Link href={`/dashboard/leagues/${leagueId}/members/${h.opponentId}`} className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                      {h.opponentName}
                    </Link>
                  </td>
                  <td className="text-center px-6 py-5 text-green-400 font-black text-xl">{h.wins}</td>
                  <td className="text-center px-6 py-5 text-red-400 font-black text-xl">{h.losses}</td>
                  <td className="text-center px-6 py-5 text-slate-400 font-bold">{h.ties}</td>
                  <td className="text-right px-6 py-5 font-bold text-white">{h.totalPointsFor.toFixed(1)}</td>
                  <td className="text-right px-6 py-5 font-bold text-slate-400">{h.totalPointsAgainst.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
