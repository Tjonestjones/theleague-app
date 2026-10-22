import { prisma } from "./db";
import {
  computeLeagueMilestones,
  computeNflMilestones,
  type LeagueTotals,
  type Milestone,
  type SeasonLine,
} from "./milestone-rules";

// ============================================
// MILESTONES — NFL career (nflverse stats) and
// in-league (weekly rosters + transactions)
// ============================================

/** Latest NFL season we have stats for (the season in progress, in-season). */
async function currentNflSeason(): Promise<number | null> {
  const r = await prisma.playerSeasonStat.aggregate({ _max: { season: true } });
  return r._max.season;
}

interface LeagueRow {
  playerId: string;
  starterPoints: number;
  starts: number;
  weeks: number;
  latestYear: number;
  latestPoints: number;
  latestStarts: number;
  pointsRank: number;
  startsRank: number;
}

/**
 * Starter points, starts and weeks rostered per player in a league.
 * Rosters are de-duplicated to one per team per week (latest import wins),
 * since re-running an import saves a second copy.
 */
async function leagueRosterTotals(leagueId: string, playerIds?: string[]): Promise<Map<string, LeagueRow>> {
  const rows = await prisma.$queryRaw<
    { playerId: string; starterPoints: number; starts: bigint; weeks: bigint; latestYear: number; latestPoints: number; latestStarts: bigint; pointsRank: bigint; startsRank: bigint }[]
  >`
    WITH r AS (
      SELECT DISTINCT ON (ro."teamId", ro."weekNumber") ro.id, ro."weekNumber", s.year
      FROM rosters ro
      JOIN teams t ON t.id = ro."teamId"
      JOIN seasons s ON s.id = t."seasonId"
      WHERE s."leagueId" = ${leagueId} AND ro."weekNumber" IS NOT NULL
      ORDER BY ro."teamId", ro."weekNumber", ro."createdAt" DESC
    ),
    latest AS (SELECT MAX(year) AS year FROM r),
    totals AS (
      SELECT rs."playerId",
        COALESCE(SUM(rs.points) FILTER (WHERE rs."isStarter"), 0)::float AS "starterPoints",
        COUNT(*) FILTER (WHERE rs."isStarter") AS starts,
        COUNT(DISTINCT (r.year, r."weekNumber")) AS weeks,
        (SELECT year FROM latest) AS "latestYear",
        COALESCE(SUM(rs.points) FILTER (WHERE rs."isStarter" AND r.year = (SELECT year FROM latest)), 0)::float AS "latestPoints",
        COUNT(*) FILTER (WHERE rs."isStarter" AND r.year = (SELECT year FROM latest)) AS "latestStarts"
      FROM roster_spots rs
      JOIN r ON r.id = rs."rosterId"
      GROUP BY rs."playerId"
    )
    SELECT *,
      RANK() OVER (ORDER BY "starterPoints" DESC) AS "pointsRank",
      RANK() OVER (ORDER BY starts DESC) AS "startsRank"
    FROM totals
  `;
  const map = new Map<string, LeagueRow>();
  const wanted = playerIds ? new Set(playerIds) : null;
  for (const r of rows) {
    if (wanted && !wanted.has(r.playerId)) continue;
    map.set(r.playerId, {
      playerId: r.playerId,
      starterPoints: Math.round(r.starterPoints * 10) / 10,
      starts: Number(r.starts),
      weeks: Number(r.weeks),
      latestYear: r.latestYear,
      latestPoints: r.latestPoints,
      latestStarts: Number(r.latestStarts),
      pointsRank: Number(r.pointsRank),
      startsRank: Number(r.startsRank),
    });
  }
  return map;
}

async function leagueHasRosters(leagueId: string) {
  const n = await prisma.rosterSpot.count({ where: { roster: { team: { season: { leagueId } } } }, take: 1 });
  return n > 0;
}

