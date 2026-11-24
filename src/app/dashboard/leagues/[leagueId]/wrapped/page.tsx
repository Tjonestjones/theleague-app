import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getEra } from "@/lib/era";
import { getViewer } from "@/lib/viewer";
import { getRecap, wrappedFacts, wrappedTemplate, aiEnabled, type WrappedFacts } from "@/lib/recaps";
import { ordinal } from "@/lib/season";
import { SubscriptionGate } from "@/components/subscription-gate";
import { FilterChip, Empty } from "@/components/page-chrome";
import { RecapPanel } from "@/components/recap-panel";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ year?: string; member?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Season Wrapped — TheLeague` : "Season Wrapped — TheLeague" };
}

const nth = (n: number) => `${n}${ordinal(n)}`;

export default async function WrappedPage({ params, searchParams }: { params: Params; searchParams: Search }) {
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
  const members = year
    ? await prisma.member.findMany({ where: { leagueId, teams: { some: { season: { year } } } }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } })
    : [];
  const memberId = members.some((m) => m.id === sp.member) ? sp.member! : members.some((m) => m.id === viewer.memberId) ? viewer.memberId! : members[0]?.id;
  const base = `/dashboard/leagues/${leagueId}`;

  const [f, recap] = await Promise.all([
    year && memberId ? wrappedFacts(leagueId, year, memberId) : null,
    year && memberId ? getRecap(leagueId, "SEASON_WRAPPED", year, 0, memberId) : null,
  ]);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <div className="px-6 md:px-10 pt-8 pb-4 max-w-6xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">Season Wrapped</p>
            <form action={`${base}/wrapped`} className="flex items-center gap-2">
              <input type="hidden" name="year" value={year ?? ""} />
              <select name="member" defaultValue={memberId} className="bg-slate-900 border border-white/10 rounded-md px-2 py-1.5 text-sm">
                {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}{m.id === viewer.memberId ? " (you)" : ""}</option>)}
              </select>
              <button className="btn-secondary">View</button>
            </form>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {years.map((y) => <FilterChip key={y} href={`${base}/wrapped?year=${y}&member=${memberId ?? ""}`} active={y === year}>{y}</FilterChip>)}
          </div>
        </div>

        {!f || !year || !memberId ? (
          <div className="px-6 md:px-10 max-w-6xl"><Empty>No season to wrap yet.</Empty></div>
        ) : (
          <div className="px-6 md:px-10 pb-12 max-w-6xl space-y-4">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-lg border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-slate-950 to-slate-950 px-8 py-10">
              <p className="text-sm text-emerald-300/80">{f.year} · {f.team}</p>
              <h1 className="mt-1 text-4xl md:text-6xl font-semibold tracking-tight">{f.manager}</h1>
              <div className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
                <Big label="Record" value={f.record} />
                <Big label="Seed" value={nth(f.seed)} sub={`of ${f.teams}`} />
                <Big label="Finish" value={f.finish} />
              </div>
            </section>

            <RecapPanel
              recap={recap}
              preview={wrappedTemplate(f)}
              canWrite={viewer.isCommissioner || viewer.memberId === memberId}
              aiEnabled={aiEnabled()}
              target={{ leagueId, kind: "SEASON_WRAPPED", year, week: 0, memberId }}
            />

            <div className="grid md:grid-cols-3 gap-4">
              <Card tone="blue" label="Points scored" value={f.pointsFor.toFixed(1)} line={`${nth(f.pointsForRank)} in the league`} />
              <Card tone="violet" label="All-play" value={f.allPlay} line={`${nth(f.allPlayRank)}-best team on paper`} />
              <Card tone={f.luck >= 0 ? "emerald" : "red"} label="Luck" value={`${f.luck >= 0 ? "+" : ""}${f.luck}`} line={`wins vs ${f.expectedWins} expected · ${nth(f.luckRank)} luckiest`} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {f.bestWeek && (
                <Card tone="emerald" label="Best week" value={f.bestWeek.score.toFixed(1)} line={`Week ${f.bestWeek.week} vs ${f.bestWeek.opponent} · ${f.bestWeek.result === "W" ? "won" : f.bestWeek.result === "L" ? "lost anyway" : "tied"}${f.bestWeek.weekRank === 1 ? " · top score that week" : ""}`} />
              )}
              {f.worstWeek && (
                <Card tone="red" label="Worst week" value={f.worstWeek.score.toFixed(1)} line={`Week ${f.worstWeek.week} vs ${f.worstWeek.opponent} · ${f.worstWeek.result === "W" ? "won anyway" : "lost"}`} />
              )}
            </div>

            <section className="rounded-lg border border-white/8 bg-slate-950 px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Your top players</p>
              <ol className="space-y-2">
                {f.topPlayers.map((p, i) => (
                  <li key={p.player} className="flex items-baseline gap-4">
                    <span className="w-6 text-2xl font-semibold text-slate-600 tabular-nums">{i + 1}</span>
                    <span className="flex-1 text-lg">{p.player} <span className="text-sm text-slate-500">{p.position}</span></span>
                    <span className="tabular-nums text-lg">{p.points.toFixed(1)}</span>
                    <span className="w-20 text-right text-xs text-slate-500">{p.starts} starts</span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="grid md:grid-cols-3 gap-4">
              <Card tone="amber" label="Lineup efficiency" value={f.lineupEfficiency != null ? `${f.lineupEfficiency}%` : "—"} line={`${nth(f.lineupEfficiencyRank)} in the league · ${f.perfectWeeks} perfect week${f.perfectWeeks === 1 ? "" : "s"}`} />
              <Card tone="slate" label="Left on the bench" value={f.pointsLeftOnBench.toFixed(1)} line="points a perfect lineup would have added" />
              <Card tone="slate" label="Games within 5" value={f.closeGames} line="record in close games" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card tone="emerald" label="Favorite opponent" value={f.favoriteOpponent?.name ?? "—"} line={f.favoriteOpponent ? `${f.favoriteOpponent.w}-${f.favoriteOpponent.l} against them` : ""} small />
              <Card tone="red" label="Nemesis" value={f.nemesis?.name ?? "—"} line={f.nemesis ? `${f.nemesis.w}-${f.nemesis.l} against them` : ""} small />
            </div>

            <Moves f={f} />
          </div>
        )}
      </div>
    </SubscriptionGate>
  );
}

const TONES = {
  emerald: "border-emerald-500/25 from-emerald-500/10",
  red: "border-red-500/25 from-red-500/10",
  blue: "border-blue-500/25 from-blue-500/10",
  violet: "border-violet-500/25 from-violet-500/10",
  amber: "border-amber-500/25 from-amber-500/10",
  slate: "border-white/10 from-white/[0.03]",
};

function Card({ tone, label, value, line, small = false }: { tone: keyof typeof TONES; label: string; value: string; line: string; small?: boolean }) {
  return (
    <section className={`rounded-lg border bg-gradient-to-br to-slate-950 px-6 py-5 ${TONES[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 font-semibold tracking-tight tabular-nums ${small ? "text-2xl" : "text-4xl"}`}>{value}</p>
      {line && <p className="mt-1 text-sm text-slate-400">{line}</p>}
    </section>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-3xl md:text-4xl font-semibold tabular-nums">
        {value} {sub && <span className="text-base font-normal text-slate-500">{sub}</span>}
      </p>
    </div>
  );
}

function Moves({ f }: { f: WrappedFacts }) {
  return (
    <section className="rounded-lg border border-white/8 bg-slate-950 px-6 py-5 grid md:grid-cols-3 gap-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Best pickup</p>
        {f.bestPickup ? (
          <>
            <p className="mt-1 text-lg">{f.bestPickup.player}</p>
            <p className="text-sm text-slate-400">Week {f.bestPickup.week} · {f.bestPickup.pointsAfter.toFixed(1)} starter points</p>
          </>
        ) : <p className="mt-1 text-sm text-slate-500">None of note</p>}
        <p className="mt-2 text-xs text-slate-500">{f.pickups} pickups all season</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">The one that got away</p>
        {f.worstDrop ? (
          <>
            <p className="mt-1 text-lg">{f.worstDrop.player}</p>
            <p className="text-sm text-slate-400">Dropped week {f.worstDrop.week} · {f.worstDrop.pointsElsewhere.toFixed(1)} for {f.worstDrop.to || "others"}</p>
          </>
        ) : <p className="mt-1 text-sm text-slate-500">No regrettable drops</p>}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Trades</p>
        {f.trades.length ? (
          <ul className="mt-1 space-y-2">
            {f.trades.map((t, i) => (
              <li key={i} className="text-sm">
                <span className="text-slate-300">Week {t.week} with {t.partner}:</span> got {t.got.join(", ") || "nothing on record"}
                <span className={`ml-1 tabular-nums ${t.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>({t.net >= 0 ? "+" : ""}{t.net})</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-sm text-slate-500">Didn&apos;t make one</p>}
      </div>
    </section>
  );
}
