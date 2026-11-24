import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getMatchupDetail, type MatchupSide } from "@/lib/season";
import { SubscriptionGate } from "@/components/subscription-gate";
import { Section } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string; matchupId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Matchup — TheLeague` : "Matchup — TheLeague" };
}

export default async function MatchupPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId, matchupId } = await params;

  const [league, m] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getMatchupDetail(leagueId, matchupId),
  ]);
  if (!league || !m) notFound();

  const base = `/dashboard/leagues/${leagueId}`;
  const decided = m.home.score != null && m.away.score != null;
  const homeWon = decided && m.home.score! > m.away.score!;
  const awayWon = decided && m.away.score! > m.home.score!;
  const margin = decided ? Math.abs(m.home.score! - m.away.score!) : null;
  const { homeWins, awayWins, ties } = m.h2hBefore;

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        {/* Scoreboard */}
        <header className="border-b border-white/8 px-6 md:px-10 pt-8 pb-7">
          <div className="max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Link href={`${base}/seasons/${m.year}`} className="hover:text-slate-300">{m.year}</Link>
                <span>·</span>
                <Link href={`${base}/matchups?year=${m.year}&week=${m.week}`} className="hover:text-slate-300">Week {m.week}</Link>
                {m.isPlayoff && <span className="ml-1 px-1.5 py-0.5 rounded border border-yellow-500/30 text-yellow-400">Playoffs</span>}
              </div>
              <div className="flex items-center gap-2">
                {m.prevId && <Link href={`${base}/matchups/${m.prevId}`} className="btn-secondary">← Week {m.week - 1}</Link>}
                {m.nextId && <Link href={`${base}/matchups/${m.nextId}`} className="btn-secondary">Week {m.week + 1} →</Link>}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
              <TeamHeading side={m.home} won={homeWon} base={base} align="left" />
              <div className="text-center">
                <p className="text-xs text-slate-500">{margin != null ? `by ${margin.toFixed(2)}` : m.status.toLowerCase()}</p>
              </div>
              <TeamHeading side={m.away} won={awayWon} base={base} align="right" />
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Head-to-head before this game:{" "}
              <span className="text-slate-300 tabular-nums">
                {m.home.memberName} {homeWins}–{awayWins}{ties ? `–${ties}` : ""} {m.away.memberName}
              </span>
            </p>
          </div>
        </header>

        <div className="px-6 md:px-10 py-8 space-y-10 max-w-6xl">
          {/* Lineups */}
          <div className="grid lg:grid-cols-2 gap-8">
            <Lineup side={m.home} />
            <Lineup side={m.away} />
          </div>

          {/* Previous meetings */}
          {m.meetings.length > 0 && (
            <Section title="Other meetings" note="Most recent first">
              <div className="border border-white/8 rounded-lg divide-y divide-white/5">
                {m.meetings.map((g) => {
                  const hw = g.hs != null && g.as != null && g.hs > g.as;
                  return (
                    <Link key={g.id} href={`${base}/matchups/${g.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/[0.02]">
                      <span className="text-slate-500 tabular-nums w-28">{g.year} · Wk {g.week}</span>
                      <span className="flex-1 text-slate-300">
                        {hw ? m.home.memberName : m.away.memberName} won
                      </span>
                      <span className="tabular-nums text-slate-400">
                        {g.hs?.toFixed(2)} – {g.as?.toFixed(2)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}

function TeamHeading({ side, won, base, align }: { side: MatchupSide; won: boolean; base: string; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <Link href={`${base}/members/${side.memberId}`} className={`text-lg font-semibold hover:text-emerald-400 transition-colors ${won ? "text-white" : "text-slate-400"}`}>
        {side.memberName}
      </Link>
      <p className="text-xs text-slate-500">{side.teamName}</p>
      <p className={`mt-2 text-4xl md:text-5xl font-semibold tabular-nums tracking-tight ${won ? "text-white" : "text-slate-500"}`}>
        {side.score?.toFixed(2) ?? "—"}
      </p>
    </div>
  );
}

function Lineup({ side }: { side: MatchupSide }) {
  const eff = side.optimal && side.score != null ? (side.score / side.optimal) * 100 : null;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">{side.memberName}</h2>
        {side.optimal != null && (
          <p className="text-xs text-slate-500">
            Best possible <span className="text-slate-300 tabular-nums">{side.optimal.toFixed(2)}</span>
            {eff != null && <> · <span className="tabular-nums text-slate-300">{eff.toFixed(1)}%</span> efficient</>}
          </p>
        )}
      </div>

      {side.starters.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-lg p-6 text-sm text-slate-500">No lineup data for this week.</div>
      ) : (
        <div className="border border-white/8 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/5">
              {side.starters.map((p) => <PlayerRow key={p.playerId} p={p} />)}
              <tr className="bg-white/[0.02]">
                <td colSpan={3} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Bench · {side.benchPoints.toFixed(2)} pts
                </td>
              </tr>
              {side.bench.map((p) => <PlayerRow key={p.playerId} p={p} muted />)}
            </tbody>
          </table>
        </div>
      )}

      {side.optimalMoves.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Lineup that would have scored most:{" "}
          {side.optimalMoves.map((mv, i) => (
            <span key={i}>
              {i > 0 && "; "}
              start <span className="text-slate-300">{mv.in.name}</span> ({mv.in.points.toFixed(1)}) over{" "}
              <span className="text-slate-300">{mv.out.name}</span> ({mv.out.points.toFixed(1)})
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

function PlayerRow({ p, muted = false }: { p: MatchupSide["starters"][number]; muted?: boolean }) {
  return (
    <tr className={muted ? "text-slate-500" : ""}>
      <td className="px-3 py-2 w-14 text-xs text-slate-500">{p.slot}</td>
      <td className="px-3 py-2">
        <span className={muted ? "" : "text-white"}>{p.name}</span>
        <span className="ml-2 text-xs text-slate-600">{p.position}{p.nflTeam ? ` · ${p.nflTeam}` : ""}</span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{p.points.toFixed(2)}</td>
    </tr>
  );
}
