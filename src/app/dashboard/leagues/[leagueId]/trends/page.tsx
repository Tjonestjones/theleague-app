import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getTrends, type TrendItem } from "@/lib/trends";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Empty, FilterChip } from "@/components/page-chrome";
import { MilestoneWatch } from "../milestone-watch";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ tag?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Trends — TheLeague` : "Trends — TheLeague" };
}

const TAG_STYLE: Record<TrendItem["tag"], string> = {
  Streak: "text-blue-300 border-blue-500/30",
  Heater: "text-orange-300 border-orange-500/30",
  Slump: "text-slate-300 border-white/15",
  Record: "text-yellow-300 border-yellow-500/30",
  Luck: "text-emerald-300 border-emerald-500/30",
  Rivalry: "text-red-300 border-red-500/30",
  Trajectory: "text-violet-300 border-violet-500/30",
  League: "text-cyan-300 border-cyan-500/30",
};

export default async function TrendsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const sp = await searchParams;
  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const { items, ppgBySeason } = await getTrends(leagueId, era.scope);
  const tags = [...new Set(items.map((i) => i.tag))];
  const shown = sp.tag ? items.filter((i) => i.tag === sp.tag) : items;
  const base = `/dashboard/leagues/${leagueId}`;
  const maxPpg = Math.max(1, ...ppgBySeason.map((p) => p.ppg));
  const minPpg = Math.min(...ppgBySeason.map((p) => p.ppg));

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={era.isAll ? "All seasons" : era.label}
          title="Trends"
          description="Streaks, heaters, slumps, records and runs worth knowing about, most notable first. Current-form items use the latest season in the era."
        />
        <div className="px-6 md:px-10 py-6 max-w-6xl grid lg:grid-cols-[1fr_18rem] gap-8 items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <FilterChip href={`${base}/trends`} active={!sp.tag}>All {items.length}</FilterChip>
              {tags.map((t) => (
                <FilterChip key={t} href={`${base}/trends?tag=${t}`} active={sp.tag === t}>
                  {t} {items.filter((i) => i.tag === t).length}
                </FilterChip>
              ))}
            </div>
            {shown.length === 0 ? (
              <Empty>Nothing notable in this era yet.</Empty>
            ) : (
              <ul className="border border-white/8 rounded-lg divide-y divide-white/5">
                {shown.map((i) => {
                  const body = (
                    <div className="flex gap-4 px-5 py-3.5">
                      <span className={`self-start mt-0.5 shrink-0 w-20 text-center text-[10px] font-semibold uppercase tracking-wider border rounded px-1.5 py-0.5 ${TAG_STYLE[i.tag]}`}>{i.tag}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-white">{i.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{i.detail}</p>
                      </div>
                    </div>
                  );
                  return <li key={i.id}>{i.href ? <Link href={i.href} className="block hover:bg-white/[0.02]">{body}</Link> : body}</li>;
                })}
              </ul>
            )}
          </div>

          <div className="space-y-8">
            {ppgBySeason.length > 1 && (
              <Section title="League scoring" note="Points per team per week, regular season.">
                <div className="border border-white/8 rounded-lg p-4 space-y-1.5">
                  {ppgBySeason.map((p) => (
                    <div key={p.year} className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-2 text-xs">
                      <span className="text-slate-500 tabular-nums">{p.year}</span>
                      <div className="h-3 bg-white/[0.03] rounded-sm overflow-hidden">
                        <div className="h-full bg-cyan-500/70" style={{ width: `${8 + ((p.ppg - minPpg) / Math.max(1, maxPpg - minPpg)) * 92}%` }} />
                      </div>
                      <span className="text-right tabular-nums text-slate-300">{p.ppg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
        <div className="px-6 md:px-10 pb-10 max-w-6xl">
          <MilestoneWatch leagueId={leagueId} />
        </div>
      </div>
    </SubscriptionGate>
  );
}
