import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllTimeStandings, getSeasonStandings } from "@/lib/records";
import Link from "next/link";
import { SeasonTabs } from "./season-tabs";
import { SubscriptionGate } from "@/components/subscription-gate";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · History — TheLeague` : "History — TheLeague" };
}

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

  if (!league)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">
        League not found
      </div>
    );

  const [allTimeStandings, seasonStandings] = await Promise.all([
    getAllTimeStandings(leagueId),
    getSeasonStandings(leagueId),
  ]);

  const rankStyle = (i: number) =>
    i === 0
      ? "text-yellow-400 font-black"
      : i === 1
      ? "text-slate-400 font-black"
      : i === 2
      ? "text-amber-600 font-black"
      : "text-slate-600 font-bold";

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← {league.name}
          </Link>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">League History</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                All-time standings and season-by-season breakdown
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/leagues/${leagueId}/records`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-yellow-400 hover:border-yellow-500/25 font-bold text-sm transition-all"
              >
                Records
              </Link>
              <Link
                href={`/dashboard/leagues/${leagueId}/transactions`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-orange-400 hover:border-orange-500/25 font-bold text-sm transition-all"
              >
                Transactions
              </Link>
              <Link
                href={`/dashboard/leagues/${leagueId}/members`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-blue-400 hover:border-blue-500/25 font-bold text-sm transition-all"
              >
                Members
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 space-y-12">

        {/* ── ALL-TIME STANDINGS ──────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
            All-Time Standings
          </h2>

          {allTimeStandings.length === 0 ? (
            <div className="border-2 border-dashed border-white/8 rounded-2xl p-12 text-center">
              <p className="text-slate-600 font-bold text-sm">No data yet. Import some seasons first.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/8">
                  <tr>
                    {["#", "Member", "W", "L", "T", "Win %", "PF", "PA", "Seasons"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500 ${
                          i === 0 ? "text-left w-10" :
                          i === 1 ? "text-left" :
                          i <= 5 ? "text-center" :
                          "text-right"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allTimeStandings.map((s, i) => (
                    <tr
                      key={s.memberId}
                      className={`transition-colors hover:bg-white/3 ${i === 0 ? "bg-yellow-500/4" : ""}`}
                    >
                      <td className={`px-5 py-4 text-sm ${rankStyle(i)}`}>
                        {i < 3 ? ["1st", "2nd", "3rd"][i] : i + 1}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/leagues/${leagueId}/members/${s.memberId}`}
                          className="font-bold text-white hover:text-emerald-400 transition-colors text-sm"
                        >
                          {s.memberName}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-center text-sm font-black text-emerald-400">{s.wins}</td>
                      <td className="px-5 py-4 text-center text-sm font-bold text-red-400">{s.losses}</td>
                      <td className="px-5 py-4 text-center text-sm font-bold text-slate-600">{s.ties}</td>
                      <td className="px-5 py-4 text-center text-sm font-black text-white">
                        {(s.winPct * 100).toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-white">
                        {s.pointsFor.toFixed(1)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-slate-400">
                        {s.pointsAgainst.toFixed(1)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-white">{s.seasons}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── SEASON-BY-SEASON ────────────────────────────────────────── */}
        {seasonStandings.length > 0 && (
          <SeasonTabs seasons={seasonStandings} leagueId={leagueId} />
        )}
      </div>
    </div>
    </SubscriptionGate>
  );
}
