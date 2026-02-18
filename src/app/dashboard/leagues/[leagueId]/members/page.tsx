import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllTimeStandings } from "@/lib/records";
import Link from "next/link";

export default async function MembersPage({
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

  const standings = await getAllTimeStandings(leagueId);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/leagues/${leagueId}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to {league.name}
        </Link>
        <h1 className="text-3xl font-bold mt-1">👥 Members</h1>
      </div>

      {standings.length === 0 ? (
        <p className="text-gray-500">No member data yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {standings.map((s, i) => (
            <Link key={s.memberId} href={`/dashboard/leagues/${leagueId}/members/${s.memberId}`}>
              <div className="border rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-300">#{i + 1}</span>
                    <h3 className="font-semibold text-lg">{s.memberName}</h3>
                  </div>
                  <span className="text-sm font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    {(s.winPct * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="text-gray-500">Record</p>
                    <p className="font-medium">{s.wins}-{s.losses}{s.ties > 0 ? `-${s.ties}` : ""}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">PF</p>
                    <p className="font-medium">{s.pointsFor.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">PA</p>
                    <p className="font-medium">{s.pointsAgainst.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Seasons</p>
                    <p className="font-medium">{s.seasons}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
