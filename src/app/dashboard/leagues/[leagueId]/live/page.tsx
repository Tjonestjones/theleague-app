import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { prisma } from "@/lib/db";
import { getViewer } from "@/lib/viewer";
import { getSeasonDetail, getWeekMatchups, signed } from "@/lib/season";
import { loadTeamWeeks } from "@/lib/luck";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Stat, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Live — TheLeague` : "Live — TheLeague" };
}

function currentNflSeason(now = new Date()) {
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

function ago(d: Date | null) {
  if (!d) return "never";
  const h = (Date.now() - d.getTime()) / 36e5;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`;
  if (h < 48) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export default async function LivePage({ params }: { params: Params }) {
  const { leagueId } = await params;
  const viewer = await getViewer(leagueId);
  if (!viewer) redirect("/sign-in");
  const year = currentNflSeason();
  const [league, season] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    prisma.season.findUnique({
      where: { leagueId_year: { leagueId, year } },
      select: {
        id: true, lastSyncedAt: true, platformId: true, playoffStartWeek: true,
        weeks: { select: { weekNumber: true, isPlayoff: true, matchups: { select: { status: true } } }, orderBy: { weekNumber: "asc" } },
      },
    }),
  ]);
  if (!league) notFound();
  const base = `/dashboard/leagues/${leagueId}`;
  const importHref = `/dashboard/leagues/import-espn?leagueId=${leagueId}&year=${year}${season?.platformId ? `&espnLeagueId=${season.platformId}` : ""}`;

  if (!season) {
    return (
      <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
        <div className="min-h-screen text-white">
          <PageHeader title={`Live ${year}`} description="Standings, this week's games and form for the season in progress." />
          <div className="px-6 md:px-10 py-8 max-w-4xl">
            <Empty>
              The {year} season hasn&apos;t been imported yet.{" "}
              {viewer.isCommissioner && <Link href={importHref} className="text-emerald-400 hover:text-emerald-300">Import it from ESPN →</Link>}
            </Empty>
          </div>
        </div>
      </SubscriptionGate>
    );
  }

  const weeks = season.weeks.filter((w) => w.matchups.length);
  const completed = weeks.filter((w) => w.matchups.every((m) => m.status === "COMPLETED"));
  const current = weeks.find((w) => w.matchups.some((m) => m.status !== "COMPLETED")) ?? weeks.at(-1);
  const lastDone = completed.at(-1)?.weekNumber ?? null;

  const [detail, games, tw] = await Promise.all([
    getSeasonDetail(leagueId, year),
    current ? getWeekMatchups(leagueId, year, current.weekNumber) : [],
    loadTeamWeeks(leagueId, { years: [year] }),
  ]);
  if (!detail) notFound();

  const teams = detail.teams;
  const leader = teams[0];
  const cutoff = Math.round(teams.length * 0.6);
  const gb = (t: (typeof teams)[number]) => ((leader.wins - t.wins) + (t.losses - leader.losses)) / 2;

  // Power rankings: all-play win % over the last four completed weeks
  const recentWeeks = completed.slice(-4).map((w) => w.weekNumber);
  const power = teams
    .map((t) => {
      const g = tw.filter((x) => x.memberId === t.memberId && recentWeeks.includes(x.week));
      const ap = g.reduce((s, x) => s + (x.n - x.rank), 0);
      const tot = g.reduce((s, x) => s + (x.n - 1), 0);
      const ppg = g.length ? g.reduce((s, x) => s + x.score, 0) / g.length : 0;
      return { t, pct: tot ? ap / tot : 0, ppg };
    })
    .sort((a, b) => b.pct - a.pct || b.ppg - a.ppg);
  const prevRank = new Map(teams.map((t) => [t.memberId, t.seed]));

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={`Last synced ${ago(season.lastSyncedAt)}`}
          title={`Live ${year}${current ? ` · Week ${current.weekNumber}` : ""}`}
          description="Standings, this week's games and form for the season in progress."
          actions={
            viewer.isCommissioner ? (
              <Link href={importHref} className="btn-secondary"><RefreshCw className="w-3.5 h-3.5" /> Refresh from ESPN</Link>
            ) : undefined
          }
        />
        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded-lg overflow-hidden">
            <Stat label="Leader" value={leader ? `${leader.wins}-${leader.losses}` : "—"} detail={leader?.memberName} />
            <Stat label="Best team by all-play" value={(() => { const b = [...teams].sort((a, b) => b.allPlayWins - a.allPlayWins)[0]; return b ? `${b.allPlayWins}-${b.allPlayLosses}` : "—"; })()} detail={[...teams].sort((a, b) => b.allPlayWins - a.allPlayWins)[0]?.memberName} />
            <Stat label="Hottest (last 4)" value={power[0] ? `${Math.round(power[0].pct * 100)}%` : "—"} detail={power[0] ? `${power[0].t.memberName} · ${power[0].ppg.toFixed(1)} ppg` : undefined} />
            <Stat label="Weeks played" value={String(completed.filter((w) => !(w.isPlayoff || (season.playoffStartWeek != null && w.weekNumber >= season.playoffStartWeek))).length)} detail={season.playoffStartWeek ? `Playoffs start week ${season.playoffStartWeek}` : undefined} />
          </div>

          {/* This week */}
          <Section title={current ? `Week ${current.weekNumber}` : "This week"} note={current && current.matchups.some((m) => m.status !== "COMPLETED") ? "Scores update when the commissioner refreshes from ESPN." : "Final"}>
            {games.length === 0 ? (
              <Empty>No games scheduled.</Empty>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {games.map((m) => {
                  const done = m.status === "COMPLETED";
                  const side = (t: typeof m.homeTeam, s: number | null, o: number | null) => {
                    const won = done && s != null && o != null && s > o;
                    const row = teams.find((x) => x.teamId === t.id);
                    return (
                      <div className={`flex items-center justify-between ${done && !won ? "text-slate-500" : "text-white"}`}>
                        <span className="truncate">
                          {t.member.displayName}
                          {row && <span className="ml-1.5 text-xs text-slate-500 tabular-nums">{row.wins}-{row.losses}</span>}
                        </span>
                        <span className="tabular-nums">{s != null ? s.toFixed(2) : "—"}</span>
                      </div>
                    );
                  };
                  return (
                    <Link key={m.id} href={`${base}/matchups/${m.id}`} className="block border border-white/8 rounded-lg px-4 py-3 bg-slate-950 hover:border-white/20 space-y-1.5 text-sm">
                      {side(m.homeTeam, m.homeScore, m.awayScore)}
                      {side(m.awayTeam, m.awayScore, m.homeScore)}
                      <p className="text-[11px] text-slate-500 pt-1">{done ? "Final" : m.status === "IN_PROGRESS" ? "In progress" : "Scheduled"}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>

          <div className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start">
            <Section title="Standings" note={`Dashed line: approximate playoff cut (top ${cutoff}). GB = games behind the leader.`}>
              <div className="overflow-x-auto border border-white/8 rounded-lg">
                <table className="w-full text-sm tabular-nums">
                  <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Manager</th>
                      <th className="px-3 py-2.5 text-center font-semibold">W-L</th>
                      <th className="px-3 py-2.5 text-right font-semibold">GB</th>
                      <th className="px-3 py-2.5 text-right font-semibold">PF</th>
                      <th className="px-3 py-2.5 text-center font-semibold">All-play</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Luck</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t, i) => (
                      <tr key={t.teamId} className={`border-t ${i === cutoff ? "border-dashed border-white/30" : "border-white/5"}`}>
                        <td className="px-3 py-2 text-slate-500">{t.seed}</td>
                        <td className="px-3 py-2">
                          <Link href={`${base}/members/${t.memberId}`} className="hover:text-emerald-400">{t.memberName}</Link>
                          <span className="block text-xs text-slate-500">{t.teamName}</span>
                        </td>
                        <td className="px-3 py-2 text-center">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ""}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{i === 0 ? "—" : gb(t).toFixed(gb(t) % 1 ? 1 : 0)}</td>
                        <td className="px-3 py-2 text-right">{t.pointsFor.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center text-slate-300">{t.allPlayWins}-{t.allPlayLosses}</td>
                        <td className={`px-3 py-2 text-right ${t.luck >= 0.5 ? "text-emerald-400" : t.luck <= -0.5 ? "text-red-400" : "text-slate-400"}`}>{signed(t.luck, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Power rankings" note={recentWeeks.length ? `All-play win % over weeks ${recentWeeks[0]}–${recentWeeks.at(-1)}.` : undefined}>
              <ol className="border border-white/8 rounded-lg divide-y divide-white/5">
                {power.map((p, i) => {
                  const move = (prevRank.get(p.t.memberId) ?? i + 1) - (i + 1);
                  return (
                    <li key={p.t.memberId} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-5 text-slate-500 tabular-nums">{i + 1}</span>
                      <span className="flex-1 truncate">{p.t.memberName}</span>
                      <span className="tabular-nums text-slate-300 w-10 text-right">{Math.round(p.pct * 100)}%</span>
                      <span className={`w-14 text-right text-xs tabular-nums ${move > 0 ? "text-emerald-400" : move < 0 ? "text-red-400" : "text-slate-600"}`}>
                        {move === 0 ? "=" : `${move > 0 ? "▲" : "▼"} ${Math.abs(move)}`}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2 text-xs text-slate-500">Arrows compare power rank with place in the standings.</p>
              {lastDone && (
                <div className="mt-4 flex flex-col gap-1.5 text-sm">
                  <Link href={`${base}/recaps?year=${year}&week=${lastDone}`} className="text-emerald-400 hover:text-emerald-300">Week {lastDone} recap →</Link>
                  <Link href={`${base}/recaps/me?year=${year}&week=${lastDone}`} className="text-emerald-400 hover:text-emerald-300">Your week {lastDone} →</Link>
                  <Link href={`${base}/seasons/${year}`} className="text-slate-400 hover:text-slate-200">Full {year} season page →</Link>
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </SubscriptionGate>
  );
}
