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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero */}
      <header className="max-w-5xl mx-auto px-6 py-16 text-center">
        {league.logoUrl && (
          <img src={league.logoUrl} alt="" className="w-24 h-24 rounded-full mx-auto mb-6" />
        )}
        <h1 className="text-5xl font-bold mb-3">{league.name}</h1>
        {league.description && (
          <p className="text-xl text-gray-300 mb-4">{league.description}</p>
        )}
        <div className="flex gap-6 justify-center text-gray-400">
          <span>{league._count.members} Members</span>
          <span>•</span>
          <span>{league._count.seasons} Seasons</span>
          <span>•</span>
          <span>{league.sport}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-12">
        {/* All-Time Standings */}
        {standings.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">🏆 All-Time Standings</h2>
            <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Member</th>
                    <th className="text-center px-5 py-3 font-medium">W</th>
                    <th className="text-center px-5 py-3 font-medium">L</th>
                    <th className="text-center px-5 py-3 font-medium">Win %</th>
                    <th className="text-right px-5 py-3 font-medium">PF</th>
                    <th className="text-center px-5 py-3 font-medium">Seasons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {standings.map((s, i) => (
                    <tr key={s.memberId} className={`hover:bg-gray-700/30 ${i === 0 ? "bg-yellow-900/20" : ""}`}>
                      <td className="px-5 py-3 font-medium">
                        {i === 0 ? "👑" : i + 1}
                      </td>
                      <td className="px-5 py-3 font-medium">{s.memberName}</td>
                      <td className="text-center px-5 py-3 text-green-400">{s.wins}</td>
                      <td className="text-center px-5 py-3 text-red-400">{s.losses}</td>
                      <td className="text-center px-5 py-3">{(s.winPct * 100).toFixed(1)}%</td>
                      <td className="text-right px-5 py-3">{s.pointsFor.toFixed(0)}</td>
                      <td className="text-center px-5 py-3">{s.seasons}</td>
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
            <h2 className="text-2xl font-bold mb-6">📅 {latestSeason.year} Season</h2>
            <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Team</th>
                    <th className="text-left px-5 py-3 font-medium">Owner</th>
                    <th className="text-center px-5 py-3 font-medium">Record</th>
                    <th className="text-right px-5 py-3 font-medium">PF</th>
                    <th className="text-right px-5 py-3 font-medium">PA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {latestSeason.teams.map((t, i) => (
                    <tr key={t.teamId} className={`hover:bg-gray-700/30 ${i === 0 ? "bg-yellow-900/20" : ""}`}>
                      <td className="px-5 py-3">{i === 0 ? "🏆" : i + 1}</td>
                      <td className="px-5 py-3 font-medium">{t.teamName}</td>
                      <td className="px-5 py-3 text-gray-400">{t.memberName}</td>
                      <td className="text-center px-5 py-3">
                        <span className="text-green-400">{t.wins}</span>
                        -
                        <span className="text-red-400">{t.losses}</span>
                        {t.ties > 0 && <span>-{t.ties}</span>}
                      </td>
                      <td className="text-right px-5 py-3">{t.pointsFor.toFixed(1)}</td>
                      <td className="text-right px-5 py-3">{t.pointsAgainst.toFixed(1)}</td>
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
            <h2 className="text-2xl font-bold mb-6">🎯 Record Book Highlights</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {topRecords.map((r, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-400">{r.title}</p>
                      <p className="font-semibold mt-1">{r.holder}</p>
                      <p className="text-xs text-gray-500 mt-1">{r.detail}</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Season History */}
        {seasons.length > 1 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">📜 Season Champions</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {seasons.map((s) => {
                const champ = s.teams[0];
                if (!champ) return null;
                return (
                  <div key={s.year} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 text-center">
                    <p className="text-3xl mb-2">🏆</p>
                    <p className="text-lg font-bold">{s.year}</p>
                    <p className="text-blue-400 font-medium mt-1">{champ.teamName}</p>
                    <p className="text-sm text-gray-400">{champ.memberName}</p>
                    <p className="text-sm text-gray-500 mt-1">{champ.wins}-{champ.losses} • {champ.pointsFor.toFixed(0)} pts</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-8 text-center text-gray-500 text-sm">
        <p>Powered by <a href="/" className="text-blue-400 hover:underline">TheLeague</a></p>
      </footer>
    </div>
  );
}
