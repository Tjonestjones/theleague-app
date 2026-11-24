import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getRivalry } from "@/lib/rivalries";
import { SubscriptionGate } from "@/components/subscription-gate";
import { Section, Stat, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string; a: string; b: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { a, b } = await params;
  const ms = await prisma.member.findMany({ where: { id: { in: [a, b] } }, select: { id: true, displayName: true } });
  const n = (id: string) => ms.find((m) => m.id === id)?.displayName ?? "";
  return { title: `${n(a)} vs ${n(b)} — TheLeague` };
}

export default async function RivalryPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId, a, b } = await params;

  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();
  const r = await getRivalry(leagueId, a, b, era.scope);
  if (!r) notFound();

  const base = `/dashboard/leagues/${leagueId}`;
  const leader = r.record.a > r.record.b ? r.a : r.record.b > r.record.a ? r.b : null;
  const maxSeason = Math.max(1, ...r.bySeason.map((s) => s.a + s.b));

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <header className="border-b border-white/8 px-6 md:px-10 pt-8 pb-7">
          <div className="max-w-6xl">
            <div className="flex items-center justify-between mb-6 text-xs text-slate-500">
              <Link href={`${base}/rivalries`} className="hover:text-slate-300">Rivalries</Link>
              <Link href={`${base}/rivalries/${b}/${a}`} className="btn-secondary">
                <ArrowLeftRight className="w-3.5 h-3.5" /> Swap sides
              </Link>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-6">
              <div>
                <Link href={`${base}/members/${r.a.id}`} className="text-xl md:text-2xl font-semibold hover:text-emerald-400">{r.a.name}</Link>
                <p className={`mt-2 text-5xl font-semibold tabular-nums ${leader?.id === r.a.id ? "text-white" : "text-slate-500"}`}>{r.record.a}</p>
              </div>
              <p className="pb-3 text-xs text-slate-500">{r.record.ties ? `${r.record.ties} tie${r.record.ties > 1 ? "s" : ""}` : "wins"}</p>
              <div className="text-right">
                <Link href={`${base}/members/${r.b.id}`} className="text-xl md:text-2xl font-semibold hover:text-emerald-400">{r.b.name}</Link>
                <p className={`mt-2 text-5xl font-semibold tabular-nums ${leader?.id === r.b.id ? "text-white" : "text-slate-500"}`}>{r.record.b}</p>
              </div>
            </div>
            {!era.isAll && <p className="mt-4 text-xs text-slate-500">Limited to {era.label}.</p>}
          </div>
        </header>

        <div className="px-6 md:px-10 py-8 space-y-10 max-w-6xl">
          {r.games.length === 0 ? (
            <Empty>These two haven&apos;t played each other in this era.</Empty>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
                <Stat label="Games" value={String(r.games.length)} detail={r.playoffGames.length ? `${r.playoffGames.length} in the playoffs` : "None in the playoffs"} />
                <Stat label="Points" value={`${r.points.a.toFixed(0)}–${r.points.b.toFixed(0)}`} detail={`Avg margin ${r.avgMargin.toFixed(1)}`} />
                <Stat
                  label="Current streak"
                  value={r.streak ? `${r.streak.length}` : "—"}
                  detail={r.streak ? `${r.streak.holder === "a" ? r.a.name : r.b.name} in a row` : undefined}
                />
                <Stat
                  label="Closest game"
                  value={r.closest ? Math.abs(r.closest.aScore - r.closest.bScore).toFixed(2) : "—"}
                  detail={r.closest ? `${r.closest.year} · Week ${r.closest.week}` : undefined}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {(["a", "b"] as const).map((side) => {
                  const g = r.biggestWin[side];
                  const who = side === "a" ? r.a.name : r.b.name;
                  return (
                    <Section key={side} title={`${who}'s biggest win`}>
                      {g ? (
                        <Link href={`${base}/matchups/${g.matchupId}`} className="block border border-white/8 rounded-lg px-4 py-3 hover:border-white/20">
                          <p className="text-2xl font-semibold tabular-nums">
                            {Math.max(g.aScore, g.bScore).toFixed(2)} – {Math.min(g.aScore, g.bScore).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">{g.year} · Week {g.week}{g.isPlayoff ? " · Playoffs" : ""} · by {Math.abs(g.aScore - g.bScore).toFixed(2)}</p>
                        </Link>
                      ) : (
                        <Empty>No wins yet.</Empty>
                      )}
                    </Section>
                  );
                })}
              </div>

              <Section title="By season">
                <div className="flex items-end gap-3 h-28 border-b border-white/8 pb-1">
                  {r.bySeason.map((s) => (
                    <div key={s.year} className="flex-1 flex flex-col justify-end items-center gap-px h-full" title={`${s.year}: ${s.a}-${s.b}`}>
                      <div className="w-full max-w-10 bg-emerald-500/75" style={{ height: `${(s.a / maxSeason) * 100}%` }} />
                      <div className="w-full max-w-10 bg-slate-500/60" style={{ height: `${(s.b / maxSeason) * 100}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-1">
                  {r.bySeason.map((s) => (
                    <span key={s.year} className="flex-1 text-center text-[11px] text-slate-500 tabular-nums">{s.year} · {s.a}-{s.b}</span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  <span className="inline-block w-2 h-2 bg-emerald-500/75 mr-1" />{r.a.name} wins
                  <span className="inline-block w-2 h-2 bg-slate-500/60 ml-3 mr-1" />{r.b.name} wins
                </p>
              </Section>

              <Section title="Every game" note="Most recent first">
                <div className="border border-white/8 rounded-lg divide-y divide-white/5">
                  {[...r.games].reverse().map((g) => {
                    const aWon = g.aScore > g.bScore;
                    return (
                      <Link key={g.matchupId} href={`${base}/matchups/${g.matchupId}`} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.02]">
                        <span className="text-slate-500 tabular-nums">
                          {g.year} · Wk {g.week}
                          {g.isPlayoff && <span className="ml-1.5 text-[10px] text-yellow-400">PO</span>}
                        </span>
                        <span className="text-slate-300">{aWon ? r.a.name : g.bScore > g.aScore ? r.b.name : "Tie"}</span>
                        <span className="tabular-nums">
                          <span className={aWon ? "text-white" : "text-slate-500"}>{g.aScore.toFixed(2)}</span>
                          <span className="text-slate-600"> – </span>
                          <span className={!aWon && g.bScore > g.aScore ? "text-white" : "text-slate-500"}>{g.bScore.toFixed(2)}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}
