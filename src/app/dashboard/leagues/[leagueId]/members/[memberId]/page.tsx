import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMemberCareerStats } from "@/lib/records";
import Link from "next/link";
import { MemberCharts } from "./member-charts";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string; memberId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId, memberId } = await params;

  const [league, member, latestTeam] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    prisma.member.findUnique({ where: { id: memberId }, select: { displayName: true } }),
    prisma.team.findFirst({
      where: { memberId, season: { leagueId } },
      orderBy: { season: { year: "desc" } },
      include: {
        season: { select: { year: true } },
        rosters: {
          orderBy: { weekNumber: "desc" },
          take: 1,
          include: {
            spots: {
              include: { player: true },
              orderBy: [{ isStarter: "desc" }, { position: "asc" }],
            },
          },
        },
      },
    }),
  ]);

  if (!league || !member) return <div>Not found</div>;

  const stats = await getMemberCareerStats(leagueId, memberId);
  const roster = latestTeam?.rosters[0];

  // Split roster into starters and bench
  const starters = roster?.spots.filter((s) => s.isStarter) ?? [];
  const bench = roster?.spots.filter((s) => !s.isStarter) ?? [];

  // Win % for bar
  const totalGames = stats.totalWins + stats.totalLosses + stats.totalTies;
  const winPct = totalGames > 0 ? stats.totalWins / totalGames : 0;

  // Best season by PF
  const bestSeason = [...stats.seasons].sort((a, b) => b.pointsFor - a.pointsFor)[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-emerald-700/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 md:px-12 pt-8 pb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}/members`}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-emerald-400 font-bold text-sm transition-colors mb-6"
          >
            ← Back to Members
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* left: name + record */}
            <div className="flex items-start gap-5">
              {/* avatar */}
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl font-black text-emerald-400">
                {member.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                  {member.displayName}
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-1">{league.name}</p>

                {/* W-L record with bar */}
                {totalGames > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 font-black text-lg">{stats.totalWins}W</span>
                      <span className="text-slate-600 font-bold">–</span>
                      <span className="text-red-400 font-black text-lg">{stats.totalLosses}L</span>
                      {stats.totalTies > 0 && (
                        <>
                          <span className="text-slate-600 font-bold">–</span>
                          <span className="text-slate-400 font-black text-lg">{stats.totalTies}T</span>
                        </>
                      )}
                      <span className="ml-1 text-sm font-bold text-slate-500">
                        ({(winPct * 100).toFixed(1)}%)
                      </span>
                    </div>
                    {/* win rate bar */}
                    <div className="w-48 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all"
                        style={{ width: `${winPct * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* right: career highlight pills */}
            <div className="flex flex-wrap gap-2">
              <StatPill label="Avg/Game" value={stats.avgPF.toFixed(1) + " pts"} color="emerald" />
              <StatPill label="Best Week" value={stats.highestWeekScore.toFixed(1)} color="green" />
              {bestSeason && (
                <StatPill label={`Best Season`} value={`${bestSeason.year} (${bestSeason.pointsFor.toFixed(0)} pts)`} color="yellow" />
              )}
              <StatPill label="Seasons" value={String(stats.seasons.length)} color="blue" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 space-y-14">

        {/* ── CURRENT ROSTER ───────────────────────────────────────────── */}
        {(starters.length > 0 || bench.length > 0) ? (
          <section>
            <SectionHeading
              label={`${latestTeam?.season.year} Roster`}
              icon="🏈"
              accent="emerald"
            />

            {/* STARTERS */}
            {starters.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
                    Starters
                  </span>
                  <div className="flex-1 h-px bg-emerald-500/20" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {starters.map((spot) => (
                    <PlayerCard key={spot.id} spot={spot} starter />
                  ))}
                </div>
              </div>
            )}

            {/* BENCH */}
            {bench.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                    Bench
                  </span>
                  <div className="flex-1 h-px bg-slate-700/50" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {bench.map((spot) => (
                    <PlayerCard key={spot.id} spot={spot} starter={false} />
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section>
            <SectionHeading label="Roster" icon="🏈" accent="emerald" />
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700/50 p-14 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-black text-white mb-2">No roster data yet</h3>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Roster lineups will appear here after you import a season from ESPN, Sleeper, Yahoo, or Fleaflicker.
              </p>
            </div>
          </section>
        )}

        {/* ── CAREER STATS GRID ────────────────────────────────────────── */}
        <section>
          <SectionHeading label="Career Stats" icon="📊" accent="yellow" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <BigStat label="Record" value={`${stats.totalWins}-${stats.totalLosses}`} sub={stats.totalTies > 0 ? `${stats.totalTies}T` : undefined} color="emerald" />
            <BigStat label="Win %" value={`${(winPct * 100).toFixed(1)}%`} color="blue" />
            <BigStat label="Points For" value={stats.totalPF.toFixed(0)} color="purple" />
            <BigStat label="Avg / Game" value={stats.avgPF.toFixed(1)} color="cyan" />
            <BigStat label="Best Week" value={stats.highestWeekScore.toFixed(1)} color="green" />
            <BigStat label="Worst Week" value={stats.lowestWeekScore.toFixed(1)} color="red" />
            <BigStat label="Points Against" value={stats.totalPA.toFixed(0)} color="slate" />
            <BigStat label="Seasons" value={String(stats.seasons.length)} color="yellow" />
          </div>
        </section>

        {/* ── CHARTS ───────────────────────────────────────────────────── */}
        <MemberCharts
          weekScores={stats.weekScores}
          seasons={stats.seasons.map((s) => ({
            year: s.year,
            wins: s.wins,
            losses: s.losses,
            pointsFor: s.pointsFor,
          }))}
        />

        {/* ── SEASON BREAKDOWN ─────────────────────────────────────────── */}
        {stats.seasons.length > 0 && (
          <section>
            <SectionHeading label="Season Breakdown" icon="📅" accent="emerald" />
            <div className="rounded-2xl overflow-hidden border border-white/8 bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-slate-950/50">
                    {["Year", "Team", "W-L-T", "PF", "PA", "High", "Low"].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-4 font-black uppercase tracking-wider text-xs text-slate-500 ${h === "Year" || h === "Team" ? "text-left" : "text-right"} ${h === "W-L-T" ? "text-center" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.seasons.map((s) => {
                    const isBest = bestSeason?.year === s.year;
                    return (
                      <tr key={s.year} className={`hover:bg-white/3 transition-colors ${isBest ? "bg-yellow-500/5" : ""}`}>
                        <td className="px-5 py-4 font-black text-white">
                          <span className="flex items-center gap-2">
                            {s.year}
                            {isBest && <span className="text-xs text-yellow-400 font-black">★ Best</span>}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-medium">{s.teamName}</td>
                        <td className="px-5 py-4 text-center font-bold text-white">{s.wins}-{s.losses}{s.ties > 0 ? `-${s.ties}` : ""}</td>
                        <td className="px-5 py-4 text-right font-bold text-white">{s.pointsFor.toFixed(1)}</td>
                        <td className="px-5 py-4 text-right font-medium text-slate-500">{s.pointsAgainst.toFixed(1)}</td>
                        <td className="px-5 py-4 text-right font-black text-green-400">{s.highWeek.toFixed(1)}</td>
                        <td className="px-5 py-4 text-right font-black text-red-400">{s.lowWeek.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── HEAD-TO-HEAD ─────────────────────────────────────────────── */}
        {stats.headToHead.length > 0 && (
          <section>
            <SectionHeading label="Head-to-Head" icon="⚔️" accent="yellow" />
            <div className="rounded-2xl overflow-hidden border border-white/8 bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-slate-950/50">
                    <th className="px-5 py-4 text-left font-black uppercase tracking-wider text-xs text-slate-500">Opponent</th>
                    <th className="px-5 py-4 text-center font-black uppercase tracking-wider text-xs text-slate-500">Record</th>
                    <th className="px-5 py-4 text-center font-black uppercase tracking-wider text-xs text-slate-500">Win %</th>
                    <th className="px-5 py-4 text-right font-black uppercase tracking-wider text-xs text-slate-500">PF</th>
                    <th className="px-5 py-4 text-right font-black uppercase tracking-wider text-xs text-slate-500">PA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.headToHead.map((h) => {
                    const games = h.wins + h.losses + h.ties;
                    const pct = games > 0 ? h.wins / games : 0;
                    const dominant = pct > 0.6 && games >= 3;
                    const struggling = pct < 0.4 && games >= 3;
                    return (
                      <tr key={h.opponentId} className="hover:bg-white/3 transition-colors group">
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/leagues/${leagueId}/members/${h.opponentId}`}
                            className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            {h.opponentName}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-black text-white">
                            {h.wins}
                            <span className="text-slate-600 font-normal mx-1">-</span>
                            {h.losses}
                            {h.ties > 0 && <><span className="text-slate-600 font-normal mx-1">-</span>{h.ties}</>}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`font-black text-sm ${dominant ? "text-green-400" : struggling ? "text-red-400" : "text-slate-400"}`}>
                            {(pct * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-white">{h.totalPointsFor.toFixed(1)}</td>
                        <td className="px-5 py-4 text-right font-medium text-slate-500">{h.totalPointsAgainst.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const POSITION_CONFIG: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  QB:  { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/25", emoji: "🎯" },
  RB:  { bg: "bg-green-500/15",  text: "text-green-300",  border: "border-green-500/25",  emoji: "💨" },
  WR:  { bg: "bg-blue-500/15",   text: "text-blue-300",   border: "border-blue-500/25",   emoji: "⚡" },
  TE:  { bg: "bg-amber-500/15",  text: "text-amber-300",  border: "border-amber-500/25",  emoji: "🎪" },
  K:   { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/25", emoji: "🦵" },
  DEF: { bg: "bg-red-500/15",    text: "text-red-300",    border: "border-red-500/25",    emoji: "🛡️" },
  FLEX:{ bg: "bg-cyan-500/15",   text: "text-cyan-300",   border: "border-cyan-500/25",   emoji: "🔄" },
};
const DEFAULT_POS = { bg: "bg-slate-700/30", text: "text-slate-400", border: "border-slate-600/30", emoji: "👤" };

function PlayerCard({
  spot,
  starter,
}: {
  spot: { id: string; position: string; isStarter: boolean; points: number | null; player: { name: string; position: string; team: string | null } | null };
  starter: boolean;
}) {
  const cfg = POSITION_CONFIG[spot.position] ?? DEFAULT_POS;
  return (
    <div className={`relative rounded-xl p-4 border overflow-hidden transition-all duration-200 ${starter ? `${cfg.bg} ${cfg.border} hover:scale-[1.02]` : "bg-slate-800/40 border-slate-700/30 opacity-60 hover:opacity-80"}`}>
      {/* large position watermark */}
      <div className={`absolute right-2 top-1 text-5xl font-black opacity-10 select-none pointer-events-none ${cfg.text}`}>
        {spot.position}
      </div>

      <div className="relative z-10">
        {/* position badge */}
        <span className={`inline-flex items-center gap-1 text-xs font-black uppercase rounded-full px-2 py-0.5 mb-2 ${starter ? `${cfg.bg} ${cfg.text} border ${cfg.border}` : "bg-slate-700/50 text-slate-500 border border-slate-600/30"}`}>
          {cfg.emoji} {spot.position}
        </span>

        {/* player name */}
        <p className={`font-black text-sm leading-tight mb-1 ${starter ? "text-white" : "text-slate-500"}`}>
          {spot.player?.name ?? "Empty Slot"}
        </p>

        {/* pro team + points */}
        <div className="flex items-center justify-between mt-2">
          {spot.player?.team && (
            <span className="text-xs text-slate-600 font-medium truncate">{spot.player.team}</span>
          )}
          {spot.points != null && spot.points > 0 && (
            <span className={`text-xs font-black ml-auto ${starter ? cfg.text : "text-slate-600"}`}>
              {spot.points.toFixed(1)} pts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  label,
  icon,
  accent,
}: {
  label: string;
  icon: string;
  accent: "emerald" | "yellow" | "blue";
}) {
  const lines = {
    emerald: "from-emerald-500 to-transparent",
    yellow: "from-yellow-500 to-transparent",
    blue: "from-blue-500 to-transparent",
  };
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-xl">{icon}</span>
      <h2 className="text-lg font-black uppercase tracking-wider text-white">{label}</h2>
      <div className={`flex-1 h-px bg-gradient-to-r ${lines[accent]} opacity-40`} />
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/8 border-emerald-500/20",
    blue:    "text-blue-400    bg-blue-500/8    border-blue-500/20",
    purple:  "text-purple-400  bg-purple-500/8  border-purple-500/20",
    cyan:    "text-cyan-400    bg-cyan-500/8    border-cyan-500/20",
    green:   "text-green-400   bg-green-500/8   border-green-500/20",
    red:     "text-red-400     bg-red-500/8     border-red-500/20",
    slate:   "text-slate-400   bg-slate-700/30  border-slate-600/20",
    yellow:  "text-yellow-400  bg-yellow-500/8  border-yellow-500/20",
  };
  const cls = colors[color] ?? colors.slate;
  const [textCls, bgCls, borderCls] = cls.split(" ");
  return (
    <div className={`rounded-2xl border p-5 text-center ${bgCls} ${borderCls}`}>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className={`text-3xl font-black ${textCls}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 font-bold mt-1">{sub}</p>}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    green:   "bg-green-500/10  border-green-500/20  text-green-400",
    yellow:  "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    blue:    "bg-blue-500/10   border-blue-500/20   text-blue-400",
  };
  return (
    <div className={`border rounded-xl px-4 py-2.5 text-center ${colors[color] ?? colors.emerald}`}>
      <p className="text-xs font-bold text-slate-500 mb-0.5">{label}</p>
      <p className="font-black text-sm">{value}</p>
    </div>
  );
}