/** Who holds each player at the end of the league's latest season, from transactions. */
async function currentOwners(leagueId: string) {
  const latest = await prisma.season.findFirst({
    where: { leagueId, transactions: { some: {} } },
    orderBy: { year: "desc" },
    select: { id: true, year: true },
  });
  if (!latest) return { year: null as number | null, owners: new Map<string, { memberId: string; memberName: string }>() };
  const rows = await prisma.$queryRaw<{ playerId: string; memberId: string; displayName: string }[]>`
    SELECT x."playerId", m.id AS "memberId", m."displayName"
    FROM (
      SELECT DISTINCT ON ("playerId") "playerId", "toTeamId"
      FROM transactions WHERE "seasonId" = ${latest.id}
      ORDER BY "playerId", sequence DESC
    ) x
    JOIN teams t ON t.id = x."toTeamId"
    JOIN members m ON m.id = t."memberId"
  `;
  return {
    year: latest.year,
    owners: new Map(rows.map((r) => [r.playerId, { memberId: r.memberId, memberName: r.displayName }])),
  };
}

const seasonSelect = {
  season: true, games: true, passingYards: true, passingTds: true, rushingYards: true, rushingTds: true,
  receptions: true, receivingYards: true, receivingTds: true, fgMade: true, team: true,
} as const;

export interface PlayerMilestones {
  nfl: Milestone[];
  nflSeason: number | null;
  nflSeasons: number;
  league: Milestone[];
  leagueHasRosters: boolean;
  ranks: { points: number | null; starts: number | null };
  topManager: { name: string; points: number } | null;
}

export async function getPlayerMilestones(leagueId: string, playerId: string, position: string): Promise<PlayerMilestones> {
  const [seasons, nflSeason, hasRosters, owners, moves] = await Promise.all([
    prisma.playerSeasonStat.findMany({ where: { playerId }, select: seasonSelect, orderBy: { season: "asc" } }),
    currentNflSeason(),
    leagueHasRosters(leagueId),
    currentOwners(leagueId),
    prisma.transaction.findMany({
      where: { playerId, season: { leagueId } },
      select: { type: true, fromTeam: { select: { memberId: true } }, toTeam: { select: { memberId: true } } },
    }),
  ]);

  const nfl = nflSeason ? computeNflMilestones(position, seasons as SeasonLine[], nflSeason) : [];

  let roster: LeagueRow | undefined;
  let topManager: PlayerMilestones["topManager"] = null;
  const managers = new Set<string>();
  for (const m of moves) {
    if (m.fromTeam) managers.add(m.fromTeam.memberId);
    if (m.toTeam) managers.add(m.toTeam.memberId);
  }
  if (hasRosters) {
    roster = (await leagueRosterTotals(leagueId, [playerId])).get(playerId);
    const byManager = await prisma.$queryRaw<{ memberId: string; displayName: string; points: number }[]>`
      WITH r AS (
        SELECT DISTINCT ON (ro."teamId", ro."weekNumber") ro.id, ro."teamId"
        FROM rosters ro JOIN teams t ON t.id = ro."teamId" JOIN seasons s ON s.id = t."seasonId"
        WHERE s."leagueId" = ${leagueId} AND ro."weekNumber" IS NOT NULL
        ORDER BY ro."teamId", ro."weekNumber", ro."createdAt" DESC
      )
      SELECT m.id AS "memberId", m."displayName", SUM(rs.points)::float AS points
      FROM roster_spots rs JOIN r ON r.id = rs."rosterId"
      JOIN teams t ON t.id = r."teamId" JOIN members m ON m.id = t."memberId"
      WHERE rs."playerId" = ${playerId} AND rs."isStarter"
      GROUP BY m.id, m."displayName"
      ORDER BY points DESC
    `;
    for (const b of byManager) managers.add(b.memberId);
    if (byManager[0]?.points) topManager = { name: byManager[0].displayName, points: Math.round(byManager[0].points * 10) / 10 };
  }

  // "Close" in the league only means something while the league's latest
  // imported season is the NFL season in progress
  const inProgress = nflSeason !== null && owners.year === nflSeason;
  const totals: LeagueTotals = {
    starterPoints: hasRosters ? roster?.starterPoints ?? 0 : null,
    starts: hasRosters ? roster?.starts ?? 0 : null,
    weeksRostered: hasRosters ? roster?.weeks ?? 0 : null,
    currentSeasonPointsPerStart:
      roster && roster.latestYear === nflSeason && roster.latestStarts ? roster.latestPoints / roster.latestStarts : null,
    rosteredNow: inProgress && owners.owners.has(playerId),
    managers: managers.size,
    drafted: moves.filter((m) => m.type === "DRAFT").length,
    moves: moves.length,
  };

  return {
    nfl,
    nflSeason,
    nflSeasons: seasons.filter((s) => s.games > 0).length,
    league: computeLeagueMilestones(totals),
    leagueHasRosters: hasRosters,
    ranks: { points: roster?.pointsRank ?? null, starts: roster?.startsRank ?? null },
    topManager,
  };
}

