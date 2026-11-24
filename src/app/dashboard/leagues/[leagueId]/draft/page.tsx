import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getDraftReport, type DraftPickRow } from "@/lib/draft";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Stat, Empty, FilterChip } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ year?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Draft — TheLeague` : "Draft — TheLeague" };
}

const pct = (v: number | null, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const retColor = (v: number | null) => {
  if (v == null) return undefined;
  const d = v - 1;
  return d >= 0 ? `rgba(16,185,129,${Math.min(0.55, d * 0.9).toFixed(3)})` : `rgba(239,68,68,${Math.min(0.55, -d * 1.1).toFixed(3)})`;
};

export default async function DraftPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const sp = await searchParams;
  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const r = await getDraftReport(leagueId, era.scope, Number(sp.year) || undefined);
  const base = `/dashboard/leagues/${leagueId}`;
  const best = r.managers.find((m) => m.earlyReturn != null);
  const worst = [...r.managers].reverse().find((m) => m.earlyReturn != null);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={era.isAll ? "All seasons" : era.label}
          title="Draft"
          description="How each manager's picks did against ESPN's preseason projection. 100% means a pick scored exactly what he was projected for the season."
        />
        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          {r.pickCount === 0 ? (
            <Empty>No draft data in this era.</Empty>
          ) : (
            <>
              {!r.hasProjections && (
                <div className="border border-yellow-500/25 bg-yellow-500/[0.04] rounded-lg px-5 py-4 text-sm text-slate-300">
                  ESPN projections haven&apos;t been imported for these seasons yet, so returns can&apos;t be calculated. New imports pull them automatically; for seasons already imported, run{" "}
                  <code className="text-yellow-300">npm run sync:espn-projections</code>. The draft board below still works.
                </div>
              )}

              {r.hasProjections && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
                    <Stat label="League, rounds 1–5" value={pct(r.leagueEarly)} detail="Actual ÷ projected points" />
                    <Stat label="Best early drafter" value={pct(best?.earlyReturn ?? null)} detail={best?.memberName} />
                    <Stat label="Worst early drafter" value={pct(worst?.earlyReturn ?? null)} detail={worst ? `${worst.memberName} · ${worst.earlyShortfall.toFixed(0)} pts short` : undefined} />
                    <Stat label="Picks analyzed" value={String(r.pickCount)} />
                  </div>

                  <Section title="Draft returns by manager" note="Rounds 1–5 is the drafted core. Bust = under 60% of projection; hit = over 120%. Both counted in rounds 1–5.">
                    <div className="overflow-x-auto border border-white/8 rounded-lg">
                      <table className="w-full text-sm tabular-nums">
                        <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-3 py-2.5 text-left font-semibold">Manager</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Rounds 1–5</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Points short</th>
                            <th className="px-3 py-2.5 text-right font-semibold">All picks</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Bust rate</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Hit rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {r.managers.map((m) => (
                            <tr key={m.memberId} className="hover:bg-white/[0.02]">
                              <td className="px-3 py-2">
                                <Link href={`${base}/members/${m.memberId}`} className="hover:text-emerald-400">{m.memberName}</Link>
                                <span className="ml-1.5 text-xs text-slate-600">{m.earlyN} early picks</span>
                              </td>
                              <td className="px-3 py-2 text-right font-medium" style={{ backgroundColor: retColor(m.earlyReturn) }}>{pct(m.earlyReturn)}</td>
                              <td className={`px-3 py-2 text-right ${m.earlyShortfall > 0 ? "text-red-400" : "text-emerald-400"}`}>{m.earlyShortfall > 0 ? `−${m.earlyShortfall.toFixed(0)}` : `+${(-m.earlyShortfall).toFixed(0)}`}</td>
                              <td className="px-3 py-2 text-right text-slate-300">{pct(m.allReturn)}</td>
                              <td className="px-3 py-2 text-right text-slate-300">{pct(m.bustRate, 0)}</td>
                              <td className="px-3 py-2 text-right text-slate-300">{pct(m.hitRate, 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>

                  <Section title="Rounds 1–5 by season">
                    <div className="overflow-x-auto border border-white/8 rounded-lg">
                      <table className="text-sm tabular-nums">
                        <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-slate-950">Manager</th>
                            {r.years.map((y) => <th key={y} className="px-3 py-2 font-semibold text-center w-20">{y}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {r.matrix.map((m) => (
                            <tr key={m.memberId} className="border-t border-white/5">
                              <td className="px-3 py-1.5 whitespace-nowrap text-slate-300 sticky left-0 bg-slate-950">{m.memberName}</td>
                              {m.byYear.map((v, i) => (
                                <td key={i} className="px-3 py-1.5 text-center" style={{ backgroundColor: retColor(v) }}>{v == null ? "" : `${Math.round(v * 100)}`}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>

                  <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <Section title="Biggest early busts" note="Rounds 1–4, projected for 100+ points.">
                      <PickList rows={r.busts} base={base} />
                    </Section>
                    <Section title="Best late-round picks" note="Round 6 or later, most points scored.">
                      <PickList rows={r.steals} base={base} />
                    </Section>
                  </div>
                </>
              )}

              <Section title={`Draft board · ${r.board.year}`} note={r.hasProjections ? "Shaded by return against projection." : undefined}>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {r.years.map((y) => (
                    <FilterChip key={y} href={`${base}/draft?year=${y}`} active={y === r.board.year}>{y}</FilterChip>
                  ))}
                </div>
                <div className="overflow-x-auto border border-white/8 rounded-lg">
                  <table className="text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="px-2 py-2 w-10 text-slate-600 font-medium">Rd</th>
                        {r.board.order.map((o) => (
                          <th key={o.teamId} className="px-2 py-2 font-medium text-left min-w-32">{o.memberName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.board.rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-white/5">
                          <td className="px-2 py-1.5 text-center text-slate-600 tabular-nums">{ri + 1}</td>
                          {row.map((p, ci) => (
                            <td key={ci} className="px-2 py-1.5 align-top" style={{ backgroundColor: p ? retColor(p.ret) : undefined }}>
                              {p && (
                                <Link href={`${base}/players/${p.playerId}`} className="block hover:text-white" title={p.ret != null ? `${p.actual?.toFixed(0)} of ${p.projected?.toFixed(0)} projected` : undefined}>
                                  <span className="text-slate-200">{p.name}</span>
                                  <span className="block text-[10px] text-slate-500 tabular-nums">
                                    {p.position} · #{p.overall}{p.ret != null ? ` · ${Math.round(p.ret * 100)}%` : ""}
                                  </span>
                                </Link>
                              )}
                            </td>
                          ))}
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

function PickList({ rows, base }: { rows: DraftPickRow[]; base: string }) {
  if (!rows.length) return <Empty>Nothing yet.</Empty>;
  return (
    <ul className="border border-white/8 rounded-lg divide-y divide-white/5">
      {rows.map((p) => (
        <li key={`${p.year}-${p.overall}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 text-sm">
          <span className="min-w-0">
            <Link href={`${base}/players/${p.playerId}`} className="hover:text-emerald-400">{p.name}</Link>{" "}
            <span className="text-xs text-slate-600">{p.position}</span>
            <span className="block text-xs text-slate-500 truncate">
              {p.memberName} · {p.year} · Round {p.round}, #{p.overall}
            </span>
          </span>
          <span className="text-right tabular-nums">
            {p.actual?.toFixed(0)} <span className="text-slate-600">/ {p.projected?.toFixed(0)}</span>
            <span className={`block text-xs ${p.ret! >= 1 ? "text-emerald-400" : "text-red-400"}`}>{Math.round(p.ret! * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
