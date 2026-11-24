import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getCloseGamesReport } from "@/lib/luck";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Stat, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Close games — TheLeague` : "Close games — TheLeague" };
}

export default async function CloseGamesPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const r = await getCloseGamesReport(leagueId, era.scope);
  const base = `/dashboard/leagues/${leagueId}`;
  const rec = (w: number, l: number) => (
    <span className={w > l ? "text-emerald-400" : w < l ? "text-red-400" : "text-slate-300"}>{w}-{l}</span>
  );
  const worst = r.table[0];

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={`${era.isAll ? "All seasons" : era.label} · regular season`}
          title="Close games"
          description="One-score games, the narrowest results, and losses a better lineup would have won."
        />
        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          {r.table.length === 0 ? (
            <Empty>No games in this era.</Empty>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
                <Stat label="Games decided by 3 or less" value={String(r.totals.oneScore)} detail={`${((r.totals.oneScore / Math.max(1, r.totals.games)) * 100).toFixed(1)}% of all games`} />
                <Stat label="Losses a perfect lineup wins" value={String(r.totals.flippable)} detail={`${((r.totals.flippable / Math.max(1, r.totals.losses)) * 100).toFixed(0)}% of all losses`} />
                <Stat label="Worst in one-score games" value={worst ? `${worst.w3}-${worst.l3}` : "—"} detail={worst?.memberName} />
                <Stat label="Closest game" value={r.closest[0] ? (r.closest[0].score - r.closest[0].opp).toFixed(2) : "—"} detail={r.closest[0] ? `${r.closest[0].memberName} over ${r.closest[0].oppMemberName} · ${r.closest[0].year}` : undefined} />
              </div>

              <Section title="Record in close games" note="Sorted worst first by games decided by 3 points or less. Flippable = losses where his best possible lineup beat the opponent's actual score.">
                <div className="overflow-x-auto border border-white/8 rounded-lg">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold">Manager</th>
                        <th className="px-3 py-2.5 text-center font-semibold">≤ 2 pts</th>
                        <th className="px-3 py-2.5 text-center font-semibold">≤ 3 pts</th>
                        <th className="px-3 py-2.5 text-center font-semibold">≤ 5 pts</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Flippable losses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {r.table.map((m) => (
                        <tr key={m.memberId} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2">
                            <Link href={`${base}/members/${m.memberId}`} className="hover:text-emerald-400">{m.memberName}</Link>
                          </td>
                          <td className="px-3 py-2 text-center">{rec(m.w2, m.l2)}</td>
                          <td className="px-3 py-2 text-center">{rec(m.w3, m.l3)}</td>
                          <td className="px-3 py-2 text-center">{rec(m.w5, m.l5)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{m.flippable} <span className="text-slate-600">of {m.losses}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <div className="grid lg:grid-cols-2 gap-8 items-start">
                <Section title="Closest games">
                  <ul className="border border-white/8 rounded-lg divide-y divide-white/5">
                    {r.closest.map((g) => (
                      <li key={g.matchupId}>
                        <Link href={`${base}/matchups/${g.matchupId}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.02]">
                          <span className="truncate">
                            {g.memberName} <span className="text-slate-500">over</span> {g.oppMemberName}
                            <span className="block text-xs text-slate-500">{g.year} · Week {g.week}</span>
                          </span>
                          <span className="text-right tabular-nums">
                            {g.score.toFixed(2)}–{g.opp.toFixed(2)}
                            <span className="block text-xs text-slate-500">by {(g.score - g.opp).toFixed(2)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Narrowest losses a perfect lineup would have won">
                  {r.flips.length === 0 ? (
                    <Empty>None found. Lineup data may be missing for these seasons.</Empty>
                  ) : (
                    <ul className="border border-white/8 rounded-lg divide-y divide-white/5">
                      {r.flips.map((g) => (
                        <li key={`${g.matchupId}-${g.memberId}`}>
                          <Link href={`${base}/matchups/${g.matchupId}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.02]">
                            <span className="min-w-0">
                              {g.memberName} <span className="text-slate-500">lost to</span> {g.oppName}
                              <span className="block text-xs text-slate-500 truncate">
                                {g.year} · Wk {g.week}
                                {g.bestBench ? ` · bench: ${g.bestBench.name} ${g.bestBench.points.toFixed(1)}` : ""}
                              </span>
                            </span>
                            <span className="text-right tabular-nums">
                              {g.score.toFixed(2)}–{g.opp.toFixed(2)}
                              <span className="block text-xs text-emerald-400/80">best {g.optimal.toFixed(2)}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>
            </>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}
