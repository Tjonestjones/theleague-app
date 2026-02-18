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

  if (!league) return <div>League not found</div>;

  const [allTimeStandings, seasonStandings] = await Promise.all([
    getAllTimeStandings(leagueId),
    getSeasonStandings(leagueId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/leagues/${leagueId}`} className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to {league.name}
          </Link>
          <h1 className="text-3xl font-bold mt-1">League History</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/leagues/${leagueId}/records`}>
            <button className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">🏆 Record Book</button>
          </Link>
          <Link href={`/dashboard/leagues/${leagueId}/members`}>
            <button className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">👥 Members</button>
          </Link>
        </div>
      </div>

      {/* All-Time Standings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All-Time Standings</h2>
        {allTimeStandings.length === 0 ? (
          <p className="text-gray-500">No data yet. Import some seasons first!</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Member</th>
                  <th className="text-center px-4 py-3 font-medium">W</th>
                  <th className="text-center px-4 py-3 font-medium">L</th>
                  <th className="text-center px-4 py-3 font-medium">T</th>
                  <th className="text-center px-4 py-3 font-medium">Win %</th>
                  <th className="text-right px-4 py-3 font-medium">PF</th>
                  <th className="text-right px-4 py-3 font-medium">PA</th>
                  <th className="text-center px-4 py-3 font-medium">Seasons</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allTimeStandings.map((s, i) => (
                  <tr key={s.memberId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/leagues/${leagueId}/members/${s.memberId}`} className="text-blue-600 hover:underline font-medium">
                        {s.memberName}
                      </Link>
                    </td>
                    <td className="text-center px-4 py-3 text-green-600 font-medium">{s.wins}</td>
                    <td className="text-center px-4 py-3 text-red-600">{s.losses}</td>
                    <td className="text-center px-4 py-3 text-gray-500">{s.ties}</td>
                    <td className="text-center px-4 py-3 font-medium">{(s.winPct * 100).toFixed(1)}%</td>
                    <td className="text-right px-4 py-3">{s.pointsFor.toFixed(1)}</td>
                    <td className="text-right px-4 py-3">{s.pointsAgainst.toFixed(1)}</td>
                    <td className="text-center px-4 py-3">{s.seasons}</td>
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
