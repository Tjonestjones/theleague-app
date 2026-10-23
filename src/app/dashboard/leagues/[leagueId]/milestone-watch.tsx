import Link from "next/link";
import { getMilestoneWatch } from "@/lib/milestones";
import { milestoneSentence } from "./players/[playerId]/milestones";

const MAX_ITEMS = 8;

/** Players on current rosters who are close to a milestone or just reached one. */
export async function MilestoneWatch({ leagueId }: { leagueId: string }) {
  const { items, rosterYear, nflSeason } = await getMilestoneWatch(leagueId);
  if (!items.length) return null;

  const shown = items.slice(0, MAX_ITEMS);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Milestone Watch</h2>
        <span className="text-xs font-bold text-slate-600">
          Players on {rosterYear} rosters{nflSeason ? ` · NFL stats through ${nflSeason}` : ""}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {shown.map((it) => (
          <Link
            key={`${it.playerId}-${it.scope}-${it.milestone.key}`}
            href={`/dashboard/leagues/${leagueId}/players/${it.playerId}`}
            className="group flex items-start gap-4 bg-slate-900 border border-white/8 hover:border-amber-500/30 rounded-2xl px-5 py-4 transition-colors"
          >
            <span
              className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                it.milestone.near
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {it.scope === "NFL" ? "NFL" : "League"}
            </span>
            <div className="min-w-0">
              <p className="font-black text-white group-hover:text-amber-300 transition-colors">
                {it.playerName}
                <span className="ml-1.5 text-xs font-bold text-slate-500">{it.position}</span>
              </p>
              <p className="text-sm font-medium text-slate-400">{milestoneSentence(it.milestone)}</p>
              <p className="text-xs font-bold text-slate-600 mt-0.5">{it.managerName}</p>
            </div>
          </Link>
        ))}
      </div>
      {items.length > MAX_ITEMS && (
        <p className="mt-3 text-xs font-bold text-slate-600">
          {items.length - MAX_ITEMS} more player{items.length - MAX_ITEMS === 1 ? " is" : "s are"} close to a milestone — see their player pages
        </p>
      )}
    </div>
  );
}
