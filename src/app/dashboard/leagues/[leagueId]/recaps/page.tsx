import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getEra } from "@/lib/era";
import { getViewer, completedWeeks } from "@/lib/viewer";
import { getRecap, weeklyFacts, weeklyTemplate, aiEnabled } from "@/lib/recaps";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, FilterChip, Empty } from "@/components/page-chrome";
import { RecapPanel } from "@/components/recap-panel";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ year?: string; week?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Weekly recap — TheLeague` : "Weekly recap — TheLeague" };
}

export default async function WeeklyRecapPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { leagueId } = await params;
  const viewer = await getViewer(leagueId);
  if (!viewer) redirect("/sign-in");
  const sp = await searchParams;
  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const years = era.years.length ? era.years : era.allYears;
  const year = years.includes(Number(sp.year)) ? Number(sp.year) : years[0];
  const weeks = year ? await completedWeeks(leagueId, year) : [];
  const week = weeks.some((w) => w.weekNumber === Number(sp.week)) ? Number(sp.week) : weeks.at(-1)?.weekNumber;
  const base = `/dashboard/leagues/${leagueId}`;

  const [recap, facts, saved] = await Promise.all([
    year && week ? getRecap(leagueId, "WEEKLY", year, week) : null,
    year && week ? weeklyFacts(leagueId, year, week) : null,
    prisma.recap.findMany({
      where: { leagueId, kind: "WEEKLY", year: { in: years } },
      select: { year: true, week: true },
      orderBy: [{ year: "desc" }, { week: "desc" }],
    }),
  ]);
  const savedSet = new Set(saved.map((s) => `${s.year}|${s.week}`));

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader title="Weekly recap" description="A written recap of every week: results, standout games, bench decisions that cost someone, and the standings." />
        <div className="px-6 md:px-10 py-6 space-y-6 max-w-6xl">
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => (
              <FilterChip key={y} href={`${base}/recaps?year=${y}`} active={y === year}>{y}</FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {weeks.map((w) => (
              <Link
                key={w.weekNumber}
                href={`${base}/recaps?year=${year}&week=${w.weekNumber}`}
                className={`relative min-w-9 text-center px-2 py-1 rounded text-xs tabular-nums transition-colors ${
                  w.weekNumber === week ? "bg-emerald-500 text-black font-semibold" : w.isPlayoff ? "text-yellow-400/80 hover:bg-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
                title={savedSet.has(`${year}|${w.weekNumber}`) ? "Recap saved" : undefined}
              >
                {w.weekNumber}
                {savedSet.has(`${year}|${w.weekNumber}`) && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400" />}
              </Link>
            ))}
          </div>

          {!facts || !year || !week ? (
            <Empty>No completed games yet.</Empty>
          ) : (
            <div className="grid lg:grid-cols-[1fr_18rem] gap-8 items-start">
              <Section title={`${year} · Week ${week}${facts.playoffs ? " · Playoffs" : ""}`}>
                <RecapPanel
                  recap={recap}
                  preview={weeklyTemplate(facts)}
                  canWrite={viewer.isCommissioner}
                  aiEnabled={aiEnabled()}
                  target={{ leagueId, kind: "WEEKLY", year, week, memberId: "" }}
                />
              </Section>
              <Section title="Scoreboard">
                <ul className="border border-white/8 rounded-lg divide-y divide-white/5">
                  {facts.results.map((r) => (
                    <li key={r.matchupId}>
                      <Link href={`${base}/matchups/${r.matchupId}`} className="block px-3 py-2 text-sm hover:bg-white/[0.02]">
                        <div className="flex justify-between"><span className="text-white truncate">{r.winner}</span><span className="tabular-nums">{r.winnerScore}</span></div>
                        <div className="flex justify-between text-slate-500"><span className="truncate">{r.loser}</span><span className="tabular-nums">{r.loserScore}</span></div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`${base}/recaps/me?year=${year}&week=${week}`} className="mt-3 inline-block text-xs text-emerald-400 hover:text-emerald-300">
                  Your personal recap for this week →
                </Link>
              </Section>
            </div>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}
