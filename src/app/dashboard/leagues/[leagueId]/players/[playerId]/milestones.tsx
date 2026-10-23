import type { Milestone } from "@/lib/milestone-rules";
import { formatThreshold as f, ordinal, SEASON_MILESTONES } from "@/lib/milestone-rules";
import type { PlayerMilestones } from "@/lib/milestones";

const SEASON_KEYS = new Set(SEASON_MILESTONES.map((d) => d.key));
const perSeason = (key: string) => SEASON_MILESTONES.find((d) => d.key === key)!;
const unitFor = (m: Milestone) => (m.key === "starterPoints" ? "points" : m.key === "starts" ? "starts" : m.key === "weeksRostered" ? "weeks" : "");

// "receiving TDs" -> "receiving TD", "rushing yards" -> "rushing yard"
const singular = (label: string) => label.replace(/s$/, "");

/** One-line summary, used by the Milestone Watch. */
export function milestoneSentence(m: Milestone): string {
  const games = (n: number | null | undefined, word = "game") => (n ? ` (~${n} ${word}${n === 1 ? "" : "s"})` : "");
  if (SEASON_KEYS.has(m.key)) {
    const d = perSeason(m.key);
    if (m.reachedThisSeason) return `Reached ${d.perLabel} for the ${ordinal(m.value)} time`;
    return `${f(m.next!.remaining)} from ${d.perLabel}, which would be his ${ordinal(m.next!.threshold)} time${games(m.next!.gamesAway)}`;
  }
  if (m.near && m.next) {
    const word = m.key === "starterPoints" ? "start" : m.key === "starts" ? "start" : m.key === "weeksRostered" ? "week" : "game";
    const n = Math.ceil(m.next.remaining);
    const unit = m.key === "starterPoints" ? (n === 1 ? "point" : "points") : n === 1 ? singular(m.label) : m.label;
    return `${f(n)} ${unit} from ${f(m.next.threshold)}${m.key === "starterPoints" ? " fantasy points" : ""}${games(m.next.gamesAway, word)}`;
  }
  return `Passed ${f(m.reached!.threshold)} ${m.label} this season`;
}

function Row({ m }: { m: Milestone }) {
  const isSeason = SEASON_KEYS.has(m.key);
  const value = m.key === "starterPoints" ? f(Math.round(m.value)) : f(m.value);
  const headline = isSeason ? (
    <>
      <span className="text-white">{m.value}</span> {m.label}
    </>
  ) : m.key === "managers" ? (
    <>
      <span className="text-white">{value}</span> managers have rostered him
    </>
  ) : (
    <>
      <span className="text-white">{value}</span> {m.label}
    </>
  );

  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 px-5 py-3.5">
      <p className="text-sm font-bold text-slate-400">{headline}</p>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {m.reachedThisSeason && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-400">
            This season
          </span>
        )}
        {m.near && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-400">
            Close
          </span>
        )}
        {m.reached && !isSeason && (
          <span className="text-xs font-bold text-slate-500">
            ✓ {f(m.reached.threshold)}
            {m.reached.season ? ` in ${m.reached.season}` : ""}
          </span>
        )}
        {m.next && (
          <span className={`text-xs font-bold ${m.near ? "text-amber-300" : "text-slate-500"}`}>
            {isSeason ? (
              <>
                {f(m.next.remaining)} to go this season
                {m.next.gamesAway ? ` · ~${m.next.gamesAway} games` : ""}
              </>
            ) : (
              <>
                Next {f(m.next.threshold)}: {f(Math.ceil(m.next.remaining))}
                {unitFor(m) ? ` ${unitFor(m)}` : ""} away
                {m.next.gamesAway ? ` · ~${m.next.gamesAway} ${m.key === "starterPoints" || m.key === "starts" ? "starts" : m.key === "weeksRostered" ? "weeks" : "games"}` : ""}
              </>
            )}
          </span>
        )}
      </div>
    </li>
  );
}

export function MilestonesPanel({ data, leagueName }: { data: PlayerMilestones; leagueName: string }) {
  const { nfl, league } = data;
  return (
    <section className="grid lg:grid-cols-2 gap-6">
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">NFL career milestones</h2>
          <span className="text-[11px] font-bold text-slate-600">
            Regular season{data.nflSeason ? ` · through ${data.nflSeason}` : ""}
          </span>
        </div>
        {nfl.length ? (
          <ul className="rounded-2xl border border-white/8 bg-slate-900 divide-y divide-white/5">
            {nfl.map((m) => <Row key={m.key} m={m} />)}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/8 px-5 py-6 text-sm font-medium text-slate-600">
            {data.nflSeasons ? "No career milestones yet." : "No NFL stats synced for this player."}
          </p>
        )}
        <p className="mt-2 text-[11px] font-medium text-slate-600">Stats from nflverse play-by-play; can differ from official totals by a few yards.</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">In {leagueName}</h2>
          {data.ranks.points && (
            <span className="text-[11px] font-bold text-slate-600">
              {ordinal(data.ranks.points)} in league history for starter points
            </span>
          )}
        </div>
        {league.length ? (
          <ul className="rounded-2xl border border-white/8 bg-slate-900 divide-y divide-white/5">
            {league.map((m) => <Row key={m.key} m={m} />)}
            {data.topManager && (
              <li className="px-5 py-3.5 text-xs font-bold text-slate-500">
                Most for one manager: <span className="text-slate-300">{data.topManager.name}</span>, {f(Math.round(data.topManager.points))} points as a starter
              </li>
            )}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/8 px-5 py-6 text-sm font-medium text-slate-600">No league milestones yet.</p>
        )}
        {!data.leagueHasRosters && (
          <p className="mt-2 text-[11px] font-medium text-slate-600">
            Points, starts and weeks rostered appear once weekly rosters are imported for this league.
          </p>
        )}
      </div>
    </section>
  );
}