export interface WatchItem {
  playerId: string;
  playerName: string;
  position: string;
  managerId: string;
  managerName: string;
  scope: "NFL" | "LEAGUE";
  milestone: Milestone;
}

/**
 * Players on the league's current rosters who are close to a milestone, or
 * reached one this season. Sorted closest first.
 */
export async function getMilestoneWatch(leagueId: string) {
  const [{ year, owners }, nflSeason, hasRosters] = await Promise.all([
    currentOwners(leagueId),
    currentNflSeason(),
    leagueHasRosters(leagueId),
  ]);
  if (!owners.size) return { rosterYear: year, nflSeason, items: [] as WatchItem[] };

  const ids = [...owners.keys()];
  const [players, stats, roster] = await Promise.all([
    prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, position: true } }),
    prisma.playerSeasonStat.findMany({ where: { playerId: { in: ids } }, select: { ...seasonSelect, playerId: true } }),
    // League "close" calls only while the league's latest season is in progress
    hasRosters && year === nflSeason ? leagueRosterTotals(leagueId, ids) : Promise.resolve(new Map<string, LeagueRow>()),
  ]);
  const statsBy = new Map<string, SeasonLine[]>();
  for (const s of stats) {
    if (!statsBy.has(s.playerId)) statsBy.set(s.playerId, []);
    statsBy.get(s.playerId)!.push(s);
  }

  const items: WatchItem[] = [];
  for (const p of players) {
    const owner = owners.get(p.id)!;
    const base = { playerId: p.id, playerName: p.name, position: p.position, managerId: owner.memberId, managerName: owner.memberName };
    if (nflSeason) {
      for (const m of computeNflMilestones(p.position, statsBy.get(p.id) ?? [], nflSeason)) {
        if (m.near || m.reachedThisSeason) items.push({ ...base, scope: "NFL", milestone: m });
      }
    }
    const r = roster.get(p.id);
    if (r) {
      const league = computeLeagueMilestones({
        starterPoints: r.starterPoints, starts: r.starts, weeksRostered: r.weeks,
        currentSeasonPointsPerStart: r.latestStarts ? r.latestPoints / r.latestStarts : null,
        rosteredNow: true, managers: 0, drafted: 0, moves: 0,
      });
      for (const m of league) if (m.near) items.push({ ...base, scope: "LEAGUE", milestone: m });
    }
  }
  // Closest first; milestones already reached this season after the near ones
  items.sort((a, b) => {
    const ga = a.milestone.near ? a.milestone.next?.gamesAway ?? 99 : 100;
    const gb = b.milestone.near ? b.milestone.next?.gamesAway ?? 99 : 100;
    return ga - gb || (b.milestone.reached?.threshold ?? 0) - (a.milestone.reached?.threshold ?? 0);
  });
  // One entry per player: his closest milestone
  const seen = new Set<string>();
  const perPlayer = items.filter((it) => (seen.has(it.playerId) ? false : (seen.add(it.playerId), true)));
  return { rosterYear: year, nflSeason, items: perPlayer };
}
