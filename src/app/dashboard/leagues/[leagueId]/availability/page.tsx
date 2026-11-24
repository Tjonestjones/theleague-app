import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getAvailabilityReport } from "@/lib/draft";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Stat, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Availability — TheLeague` : "Availability — TheLeague" };
}

const pct = (v: number | null, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);

export default async function AvailabilityPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const r = await getAvailabilityReport(leagueId, era.scope);
  const base = `/dashboard/leagues/${leagueId}`;
  const lg = r.leagueEarly ?? 0;
  const shade = (v: number | null) => {
    if (v == null || !lg) return undefined;
    const d = v / lg - 1; // above league = more games missed = red
    return d >= 0 ? `rgba(239,68,68,${Math.min(0.55, d * 0.8).toFixed(3)})` : `rgba(16,185,129,${Math.min(0.55, -d * 0.8).toFixed(3)})`;
  };
  const top = r.managers.find((m) => m.earlyPct != null);
  const bottom = [...r.managers].reverse().find((m) => m.earlyPct != null);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={`${era.isAll ? "All seasons" : era.label} · fantasy regular season`}
          title="Availability"
          description="Share of games each manager's drafted players missed during the fantasy regular season, wherever the player sat: starting, bench or IR. Kickers and defenses are left out."
        />
        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          {!r.hasLogs ? (
            <div className="border border-yellow-500/25 bg-yellow-500/[0.04] rounded-lg px-5 py-4 text-sm text-slate-300">
              NFL game logs haven&apos;t been loaded yet. Run <code className="text-yellow-300">npm run sync:nfl-stats</code> to pull them from nflverse; this page fills in once they&apos;re in.
            </div>
          ) : r.managers.length === 0 ? (
            <Empty>No draft data in this era.</Empty>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
                <Stat label="League, rounds 1–5" value={pct(r.leagueEarly)} detail="Games missed ÷ games available" />
                <Stat label="Most time lost" value={pct(top?.earlyPct ?? null)} detail={top ? `${top.memberName} · ${lg ? ((top.earlyPct ?? 0) / lg).toFixed(2) : "—"}× league` : undefined} />
                <Stat label="Healthiest core" value={pct(bottom?.earlyPct ?? null)} detail={bottom?.memberName} />
                <Stat label="Games available per pick" value={Object.values(r.regWeeks).length ? `${Math.min(...Object.values(r.regWeeks)) - 1}–${Math.max(...Object.values(r.regWeeks)) - 1}` : "—"} detail="Regular-season weeks minus the bye" />
              </div>

              <Section title="Drafted core, rounds 1–5" note="Shaded against the league rate: red lost more time than average, green less.">
                <div className="overflow-x-auto border border-white/8 rounded-lg">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold w-8">#</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Manager</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Missed</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Available</th>
                        <th className="px-3 py-2.5 text-right font-semibold">% missed</th>
                        <th className="px-3 py-2.5 text-right font-semibold">vs league</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Missed 1+</th>
                        <th className="px-3 py-2.5 text-right font-semibold">3+</th>
                        <th className="px-3 py-2.5 text-right font-semibold">5+</th>
                        <th className="px-3 py-2.5 text-right font-semibold">8+</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {r.managers.map((m, i) => (
                        <tr key={m.memberId} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                          <td className="px-3 py-2">
                            <Link href={`${base}/members/${m.memberId}`} className="hover:text-emerald-400">{m.memberName}</Link>
                            <span className="ml-1.5 text-xs text-slate-600">{m.earlyPicks} picks</span>
                          </td>
                          <td className="px-3 py-2 text-right">{m.earlyMissed}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{m.earlyAvailable}</td>
                          <td className="px-3 py-2 text-right font-medium" style={{ backgroundColor: shade(m.earlyPct) }}>{pct(m.earlyPct)}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{m.earlyPct != null && lg ? `${(m.earlyPct / lg).toFixed(2)}×` : "—"}</td>
                          {m.incidence.map((v, j) => <td key={j} className="px-3 py-2 text-right text-slate-400">{pct(v, 0)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Missed N+ = share of a manager&apos;s round 1–5 picks who missed at least N games. This measures availability, so it counts suspensions, benchings and players without an NFL roster spot as well as injuries. nflverse only logs a game when the player recorded a stat.
                </p>
              </Section>

              <div className="grid lg:grid-cols-2 gap-8 items-start">
                <Section title="By draft depth" note="% of games missed. Shows whether the effect lives at the top of the draft or across it.">
                  <div className="overflow-x-auto border border-white/8 rounded-lg">
                    <table className="w-full text-sm tabular-nums">
                      <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Manager</th>
                          {r.slices.map((s) => <th key={s} className="px-2 py-2 text-right font-semibold whitespace-nowrap">{s.replace("Rounds ", "R")}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {r.managers.map((m) => (
                          <tr key={m.memberId} className="border-t border-white/5">
                            <td className="px-3 py-1.5 text-slate-300 whitespace-nowrap">{m.memberName}</td>
                            {m.slices.map((v, i) => <td key={i} className="px-2 py-1.5 text-right" style={{ backgroundColor: shade(v) }}>{pct(v, 0)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>

                <Section title="By season, rounds 1–5">
                  <div className="overflow-x-auto border border-white/8 rounded-lg">
                    <table className="w-full text-sm tabular-nums">
                      <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Manager</th>
                          {r.years.map((y) => <th key={y} className="px-2 py-2 text-right font-semibold">{String(y).slice(2)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {r.managers.map((m) => (
                          <tr key={m.memberId} className="border-t border-white/5">
                            <td className="px-3 py-1.5 text-slate-300 whitespace-nowrap">{m.memberName}</td>
                            {m.byYear.map((v, i) => <td key={i} className="px-2 py-1.5 text-right" style={{ backgroundColor: shade(v) }}>{v == null ? "" : Math.round(v * 100)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </div>

              <Section title="Most-missed early picks">
                <div className="border border-white/8 rounded-lg overflow-hidden">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Season</th>
                        <th className="px-3 py-2 text-left font-semibold">Pick</th>
                        <th className="px-3 py-2 text-left font-semibold">Player</th>
                        <th className="px-3 py-2 text-left font-semibold">Manager</th>
                        <th className="px-3 py-2 text-right font-semibold">Played</th>
                        <th className="px-3 py-2 text-right font-semibold">Missed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {r.mostMissed.map((p) => (
                        <tr key={`${p.year}-${p.overall}`}>
                          <td className="px-3 py-2 text-slate-400">{p.year}</td>
                          <td className="px-3 py-2 text-slate-400">R{p.round} · #{p.overall}</td>
                          <td className="px-3 py-2">
                            <Link href={`${base}/players/${p.playerId}`} className="hover:text-emerald-400">{p.name}</Link>{" "}
                            <span className="text-xs text-slate-600">{p.position}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-300">{p.memberName}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{p.played} of {p.available}</td>
                          <td className="px-3 py-2 text-right text-red-400">{p.missed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}
