import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getLuckReport } from "@/lib/luck";
import { signed } from "@/lib/season";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Stat, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Luck & all-play — TheLeague` : "Luck — TheLeague" };
}

const luckColor = (v: number, scale = 3) =>
  v >= 0 ? `rgba(16,185,129,${Math.min(0.6, (v / scale) * 0.6).toFixed(3)})` : `rgba(239,68,68,${Math.min(0.6, (-v / scale) * 0.6).toFixed(3)})`;

export default async function LuckPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const r = await getLuckReport(leagueId, era.scope);
  const base = `/dashboard/leagues/${leagueId}`;
  const unluckiest = r.table[0];
  const luckiest = r.table.at(-1);
  const leaguePPW = r.table.reduce((s, x) => s + x.pointsFor, 0) / Math.max(1, r.table.reduce((s, x) => s + x.wins, 0));
  const years = [...r.years].sort((a, b) => a - b);
  const seasonCell = (memberId: string, y: number) => r.seasons.find((s) => s.memberId === memberId && s.year === y);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={`${era.isAll ? "All seasons" : era.label} · regular season`}
          title="Luck & all-play"
          description="Expected wins treat every week as if you played the whole league: beat 7 of 9 teams and that week is worth 0.78 wins. Luck is actual wins minus expected."
        />
        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          {r.table.length === 0 ? (
            <Empty>No games in this era.</Empty>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
                <Stat label="Unluckiest" value={signed(unluckiest.luck, 1)} detail={`${unluckiest.memberName} · ${unluckiest.wins} wins vs ${unluckiest.expectedWins.toFixed(1)} expected`} />
                <Stat label="Luckiest" value={signed(luckiest!.luck, 1)} detail={`${luckiest!.memberName} · ${luckiest!.wins} wins vs ${luckiest!.expectedWins.toFixed(1)} expected`} />
                <Stat label="League points per win" value={leaguePPW.toFixed(1)} detail="Total points ÷ total wins" />
                <Stat
                  label="Worst standings drop"
                  value={r.collapses[0] && r.collapses[0].drop > 0 ? `−${r.collapses[0].drop}` : "—"}
                  detail={r.collapses[0] ? `${r.collapses[0].memberName} ${r.collapses[0].year}: all-play #${r.collapses[0].allPlayRank} → seed ${r.collapses[0].seed}` : undefined}
                />
              </div>

              <Section title="Luck table" note="Sorted unluckiest first. Top-3 lost = weeks with a top-3 score that still lost. Bottom-half W = wins while scoring in the bottom half.">
                <div className="overflow-x-auto border border-white/8 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold">Manager</th>
                        <th className="px-3 py-2.5 text-center font-semibold">W-L</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Exp. W</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Luck</th>
                        <th className="px-3 py-2.5 text-center font-semibold">All-play</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Pts / win</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Top-3 lost</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Bottom-half W</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Faced #1</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Playoffs earned / got</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 tabular-nums">
                      {r.table.map((m) => (
                        <tr key={m.memberId} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2">
                            <Link href={`${base}/members/${m.memberId}`} className="hover:text-emerald-400">{m.memberName}</Link>
                            <span className="ml-1.5 text-xs text-slate-600">{m.seasons} yr</span>
                          </td>
                          <td className="px-3 py-2 text-center">{m.wins}-{m.losses}{m.ties ? `-${m.ties}` : ""}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{m.expectedWins.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-medium" style={{ backgroundColor: luckColor(m.luck, 6) }}>{signed(m.luck, 1)}</td>
                          <td className="px-3 py-2 text-center text-slate-300">{m.allPlayWins}-{m.allPlayLosses}</td>
                          <td className={`px-3 py-2 text-right ${m.pointsPerWin > leaguePPW * 1.05 ? "text-red-400" : "text-slate-300"}`}>{m.pointsPerWin.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{m.top3Losses} <span className="text-slate-600">/ {m.top3Weeks}</span></td>
                          <td className="px-3 py-2 text-right text-slate-300">{m.bottomHalfWins}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{m.facedTopScorer} <span className="text-slate-600">/ {m.facedTopExpected.toFixed(1)} exp</span></td>
                          <td className="px-3 py-2 text-right text-slate-300">{m.playoffBerthsEarned} / {m.playoffBerthsActual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Playoffs earned counts seasons in the all-play top 60% of the league; got counts seasons seeded there. Faced #1 compares how often your opponent had the week&apos;s top score with how often chance says he should.
                </p>
              </Section>

              <Section title="Luck by season" note="Wins minus expected wins. Green ran lucky, red ran unlucky.">
                <div className="overflow-x-auto border border-white/8 rounded-lg">
                  <table className="text-sm tabular-nums">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-slate-950">Manager</th>
                        {years.map((y) => (
                          <th key={y} className="px-3 py-2 font-semibold text-center w-20">
                            <Link href={`${base}/seasons/${y}`} className="hover:text-slate-300">{y}</Link>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.table.map((m) => (
                        <tr key={m.memberId} className="border-t border-white/5">
                          <td className="px-3 py-1.5 whitespace-nowrap text-slate-300 sticky left-0 bg-slate-950">{m.memberName}</td>
                          {years.map((y) => {
                            const s = seasonCell(m.memberId, y);
                            return (
                              <td key={y} className="px-3 py-1.5 text-center" style={{ backgroundColor: s ? luckColor(s.luck) : undefined }} title={s ? `${s.wins} W vs ${s.expectedWins.toFixed(1)} exp · all-play #${s.allPlayRank}, seed ${s.seed}` : undefined}>
                                {s ? signed(s.luck, 1) : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <div className="grid md:grid-cols-2 gap-8">
                <Section title="Biggest standings collapses" note="All-play rank (how good the team was) against final seed.">
                  <RankList rows={r.collapses.filter((c) => c.drop > 0).map((c) => ({ k: `${c.year}-${c.memberId}`, who: c.memberName, year: c.year, a: c.allPlayRank, b: c.seed, d: -c.drop }))} base={base} />
                </Section>
                <Section title="Biggest overachievers" note="Seeded higher than their all-play rank.">
                  <RankList rows={r.rises.filter((c) => c.rise > 0).map((c) => ({ k: `${c.year}-${c.memberId}`, who: c.memberName, year: c.year, a: c.allPlayRank, b: c.seed, d: c.rise }))} base={base} />
                </Section>
              </div>
            </>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}

function RankList({ rows, base }: { rows: { k: string; who: string; year: number; a: number; b: number; d: number }[]; base: string }) {
  if (!rows.length) return <Empty>None in this era.</Empty>;
  return (
    <ul className="border border-white/8 rounded-lg divide-y divide-white/5">
      {rows.map((r) => (
        <li key={r.k}>
          <Link href={`${base}/seasons/${r.year}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/[0.02]">
            <span>
              {r.who} <span className="text-slate-500">· {r.year}</span>
            </span>
            <span className="tabular-nums text-slate-400">
              all-play #{r.a} → seed {r.b}{" "}
              <span className={r.d < 0 ? "text-red-400" : "text-emerald-400"}>({r.d > 0 ? "+" : ""}{r.d})</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
