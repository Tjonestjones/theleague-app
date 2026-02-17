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
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{user.firstName ? `, ${user.firstName}` : ""}! 🏈
          </h1>
          <p className="text-gray-500 mt-1">
            {leagues.length === 0
              ? "Create your first league to get started."
              : `You're in ${leagues.length} league${leagues.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Link href="/dashboard/leagues/create">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
            + Create League
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Leagues</p>
          <p className="text-2xl font-bold">{leagues.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Leagues I Own</p>
          <p className="text-2xl font-bold">
            {leagues.filter((l) => l.members[0]?.role === "COMMISSIONER").length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Seasons</p>
          <p className="text-2xl font-bold">
            {leagues.reduce((sum, l) => sum + l._count.seasons, 0)}
          </p>
        </div>
      </div>

      {/* League Cards */}
      {leagues.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No leagues yet</h2>
          <p className="text-gray-500 mb-4">
            Create a league and start importing your fantasy football history.
          </p>
          <Link href="/dashboard/leagues/create">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
              Create Your First League
            </button>
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">My Leagues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leagues.map((league) => (
              <Link key={league.id} href={`/dashboard/leagues/${league.id}`}>
                <div className="border rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{league.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      league.members[0]?.role === "COMMISSIONER"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {league.members[0]?.role?.replace("_", " ") ?? "MEMBER"}
                    </span>
                  </div>
                  {league.description && (
                    <p className="text-sm text-gray-500 mb-3">{league.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{league._count.members} member{league._count.members !== 1 ? "s" : ""}</span>
                    <span>{league._count.seasons} season{league._count.seasons !== 1 ? "s" : ""}</span>
                    <span>{league.sport}</span>
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
