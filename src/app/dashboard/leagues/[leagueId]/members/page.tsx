import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllTimeStandings } from "@/lib/records";
import Link from "next/link";
import { SubscriptionGate } from "@/components/subscription-gate";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Members — TheLeague` : "Members — TheLeague" };
}

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

  if (!league)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">
        League not found
      </div>
    );

  const standings = await getAllTimeStandings(leagueId);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 right-0 w-72 h-72 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← {league.name}
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Members</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {standings.length} league member{standings.length !== 1 ? "s" : ""} · ranked by all-time win %
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10">
        {standings.length === 0 ? (
          <div className="border-2 border-dashed border-white/8 rounded-2xl p-12 text-center">
            <p className="text-slate-600 font-bold text-sm">No member data yet. Import some seasons first.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {standings.map((s, i) => {
              const rankLabel = i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i + 1}`;
              const rankColor =
                i === 0 ? "text-yellow-400" :
                i === 1 ? "text-slate-400" :
                i === 2 ? "text-amber-600" :
                "text-slate-600";

              return (
                <Link key={s.memberId} href={`/dashboard/leagues/${leagueId}/members/${s.memberId}`}>
                  <div className="group flex items-stretch bg-slate-900 border border-white/8 hover:border-blue-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-950/40 cursor-pointer">

                    {/* Rank strip */}
                    <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 border-r border-white/5 bg-slate-800/30">
                      <span className={`text-xs font-black ${rankColor}`}>{rankLabel}</span>
                    </div>

                    <div className="flex-1 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-white group-hover:text-blue-400 transition-colors">
                          {s.memberName}
                        </h3>
                        <span className="text-lg font-black text-white">
                          {(s.winPct * 100).toFixed(1)}
                          <span className="text-xs font-bold text-slate-500 ml-0.5">%</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Record", value: `${s.wins}-${s.losses}${s.ties > 0 ? `-${s.ties}` : ""}` },
                          { label: "PF", value: s.pointsFor.toFixed(0), color: "text-emerald-400" },
                          { label: "PA", value: s.pointsAgainst.toFixed(0), color: "text-red-400" },
                          { label: "Seasons", value: String(s.seasons) },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-slate-800/50 rounded-xl p-2.5 border border-white/5 text-center">
                            <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className={`text-sm font-black ${stat.color ?? "text-white"}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </SubscriptionGate>
  );
}
