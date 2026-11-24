import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getTradeLedger, type LedgerTrade } from "@/lib/activity";
import { signed } from "@/lib/season";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Stat, FilterChip, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ year?: string; manager?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Trades — TheLeague` : "Trades — TheLeague" };
}

export default async function TradesPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const sp = await searchParams;

  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const { trades, managers, partners } = await getTradeLedger(leagueId, era.scope);
  const base = `/dashboard/leagues/${leagueId}`;
  const year = Number(sp.year) || null;
  const shown = trades.filter(
    (t) => (!year || t.year === year) && (!sp.manager || t.sides.some((s) => s.memberId === sp.manager)),
  );
  const years = [...new Set(trades.map((t) => t.year))].sort((a, b) => b - a);
  const lopsided = [...trades].filter((t) => t.sides.length > 1).sort((a, b) => b.margin - a.margin)[0];
  const href = (q: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { year: year ?? undefined, manager: sp.manager, ...q };
    for (const [k, v] of Object.entries(merged)) if (v != null && v !== "") p.set(k, String(v));
    const s = p.toString();
    return `${base}/trades${s ? `?${s}` : ""}`;
  };

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={era.isAll ? "All seasons" : era.label}
          title="Trade ledger"
          description="Every trade, judged by what each side's new players scored in their lineup for the rest of that season."
        />

        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
            <Stat label="Trades" value={String(trades.length)} detail={`${(trades.length / Math.max(1, era.years.length)).toFixed(1)} per season`} />
            <Stat label="Players moved" value={String(trades.reduce((s, t) => s + t.sides.reduce((x, y) => x + y.players.length, 0), 0))} />
            <Stat
              label="Most active partners"
              value={partners[0] ? String(partners[0].count) : "—"}
              detail={partners[0] ? `${partners[0].a} & ${partners[0].b}` : undefined}
            />
            <Stat
              label="Most lopsided"
              value={lopsided ? lopsided.margin.toFixed(1) : "—"}
              detail={lopsided ? `${lopsided.year} · ${lopsided.sides.find((s) => s.memberId === lopsided.winnerMemberId)?.memberName ?? ""} won` : undefined}
            />
          </div>

          <div className="grid lg:grid-cols-[1fr_20rem] gap-10 items-start">
            {/* Ledger */}
            <Section title={`${shown.length} trade${shown.length === 1 ? "" : "s"}`} note="Points are what each player scored as a starter for his new team after the trade.">
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <FilterChip href={href({ year: undefined })} active={!year}>All years</FilterChip>
                {years.map((y) => (
                  <FilterChip key={y} href={href({ year: y })} active={year === y}>{y}</FilterChip>
                ))}
                {sp.manager && (
                  <Link href={href({ manager: undefined })} className="ml-2 text-xs text-emerald-400 hover:text-emerald-300">
                    Clear manager filter
                  </Link>
                )}
              </div>
              {shown.length === 0 ? (
                <Empty>No trades in this range.</Empty>
              ) : (
                <div className="space-y-3">
                  {shown.map((t) => <TradeCard key={`${t.seasonId}-${t.group}`} t={t} base={base} />)}
                </div>
              )}
            </Section>

            {/* Manager table */}
            <Section title="Trade record by manager" note="Won = his side outscored the other side afterward. Net = his points minus theirs.">
              <div className="border border-white/8 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Manager</th>
                      <th className="px-3 py-2 text-center font-semibold">W-L</th>
                      <th className="px-3 py-2 text-right font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {managers.map((m) => (
                      <tr key={m.memberId} className={sp.manager === m.memberId ? "bg-white/[0.04]" : ""}>
                        <td className="px-3 py-2">
                          <Link href={href({ manager: m.memberId })} className="hover:text-emerald-400">{m.memberName}</Link>
                          <span className="ml-1.5 text-xs text-slate-600">{m.trades}</span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-slate-300">{m.won}-{m.lost}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${m.net > 0 ? "text-emerald-400" : m.net < 0 ? "text-red-400" : "text-slate-400"}`}>
                          {signed(m.net, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </SubscriptionGate>
  );
}

function TradeCard({ t, base }: { t: LedgerTrade; base: string }) {
  return (
    <div className="border border-white/8 rounded-lg bg-slate-950">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 text-xs text-slate-500">
        <span className="tabular-nums">
          <Link href={`${base}/seasons/${t.year}`} className="hover:text-slate-300">{t.year}</Link>
          {t.week ? ` · Week ${t.week}` : ""}
        </span>
        {t.winnerMemberId ? (
          <span>
            <span className="text-slate-300">{t.sides.find((s) => s.memberId === t.winnerMemberId)?.memberName}</span> won by{" "}
            <span className="tabular-nums text-slate-300">{t.margin.toFixed(1)}</span>
          </span>
        ) : t.sides.length > 1 ? (
          <span>Even</span>
        ) : (
          <span>One side only on record</span>
        )}
      </div>
      <div className={`grid ${t.sides.length > 1 ? "md:grid-cols-2" : ""} divide-y md:divide-y-0 md:divide-x divide-white/5`}>
        {t.sides.map((s) => {
          const won = t.winnerMemberId === s.memberId;
          return (
            <div key={s.teamId} className="px-4 py-3">
              <div className="flex items-baseline justify-between mb-2">
                <Link href={`${base}/members/${s.memberId}`} className={`text-sm font-medium hover:text-emerald-400 ${won ? "text-white" : "text-slate-300"}`}>
                  {s.memberName} <span className="text-slate-500 font-normal">got</span>
                </Link>
                <span className={`text-sm tabular-nums ${won ? "text-emerald-400" : "text-slate-400"}`}>{s.startedPts.toFixed(1)}</span>
              </div>
              <ul className="space-y-1">
                {s.players.length === 0 && <li className="text-xs text-slate-600">Nothing on record</li>}
                {s.players.map((p) => (
                  <li key={p.playerId} className="flex items-baseline justify-between text-sm">
                    <Link href={`${base}/players/${p.playerId}`} className="text-slate-300 hover:text-white truncate">
                      {p.name} <span className="text-xs text-slate-600">{p.position}</span>
                    </Link>
                    <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap ml-3">
                      {p.startedPts.toFixed(1)} · {p.starts} start{p.starts === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
