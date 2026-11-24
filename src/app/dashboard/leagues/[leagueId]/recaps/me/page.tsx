import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getEra } from "@/lib/era";
import { getViewer, completedWeeks } from "@/lib/viewer";
import { getRecap, managerWeekFacts, managerWeekTemplate, aiEnabled } from "@/lib/recaps";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, FilterChip, Empty, Stat } from "@/components/page-chrome";
import { RecapPanel } from "@/components/recap-panel";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ year?: string; week?: string; member?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · My recap — TheLeague` : "My recap — TheLeague" };
}

export default async function MyRecapPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { leagueId } = await params;
  const viewer = await getViewer(leagueId);
  if (!viewer) redirect("/sign-in");
  const sp = await searchParams;
  const [league, era, members] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
    prisma.member.findMany({ where: { leagueId, teams: { some: {} } }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
  ]);
  if (!league) notFound();

  const memberId = members.some((m) => m.id === sp.member) ? sp.member! : viewer.memberId && members.some((m) => m.id === viewer.memberId) ? viewer.memberId : members[0]?.id;
  const member = members.find((m) => m.id === memberId);
  const years = era.years.length ? era.years : era.allYears;
  const year = years.includes(Number(sp.year)) ? Number(sp.year) : years[0];
  const weeks = year ? await completedWeeks(leagueId, year) : [];
  const week = weeks.some((w) => w.weekNumber === Number(sp.week)) ? Number(sp.week) : weeks.at(-1)?.weekNumber;
  const base = `/dashboard/leagues/${leagueId}`;
  const q = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ member: memberId, year, week, ...o })) if (v != null) p.set(k, String(v));
    return `${base}/recaps/me?${p}`;
  };

  const [recap, facts] = await Promise.all([
    year && week && memberId ? getRecap(leagueId, "MANAGER_WEEKLY", year, week, memberId) : null,
    year && week && memberId ? managerWeekFacts(leagueId, year, week, memberId) : null,
  ]);
  const isMe = memberId === viewer.memberId;

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          title={isMe ? "My recap" : `${member?.displayName ?? "Manager"}'s recap`}
          description="A week written for one manager: the result, the lineup calls, and what's next."
          actions={
            <form action={`${base}/recaps/me`} className="flex items-center gap-2">
              <input type="hidden" name="year" value={year ?? ""} />
              <input type="hidden" name="week" value={week ?? ""} />
              <select name="member" defaultValue={memberId} className="bg-slate-900 border border-white/10 rounded-md px-2 py-1.5 text-sm">
                {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}{m.id === viewer.memberId ? " (you)" : ""}</option>)}
              </select>
              <button className="btn-secondary">View</button>
            </form>
          }
        />
        <div className="px-6 md:px-10 py-6 space-y-6 max-w-5xl">
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => <FilterChip key={y} href={q({ year: y, week: undefined })} active={y === year}>{y}</FilterChip>)}
          </div>
          <div className="flex flex-wrap gap-1">
            {weeks.map((w) => (
              <Link key={w.weekNumber} href={q({ week: w.weekNumber })} className={`min-w-9 text-center px-2 py-1 rounded text-xs tabular-nums ${w.weekNumber === week ? "bg-emerald-500 text-black font-semibold" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                {w.weekNumber}
              </Link>
            ))}
          </div>

          {!facts || !year || !week || !memberId ? (
            <Empty>{member ? `${member.displayName} didn't play this week.` : "No managers yet."}</Empty>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
                <Stat label="Result" value={`${facts.score}–${facts.oppScore}`} detail={`${facts.result === "won" ? "Beat" : facts.result === "lost" ? "Lost to" : "Tied"} ${facts.opponent}`} />
                <Stat label="Week rank" value={`${facts.weekRank} of ${facts.teams}`} />
                <Stat label="Best possible" value={facts.bestPossible != null ? String(facts.bestPossible) : "—"} detail={facts.lineupSwaps.length ? `${facts.lineupSwaps.length} better call${facts.lineupSwaps.length > 1 ? "s" : ""}` : "Perfect lineup"} />
                <Stat label="Record" value={facts.record} detail={`${facts.standing} of ${facts.of}`} />
              </div>
              <Section title={`${member?.displayName} · ${year} Week ${week}`}>
                <RecapPanel
                  recap={recap}
                  preview={managerWeekTemplate(facts)}
                  canWrite={viewer.isCommissioner || isMe}
                  aiEnabled={aiEnabled()}
                  target={{ leagueId, kind: "MANAGER_WEEKLY", year, week, memberId }}
                />
              </Section>
            </>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}
