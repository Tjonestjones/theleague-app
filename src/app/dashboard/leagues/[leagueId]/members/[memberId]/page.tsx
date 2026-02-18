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

  const [league, member] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    prisma.member.findUnique({ where: { id: memberId }, select: { displayName: true } }),
  ]);

  if (!league || !member) return <div>Not found</div>;

  const stats = await getMemberCareerStats(leagueId, memberId);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/leagues/${leagueId}/members`} className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to Members
        </Link>
        <h1 className="text-3xl font-bold mt-1">{member.displayName}</h1>
        <p className="text-gray-500">{league.name}</p>
      </div>

      {/* Career Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Record</p>
          <p className="text-2xl font-bold">{stats.totalWins}-{stats.totalLosses}{stats.totalTies > 0 ? `-${stats.totalTies}` : ""}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Win %</p>
          <p className="text-2xl font-bold">{(stats.winPct * 100).toFixed(1)}%</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Total Points</p>
          <p className="text-2xl font-bold">{stats.totalPF.toFixed(0)}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Avg/Game</p>
          <p className="text-2xl font-bold">{stats.avgPF.toFixed(1)}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Best Week</p>
          <p className="text-2xl font-bold text-green-600">{stats.highestWeekScore.toFixed(1)}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Worst Week</p>
          <p className="text-2xl font-bold text-red-600">{stats.lowestWeekScore.toFixed(1)}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Points Against</p>
          <p className="text-2xl font-bold">{stats.totalPA.toFixed(0)}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Seasons</p>
          <p className="text-2xl font-bold">{stats.seasons.length}</p>
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

      {/* Season Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Season Breakdown</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Year</th>
                <th className="text-left px-4 py-3 font-medium">Team</th>
                <th className="text-center px-4 py-3 font-medium">W-L-T</th>
                <th className="text-right px-4 py-3 font-medium">PF</th>
                <th className="text-right px-4 py-3 font-medium">PA</th>
                <th className="text-right px-4 py-3 font-medium">High</th>
                <th className="text-right px-4 py-3 font-medium">Low</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.seasons.map((s) => (
                <tr key={s.year} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.year}</td>
                  <td className="px-4 py-3">{s.teamName}</td>
                  <td className="text-center px-4 py-3">{s.wins}-{s.losses}{s.ties > 0 ? `-${s.ties}` : ""}</td>
                  <td className="text-right px-4 py-3">{s.pointsFor.toFixed(1)}</td>
                  <td className="text-right px-4 py-3">{s.pointsAgainst.toFixed(1)}</td>
                  <td className="text-right px-4 py-3 text-green-600">{s.highWeek.toFixed(1)}</td>
                  <td className="text-right px-4 py-3 text-red-600">{s.lowWeek.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Head-to-Head */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Head-to-Head Records</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Opponent</th>
                <th className="text-center px-4 py-3 font-medium">W</th>
                <th className="text-center px-4 py-3 font-medium">L</th>
                <th className="text-center px-4 py-3 font-medium">T</th>
                <th className="text-right px-4 py-3 font-medium">PF</th>
                <th className="text-right px-4 py-3 font-medium">PA</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.headToHead.map((h) => (
                <tr key={h.opponentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/leagues/${leagueId}/members/${h.opponentId}`} className="text-blue-600 hover:underline">
                      {h.opponentName}
                    </Link>
                  </td>
                  <td className="text-center px-4 py-3 text-green-600 font-medium">{h.wins}</td>
                  <td className="text-center px-4 py-3 text-red-600">{h.losses}</td>
                  <td className="text-center px-4 py-3 text-gray-500">{h.ties}</td>
                  <td className="text-right px-4 py-3">{h.totalPointsFor.toFixed(1)}</td>
                  <td className="text-right px-4 py-3">{h.totalPointsAgainst.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
