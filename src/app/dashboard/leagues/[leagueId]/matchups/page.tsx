import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getWeekMatchups } from "@/lib/season";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ year?: string; week?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Matchups — TheLeague` : "Matchups — TheLeague" };
}

export default async function MatchupsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const sp = await searchParams;

  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const base = `/dashboard/leagues/${leagueId}`;
  const years = era.years.length ? era.years : era.allYears;
  const year = years.includes(Number(sp.year)) ? Number(sp.year) : years[0];

  const season = year
    ? await prisma.season.findUnique({
        where: { leagueId_year: { leagueId, year } },
        select: {
          playoffStartWeek: true,
          weeks: { where: { matchups: { some: {} } }, select: { weekNumber: true, isPlayoff: true }, orderBy: { weekNumber: "asc" } },
        },
      })
    : null;
  const weeks = season?.weeks ?? [];
  const week = weeks.some((w) => w.weekNumber === Number(sp.week)) ? Number(sp.week) : weeks.at(-1)?.weekNumber;
  const matchups = year && week ? await getWeekMatchups(leagueId, year, week) : [];
  const isPlayoffWeek = (w: { weekNumber: number; isPlayoff: boolean }) =>
    w.isPlayoff || (season?.playoffStartWeek != null && w.weekNumber >= season.playoffStartWeek);

  // Week context: high, low, median
  const scores = matchups.flatMap((m) => [m.homeScore, m.awayScore]).filter((s): s is number => s != null).sort((a, b) => b - a);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          title="Matchups"
          description="Every game, week by week. Open one to see both lineups and what the bench left behind."
        />

        <div className="px-6 md:px-10 py-6 space-y-6 max-w-7xl">
          {/* Season picker */}
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => (
              <Link
                key={y}
                href={`${base}/matchups?year=${y}`}
                className={`px-3 py-1.5 rounded-md text-sm tabular-nums border transition-colors ${
                  y === year ? "bg-white text-black border-white font-medium" : "border-white/10 text-slate-400 hover:text-white hover:border-white/25"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>

          {/* Week picker */}
          <div className="flex flex-wrap gap-1">
            {weeks.map((w) => (
              <Link
                key={w.weekNumber}
                href={`${base}/matchups?year=${year}&week=${w.weekNumber}`}
                className={`min-w-9 text-center px-2 py-1 rounded text-xs tabular-nums transition-colors ${
                  w.weekNumber === week
                    ? "bg-emerald-500 text-black font-semibold"
                    : isPlayoffWeek(w)
                      ? "text-yellow-400/80 hover:bg-white/5"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
                title={isPlayoffWeek(w) ? "Playoffs" : undefined}
              >
                {w.weekNumber}
              </Link>
            ))}
          </div>

          {scores.length > 0 && (
            <p className="text-xs text-slate-500">
              Week {week}{weeks.find((w) => w.weekNumber === week && isPlayoffWeek(w)) ? " · Playoffs" : ""} · high{" "}
              <span className="text-slate-300 tabular-nums">{scores[0].toFixed(2)}</span> · low{" "}
              <span className="text-slate-300 tabular-nums">{scores.at(-1)!.toFixed(2)}</span> · median{" "}
              <span className="text-slate-300 tabular-nums">{scores[Math.floor(scores.length / 2)].toFixed(2)}</span>
            </p>
          )}

          {matchups.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-lg p-10 text-center text-sm text-slate-500">
              No matchups for this week.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {matchups.map((m) => {
                const homeWon = m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore;
                const awayWon = m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore;
                const margin = m.homeScore != null && m.awayScore != null ? Math.abs(m.homeScore - m.awayScore) : null;
                const side = (t: typeof m.homeTeam, s: number | null, won: boolean) => (
                  <div className={`flex items-center justify-between gap-3 ${won ? "text-white" : "text-slate-500"}`}>
                    <div className="min-w-0">
                      <p className={`truncate ${won ? "font-medium" : ""}`}>{t.member.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{t.name}</p>
                    </div>
                    <span className="text-lg tabular-nums">{s?.toFixed(2) ?? "—"}</span>
                  </div>
                );
                return (
                  <Link
                    key={m.id}
                    href={`${base}/matchups/${m.id}`}
                    className="block border border-white/8 rounded-lg px-5 py-4 bg-slate-950 hover:border-white/20 transition-colors"
                  >
                    <div className="space-y-2">
                      {side(m.homeTeam, m.homeScore, homeWon)}
                      {side(m.awayTeam, m.awayScore, awayWon)}
                    </div>
                    {margin != null && (
                      <p className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                        Margin <span className="tabular-nums text-slate-300">{margin.toFixed(2)}</span>
                        {margin < 3 ? " · one-score game" : margin > 40 ? " · blowout" : ""}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}
