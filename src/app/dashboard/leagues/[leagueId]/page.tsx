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
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">League not found</h2>
        <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentMember = league.members.find((m) => m.userId === user.id);
  const isCommissioner = currentMember?.role === "COMMISSIONER" || currentMember?.role === "CO_COMMISSIONER";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{league.name}</h1>
          {league.description && (
            <p className="text-gray-500 mt-1">{league.description}</p>
          )}
          <div className="flex gap-3 mt-2 text-sm text-gray-500">
            <span>{league.sport}</span>
            <span>•</span>
            <span>{league.members.length} members</span>
            <span>•</span>
            <span>{league.seasons.length} seasons</span>
            <span>•</span>
            <span className="capitalize">{league.visibility.toLowerCase()}</span>
          </div>
        </div>
        {isCommissioner && (
          <div className="flex gap-2">
            <Link href={`/dashboard/leagues/${leagueId}/settings`}>
              <button className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">
                ⚙️ Settings
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Seasons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Seasons</h2>
          {isCommissioner && (
            <Link href={`/dashboard/leagues/import?leagueId=${leagueId}`}>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                📥 Import Data
              </button>
            </Link>
          )}
        </div>
        {league.seasons.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No seasons imported yet</p>
            <p className="text-sm">Import your first season from ESPN, Sleeper, or another platform.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {league.seasons.map((season) => (
              <div key={season.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{season.year} Season</h3>
                  <p className="text-sm text-gray-500">
                    {season.platform ?? "Manual"} • {season._count.teams} teams • {season._count.weeks} weeks
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    season.syncStatus === "COMPLETED" ? "bg-green-100 text-green-700" :
                    season.syncStatus === "SYNCING" ? "bg-yellow-100 text-yellow-700" :
                    season.syncStatus === "FAILED" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {season.syncStatus}
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
