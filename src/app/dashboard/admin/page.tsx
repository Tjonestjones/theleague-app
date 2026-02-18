import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

// Simple admin panel — only accessible by the app owner
const ADMIN_EMAILS = [
  "thomasjones@theleague.app",
  // Add your email here
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">🔧 Admin Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Users</p>
          <p className="text-2xl font-bold">{userCount}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Leagues</p>
          <p className="text-2xl font-bold">{leagueCount}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Seasons</p>
          <p className="text-2xl font-bold">{seasonCount}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Matchups</p>
          <p className="text-2xl font-bold">{matchupCount}</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Members</p>
          <p className="text-2xl font-bold">{memberCount}</p>
        </div>
      </div>

      {/* Subscription Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Subscriptions</h2>
        <div className="flex gap-4">
          {subStats.map((s) => (
            <div key={s.subscriptionStatus} className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">{s.subscriptionStatus}</p>
              <p className="text-xl font-bold">{s._count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Leagues */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Leagues</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">League</th>
                <th className="text-left px-4 py-3 font-medium">Owner</th>
                <th className="text-center px-4 py-3 font-medium">Members</th>
                <th className="text-center px-4 py-3 font-medium">Seasons</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentLeagues.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3">{l.owner.firstName ?? l.owner.email}</td>
                  <td className="text-center px-4 py-3">{l._count.members}</td>
                  <td className="text-center px-4 py-3">{l._count.seasons}</td>
                  <td className="text-center px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      l.subscriptionStatus === "ACTIVE" ? "bg-green-100 text-green-700" :
                      l.subscriptionStatus === "TRIAL" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {l.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{l.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
