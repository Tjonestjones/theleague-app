import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSeasonDetail, ordinal, signed, type BracketGame, type SeasonTeamRow } from "@/lib/season";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section } from "@/components/page-chrome";
import { RecapPanel } from "@/components/recap-panel";
import { getRecap, seasonStoryFacts, seasonStoryTemplate, aiEnabled } from "@/lib/recaps";
import { getViewer } from "@/lib/viewer";

type Params = Promise<{ leagueId: string; year: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId, year } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · ${year} season — TheLeague` : "Season — TheLeague" };
}

export default async function SeasonPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId, year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const [league, detail, years] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getSeasonDetail(leagueId, year),
    prisma.season.findMany({ where: { leagueId }, select: { year: true }, orderBy: { year: "asc" } }),
  ]);
  if (!league || !detail) notFound();
  const [story, storyFacts, viewer] = await Promise.all([
    getRecap(leagueId, "SEASON_STORY", year),
    seasonStoryFacts(leagueId, year),
    getViewer(leagueId),
  ]);

  const idx = years.findIndex((s) => s.year === year);
  const prevYear = idx > 0 ? years[idx - 1].year : null;
  const nextYear = idx >= 0 && idx < years.length - 1 ? years[idx + 1].year : null;
  const base = `/dashboard/leagues/${leagueId}`;
  const maxPpg = Math.max(...detail.teams.map((t) => t.ppg), 1);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={`${detail.platform ?? "Imported"} · ${detail.numTeams} teams · ${detail.regularSeasonWeeks.length}-week regular season`}
          title={`${year} Season`}
          actions={
            <div className="flex items-center gap-2">
              {prevYear && (
                <Link href={`${base}/seasons/${prevYear}`} className="btn-secondary">← {prevYear}</Link>
              )}
              {nextYear && (
                <Link href={`${base}/seasons/${nextYear}`} className="btn-secondary">{nextYear} →</Link>
              )}
            </div>
          }
        />

        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          {/* Champion */}
          {detail.champion && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border border-yellow-500/25 bg-yellow-500/[0.04] rounded-lg px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-yellow-500/80">Champion</p>
                  <Link href={`${base}/members/${detail.champion.memberId}`} className="text-xl font-semibold hover:text-yellow-300 transition-colors">
                    {detail.champion.memberName}
                  </Link>
                  <p className="text-sm text-slate-400">{detail.champion.teamName} · {detail.champion.seed}{ordinal(detail.champion.seed)} seed</p>
                </div>
              </div>
              {detail.runnerUp && (
                <div className="text-sm text-slate-400">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Final</p>
                  <p>
                    beat <span className="text-white font-medium">{detail.runnerUp.memberName}</span>{" "}
                    <span className="tabular-nums">{detail.finalScore}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Facts */}
          {detail.facts.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
              {detail.facts.map((f) => {
                const body = (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{f.label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{f.value}</p>
                    <p className="mt-0.5 text-xs text-slate-400 truncate">{f.detail}</p>
                  </>
                );
                return f.href ? (
                  <Link key={f.label} href={f.href} className="bg-slate-950 px-5 py-4 hover:bg-slate-900 transition-colors">{body}</Link>
                ) : (
                  <div key={f.label} className="bg-slate-950 px-5 py-4">{body}</div>
                );
              })}
            </div>
          )}

          {/* Standings */}
          <Section title="Regular-season standings" note="Seeds by record, then points for. All-play counts every team you outscored each week.">
            <div className="overflow-x-auto border border-white/8 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-10">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Team</th>
                    <th className="px-4 py-3 text-center font-semibold">W-L</th>
                    <th className="px-4 py-3 text-right font-semibold">PF</th>
                    <th className="px-4 py-3 text-right font-semibold">PA</th>
                    <th className="px-4 py-3 text-center font-semibold">All-play</th>
                    <th className="px-4 py-3 text-right font-semibold">Exp. W</th>
                    <th className="px-4 py-3 text-right font-semibold">Luck</th>
                    <th className="px-4 py-3 text-left font-semibold">Finish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {detail.teams.map((t) => (
                    <tr key={t.teamId} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{t.seed}</td>
                      <td className="px-4 py-3">
                        <Link href={`${base}/members/${t.memberId}`} className="font-medium hover:text-emerald-400 transition-colors">{t.memberName}</Link>
                        <p className="text-xs text-slate-500">{t.teamName}</p>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ""}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.pointsFor.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-400">{t.pointsAgainst.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-300">{t.allPlayWins}-{t.allPlayLosses}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-300">{t.expectedWins.toFixed(1)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${t.luck >= 0.5 ? "text-emerald-400" : t.luck <= -0.5 ? "text-red-400" : "text-slate-400"}`}>{signed(t.luck, 1)}</td>
                      <td className="px-4 py-3"><FinishTag finish={t.finish} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Playoff bracket */}
          {detail.bracket.length > 0 && (
            <Section title="Playoff bracket">
              <div className="overflow-x-auto">
                <div className="flex gap-6 min-w-max">
                  {detail.bracket.map((round, ri) => (
                    <div key={ri} className="w-64 flex flex-col">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        {round[0]?.round} · Week {round[0]?.week}
                      </p>
                      <div className="flex-1 flex flex-col justify-around gap-4">
                        {round.map((g) => <BracketCard key={g.matchupId} game={g} href={`${base}/matchups/${g.matchupId}`} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Scoring */}
          <div className="grid lg:grid-cols-5 gap-8">
            <Section title="Points per game" className="lg:col-span-2" note={`League average ${detail.leagueAvg.toFixed(1)}`}>
              <div className="space-y-2">
                {[...detail.teams].sort((a, b) => b.ppg - a.ppg).map((t) => (
                  <div key={t.teamId} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
                    <span className="truncate text-slate-300">{t.memberName}</span>
                    <div className="relative h-5 bg-white/[0.03] rounded-sm overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-emerald-500/70" style={{ width: `${(t.ppg / maxPpg) * 100}%` }} />
                      <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${(detail.leagueAvg / maxPpg) * 100}%` }} />
                    </div>
                    <span className="text-right tabular-nums">{t.ppg.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Week by week" className="lg:col-span-3" note="Shaded by that week's rank: darker green is higher.">
              <WeeklyGrid teams={detail.teams} weeks={detail.regularSeasonWeeks} />
            </Section>
          </div>

          {/* Season story */}
          <Section title="Season story">
            <RecapPanel
              recap={story}
              preview={storyFacts ? seasonStoryTemplate(storyFacts) : null}
              canWrite={!!viewer?.isCommissioner}
              aiEnabled={aiEnabled()}
              target={{ leagueId, kind: "SEASON_STORY", year, week: 0, memberId: "" }}
            />
          </Section>
        </div>
      </div>
    </SubscriptionGate>
  );
}

function FinishTag({ finish }: { finish: SeasonTeamRow["finish"] }) {
  const style: Record<SeasonTeamRow["finish"], string> = {
    Champion: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
    "Runner-up": "text-slate-200 border-white/20 bg-white/5",
    Semifinal: "text-slate-300 border-white/10",
    Quarterfinal: "text-slate-400 border-white/10",
    Playoffs: "text-slate-400 border-white/10",
    "Missed playoffs": "text-slate-600 border-transparent",
  };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded border ${style[finish]}`}>{finish}</span>;
}

function BracketCard({ game, href }: { game: BracketGame; href: string }) {
  const row = (s: BracketGame["home"]) => {
    const won = game.winnerTeamId === s.teamId;
    return (
      <div className={`flex items-center gap-3 px-3 py-2 ${won ? "text-white" : "text-slate-500"}`}>
        <span className="w-5 text-xs tabular-nums text-slate-600">{s.seed}</span>
        <span className={`flex-1 truncate text-sm ${won ? "font-medium" : ""}`}>{s.memberName}</span>
        <span className="text-sm tabular-nums">{s.score?.toFixed(2) ?? "—"}</span>
      </div>
    );
  };
  return (
    <Link href={href} className="block border border-white/10 rounded-md divide-y divide-white/5 bg-slate-950 hover:border-white/25 transition-colors">
      {row(game.home)}
      {row(game.away)}
    </Link>
  );
}

function WeeklyGrid({ teams, weeks }: { teams: SeasonTeamRow[]; weeks: number[] }) {
  // Rank each week's scores so shading compares teams within the week.
  const rankByWeek = weeks.map((_, wi) => {
    const scores = teams.map((t) => t.weekly[wi]).filter((s): s is number => s != null).sort((a, b) => b - a);
    return (s: number | null) => (s == null ? null : scores.indexOf(s) / Math.max(scores.length - 1, 1));
  });
  return (
    <div className="overflow-x-auto border border-white/8 rounded-lg">
      <table className="w-full text-xs tabular-nums">
        <thead className="text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-slate-950">Team</th>
            {weeks.map((w) => <th key={w} className="px-1.5 py-2 font-medium text-center">{w}</th>)}
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.teamId} className="border-t border-white/5">
              <td className="px-3 py-1.5 text-slate-300 whitespace-nowrap sticky left-0 bg-slate-950">{t.memberName}</td>
              {t.weekly.map((s, wi) => {
                const r = rankByWeek[wi](s);
                const alpha = r == null ? 0 : 0.55 * (1 - r) + 0.04;
                return (
                  <td key={wi} className="px-1.5 py-1.5 text-center" style={{ backgroundColor: `rgba(16,185,129,${alpha.toFixed(3)})` }}>
                    {s == null ? "" : Math.round(s)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
