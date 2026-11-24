import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getWaiverReport } from "@/lib/activity";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Stat, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Waivers & drops — TheLeague` : "Waivers & drops — TheLeague" };
}

export default async function WaiversPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;

  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const r = await getWaiverReport(leagueId, era.scope);
  const base = `/dashboard/leagues/${leagueId}`;
  const pickupsTotal = r.totals.claims + r.totals.adds;
  const maxWeek = Math.max(1, ...r.byWeek.map(([, n]) => n));
  const maxMgr = Math.max(1, ...r.managers.map((m) => m.claims + m.adds));

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={era.isAll ? "All seasons" : era.label}
          title="Waivers & drops"
          description="Who works the wire, which pickups paid off, and which drops came back to hurt."
        />

        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
            <Stat label="Pickups" value={String(pickupsTotal)} detail={`${(pickupsTotal / Math.max(1, r.totals.seasons)).toFixed(0)} per season`} />
            <Stat label="Waiver claims" value={String(r.totals.claims)} detail={`${r.totals.adds} free-agent adds`} />
            <Stat label="Drops" value={String(r.totals.drops)} />
            <Stat
              label="Most active"
              value={r.managers[0] ? String(r.managers[0].claims + r.managers[0].adds) : "—"}
              detail={r.managers[0]?.memberName}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Section title="Pickups by manager" note="Claims plus free-agent adds. Points are what those pickups scored in his lineup.">
              <div className="border border-white/8 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Manager</th>
                      <th className="px-3 py-2 text-left font-semibold w-1/3">Pickups</th>
                      <th className="px-3 py-2 text-right font-semibold">Per yr</th>
                      <th className="px-3 py-2 text-right font-semibold">Drops</th>
                      <th className="px-3 py-2 text-right font-semibold">Pickup pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {r.managers.map((m) => {
                      const n = m.claims + m.adds;
                      return (
                        <tr key={m.memberId}>
                          <td className="px-3 py-2">
                            <Link href={`${base}/members/${m.memberId}`} className="hover:text-emerald-400">{m.memberName}</Link>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-white/[0.04] rounded-sm overflow-hidden flex">
                                <div className="bg-blue-500/80" style={{ width: `${(m.claims / maxMgr) * 100}%` }} title={`${m.claims} claims`} />
                                <div className="bg-emerald-500/80" style={{ width: `${(m.adds / maxMgr) * 100}%` }} title={`${m.adds} adds`} />
                              </div>
                              <span className="w-8 text-right tabular-nums text-slate-300">{n}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-400">{m.perSeason.toFixed(0)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-400">{m.drops}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{m.pickupPts.toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                <span className="inline-block w-2 h-2 bg-blue-500/80 mr-1" />Waiver claims
                <span className="inline-block w-2 h-2 bg-emerald-500/80 ml-3 mr-1" />Free-agent adds
              </p>
            </Section>

            <Section title="When the wire moves" note="Pickups by week of the season, all seasons in the era combined.">
              {r.byWeek.length === 0 ? (
                <Empty>No pickups yet.</Empty>
              ) : (
                <div className="border border-white/8 rounded-lg p-4">
                  <div className="flex items-end gap-1 h-40">
                    {r.byWeek.map(([w, n]) => (
                      <div key={w} className="flex-1 flex flex-col items-center justify-end h-full" title={`Week ${w}: ${n}`}>
                        <span className="text-[10px] text-slate-500 tabular-nums mb-1">{n}</span>
                        <div className="w-full bg-emerald-500/70 rounded-t-sm" style={{ height: `${(n / maxWeek) * 100}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {r.byWeek.map(([w]) => (
                      <span key={w} className="flex-1 text-center text-[10px] text-slate-600 tabular-nums">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Section title="Best pickups" note="Points scored as a starter for the team that picked him up, rest of that season.">
              <MoveList
                rows={r.bestPickups.map((p) => ({
                  key: `${p.year}-${p.week}-${p.playerId}-${p.memberId}`,
                  playerId: p.playerId,
                  name: p.name,
                  position: p.position,
                  who: p.memberName,
                  memberId: p.memberId,
                  when: `${p.year} · Wk ${p.week} · ${p.type === "WAIVER" ? "claim" : "add"}`,
                  pts: p.startedPts,
                  note: `${p.starts} starts`,
                }))}
                base={base}
              />
            </Section>

            <Section title="Drops that came back to bite" note="Points the player scored as a starter for other teams after being dropped, same season.">
              <MoveList
                rows={r.costlyDrops.map((d) => ({
                  key: `${d.year}-${d.week}-${d.playerId}-${d.memberId}`,
                  playerId: d.playerId,
                  name: d.name,
                  position: d.position,
                  who: d.memberName,
                  memberId: d.memberId,
                  when: `${d.year} · Wk ${d.week} · to ${d.pickedUpBy.join(", ") || "—"}${d.cameBack ? " · came back" : ""}`,
                  pts: d.elsewherePts,
                  note: `${d.elsewhereStarts} starts`,
                }))}
                base={base}
                tone="red"
              />
            </Section>
          </div>

          {r.dropTotals.length > 0 && (
            <Section title="Points given away" note="Total starter points scored elsewhere by players each manager dropped (drops worth 30+ points).">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
                {r.dropTotals.map((d) => (
                  <div key={d.memberId} className="bg-slate-950 px-4 py-3 flex items-baseline justify-between">
                    <Link href={`${base}/members/${d.memberId}`} className="text-sm hover:text-emerald-400">{d.memberName}</Link>
                    <span className="text-sm tabular-nums text-red-400">
                      {d.pts.toFixed(0)} <span className="text-xs text-slate-500">· {d.count} player{d.count === 1 ? "" : "s"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}

function MoveList({
  rows,
  base,
  tone = "green",
}: {
  rows: { key: string; playerId: string; name: string; position: string; who: string; memberId: string; when: string; pts: number; note: string }[];
  base: string;
  tone?: "green" | "red";
}) {
  if (rows.length === 0) return <Empty>Nothing to show yet.</Empty>;
  return (
    <ol className="border border-white/8 rounded-lg divide-y divide-white/5">
      {rows.map((r, i) => (
        <li key={r.key} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-5 text-xs text-slate-600 tabular-nums">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <Link href={`${base}/players/${r.playerId}`} className="text-sm text-white hover:text-emerald-400">
              {r.name} <span className="text-xs text-slate-600">{r.position}</span>
            </Link>
            <p className="text-xs text-slate-500 truncate">
              <Link href={`${base}/members/${r.memberId}`} className="text-slate-400 hover:text-slate-200">{r.who}</Link> · {r.when}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm tabular-nums ${tone === "red" ? "text-red-400" : "text-emerald-400"}`}>{r.pts.toFixed(1)}</p>
            <p className="text-[11px] text-slate-600">{r.note}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
