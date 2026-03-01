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

  if (!league) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">League not found</div>;

  const standings = await getAllTimeStandings(leagueId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-700/10 to-blue-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-blue-500/30 rounded-3xl p-10 shadow-2xl">
          <Link href={`/dashboard/leagues/${leagueId}`} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold mb-4 transition-colors">
            <span className="text-2xl">←</span>
            <span>Back to {league.name}</span>
          </Link>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight">👥 Members</h1>
          <p className="text-2xl text-slate-400 font-semibold mt-3">
            <span className="text-blue-400 font-black">{standings.length}</span> league members
          </p>
        </div>
      </div>

      {standings.length === 0 ? (
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-blue-500/30 rounded-3xl p-16 text-center shadow-2xl">
          <div className="text-9xl mb-6">👥</div>
          <p className="text-2xl text-slate-400 font-semibold">No member data yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {standings.map((s, i) => (
            <Link key={s.memberId} href={`/dashboard/leagues/${leagueId}/members/${s.memberId}`}>
              <div className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-blue-500/20 hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 shadow-2xl hover:shadow-blue-500/20 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-black text-slate-600">
                        {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </span>
                      <h3 className="font-black text-2xl text-white group-hover:text-blue-400 transition-colors">{s.memberName}</h3>
                    </div>
                    <span className="px-4 py-2 bg-blue-500/20 border-2 border-blue-500/30 rounded-full text-blue-400 font-black text-lg">
                      {(s.winPct * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Record</p>
                      <p className="text-lg font-black text-white">{s.wins}-{s.losses}{s.ties > 0 ? `-${s.ties}` : ""}</p>
                    </div>
                    <div className="text-center bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">PF</p>
                      <p className="text-lg font-black text-emerald-400">{s.pointsFor.toFixed(0)}</p>
                    </div>
                    <div className="text-center bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">PA</p>
                      <p className="text-lg font-black text-red-400">{s.pointsAgainst.toFixed(0)}</p>
                    </div>
                    <div className="text-center bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Seasons</p>
                      <p className="text-lg font-black text-white">{s.seasons}</p>
                    </div>
                  </div>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
