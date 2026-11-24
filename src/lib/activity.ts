import { prisma } from "./db";
import type { EraScope } from "./records";
import { groupTrades, type Trade } from "./transactions";

// ─────────────────────────────────────────────────────────────────────────────
// Roster-spot index: who had each player each week, and what he scored.
// Every phase-2 page values moves by what players did *after* the move, so
// this is loaded once per request and queried in memory.
// ─────────────────────────────────────────────────────────────────────────────

const BENCH = new Set(["BE", "BN", "BENCH", "IR"]);

interface SpotRow {
  week: number;
  teamId: string;
  points: number;
  started: boolean;
}

export interface SpotIndex {
  /** `${seasonId}|${playerId}` → weekly rows (one per team that rostered him that week) */
  byPlayer: Map<string, SpotRow[]>;
  teamMember: Map<string, { memberId: string; memberName: string; teamName: string; year: number; seasonId: string }>;
}

export async function loadSpotIndex(leagueId: string, scope: EraScope = {}): Promise<SpotIndex> {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const [spots, teams] = await Promise.all([
    prisma.rosterSpot.findMany({
      where: { roster: { weekNumber: { not: null }, team: { season: seasonWhere } } },
      select: {
        playerId: true,
        position: true,
        isStarter: true,
        points: true,
        roster: { select: { weekNumber: true, teamId: true, team: { select: { seasonId: true } } } },
      },
    }),
    prisma.team.findMany({
      where: { season: seasonWhere },
      select: { id: true, name: true, seasonId: true, season: { select: { year: true } }, member: { select: { id: true, displayName: true } } },
    }),
  ]);

  const byPlayer = new Map<string, SpotRow[]>();
  for (const s of spots) {
    const key = `${s.roster.team.seasonId}|${s.playerId}`;
    let arr = byPlayer.get(key);
    if (!arr) byPlayer.set(key, (arr = []));
    arr.push({
      week: s.roster.weekNumber!,
      teamId: s.roster.teamId,
      points: s.points ?? 0,
      started: s.isStarter && !BENCH.has(s.position),
    });
  }
  const teamMember = new Map(
    teams.map((t) => [t.id, { memberId: t.member.id, memberName: t.member.displayName, teamName: t.name, year: t.season.year, seasonId: t.seasonId }]),
  );
  return { byPlayer, teamMember };
}

/** Points a player scored for a team (or for anyone except a team) from a week on. */
function pointsAfter(
  idx: SpotIndex,
  seasonId: string,
  playerId: string,
  fromWeek: number,
  opts: { teamId?: string; excludeTeamId?: string },
) {
  const rows = idx.byPlayer.get(`${seasonId}|${playerId}`) ?? [];
  let started = 0, total = 0, weeks = 0, starts = 0;
  const teams = new Set<string>();
  for (const r of rows) {
    if (r.week < fromWeek) continue;
    if (opts.teamId && r.teamId !== opts.teamId) continue;
    if (opts.excludeTeamId && r.teamId === opts.excludeTeamId) continue;
    total += r.points;
    weeks++;
    teams.add(r.teamId);
    if (r.started) { started += r.points; starts++; }
  }
  return { started, total, weeks, starts, teams };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade ledger
// ─────────────────────────────────────────────────────────────────────────────

export interface LedgerPlayer {
  playerId: string;
  name: string;
  position: string;
  startedPts: number;
  starts: number;
  weeksKept: number;
}
export interface LedgerSide {
  teamId: string;
  memberId: string;
  memberName: string;
  teamName: string;
  players: LedgerPlayer[];
  startedPts: number;
}
export interface LedgerTrade extends Omit<Trade, "sides"> {
  seasonId: string;
  sides: LedgerSide[];
  winnerMemberId: string | null;
  margin: number;
}

export async function getTradeLedger(leagueId: string, scope: EraScope = {}, idx?: SpotIndex) {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const rows = await prisma.transaction.findMany({
    where: { type: "TRADE", status: "COMPLETED", season: seasonWhere },
    include: {
      season: { select: { year: true } },
      player: { select: { id: true, name: true, position: true } },
      fromTeam: { select: { id: true, name: true, member: { select: { id: true, displayName: true } } } },
      toTeam: { select: { id: true, name: true, member: { select: { id: true, displayName: true } } } },
    },
    orderBy: [{ season: { year: "desc" } }, { sequence: "desc" }],
  });
  const index = idx ?? (await loadSpotIndex(leagueId, scope));
  const seasonByYear = new Map(rows.map((r) => [r.season.year, r.seasonId]));

  const trades: LedgerTrade[] = groupTrades(rows).map((t) => {
    const seasonId = seasonByYear.get(t.year) ?? "";
    const fromWeek = Math.max(1, t.week ?? 1);
    const sides: LedgerSide[] = t.sides.map((s) => {
      const players = s.receives.map((p) => {
        const a = pointsAfter(index, seasonId, p.playerId, fromWeek, { teamId: s.teamId });
        return { playerId: p.playerId, name: p.name, position: p.position, startedPts: a.started, starts: a.starts, weeksKept: a.weeks };
      });
      return {
        teamId: s.teamId, memberId: s.memberId, memberName: s.memberName, teamName: s.teamName,
        players: players.sort((a, b) => b.startedPts - a.startedPts),
        startedPts: players.reduce((sum, p) => sum + p.startedPts, 0),
      };
    });
    const sorted = [...sides].sort((a, b) => b.startedPts - a.startedPts);
    const margin = sorted.length > 1 ? sorted[0].startedPts - sorted[1].startedPts : 0;
    return {
      ...t,
      seasonId,
      sides,
      winnerMemberId: sorted.length > 1 && margin >= 1 ? sorted[0].memberId : null,
      margin,
    };
  });

  // Per-manager trade record
  const managers = new Map<string, { memberId: string; memberName: string; trades: number; won: number; lost: number; net: number }>();
  for (const t of trades) {
    for (const s of t.sides) {
      let m = managers.get(s.memberId);
      if (!m) managers.set(s.memberId, (m = { memberId: s.memberId, memberName: s.memberName, trades: 0, won: 0, lost: 0, net: 0 }));
      m.trades++;
      const others = t.sides.filter((o) => o.teamId !== s.teamId).reduce((sum, o) => sum + o.startedPts, 0);
      m.net += s.startedPts - others;
      if (t.winnerMemberId === s.memberId) m.won++;
      else if (t.winnerMemberId) m.lost++;
    }
  }

  // Trade partners
  const pairs = new Map<string, { a: string; b: string; count: number }>();
  for (const t of trades) {
    if (t.sides.length < 2) continue;
    const names = t.sides.map((s) => s.memberName).sort();
    const k = names.join("|");
    const p = pairs.get(k) ?? { a: names[0], b: names[1], count: 0 };
    p.count++;
    pairs.set(k, p);
  }

  return {
    trades,
    managers: [...managers.values()].sort((a, b) => b.net - a.net),
    partners: [...pairs.values()].sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Waivers & drops
// ─────────────────────────────────────────────────────────────────────────────

export interface Pickup {
  playerId: string;
  name: string;
  position: string;
  memberId: string;
  memberName: string;
  year: number;
  week: number;
  type: "WAIVER" | "ADD";
  startedPts: number;
  starts: number;
}
export interface CostlyDrop {
  playerId: string;
  name: string;
  position: string;
  memberId: string;
  memberName: string;
  year: number;
  week: number;
  elsewherePts: number;
  elsewhereStarts: number;
  pickedUpBy: string[];
  cameBack: boolean;
}

export async function getWaiverReport(leagueId: string, scope: EraScope = {}, idx?: SpotIndex) {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const [moves, index] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: { in: ["WAIVER", "ADD", "DROP"] }, status: "COMPLETED", season: seasonWhere },
      select: {
        type: true, weekNumber: true, seasonId: true, fromTeamId: true, toTeamId: true,
        season: { select: { year: true } },
        player: { select: { id: true, name: true, position: true } },
      },
    }),
    idx ? Promise.resolve(idx) : loadSpotIndex(leagueId, scope),
  ]);

  const member = (teamId: string | null) => (teamId ? index.teamMember.get(teamId) : undefined);

  // Activity per manager
  const mgr = new Map<string, { memberId: string; memberName: string; claims: number; adds: number; drops: number; seasons: Set<number>; pickupPts: number }>();
  const touch = (teamId: string | null) => {
    const m = member(teamId);
    if (!m) return null;
    let r = mgr.get(m.memberId);
    if (!r) mgr.set(m.memberId, (r = { memberId: m.memberId, memberName: m.memberName, claims: 0, adds: 0, drops: 0, seasons: new Set(), pickupPts: 0 }));
    r.seasons.add(m.year);
    return r;
  };

  // Activity by week across the era
  const byWeek = new Map<number, number>();

  const pickups: Pickup[] = [];
  const drops: CostlyDrop[] = [];

  for (const mv of moves) {
    const week = mv.weekNumber ?? 0;
    if (mv.type === "DROP") {
      const r = touch(mv.fromTeamId);
      if (r) r.drops++;
      const m = member(mv.fromTeamId);
      if (!m || !mv.fromTeamId) continue;
      const after = pointsAfter(index, mv.seasonId, mv.player.id, Math.max(1, week), { excludeTeamId: mv.fromTeamId });
      const backRows = (index.byPlayer.get(`${mv.seasonId}|${mv.player.id}`) ?? []).filter((x) => x.week > week && x.teamId === mv.fromTeamId);
      drops.push({
        playerId: mv.player.id, name: mv.player.name, position: mv.player.position,
        memberId: m.memberId, memberName: m.memberName, year: mv.season.year, week,
        elsewherePts: after.started, elsewhereStarts: after.starts,
        pickedUpBy: [...after.teams].map((t) => index.teamMember.get(t)?.memberName ?? "").filter(Boolean),
        cameBack: backRows.length > 0,
      });
    } else {
      const r = touch(mv.toTeamId);
      if (!r || !mv.toTeamId) continue;
      if (mv.type === "WAIVER") r.claims++; else r.adds++;
      if (week > 0) byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
      const m = member(mv.toTeamId)!;
      const after = pointsAfter(index, mv.seasonId, mv.player.id, Math.max(1, week), { teamId: mv.toTeamId });
      r.pickupPts += after.started;
      pickups.push({
        playerId: mv.player.id, name: mv.player.name, position: mv.player.position,
        memberId: m.memberId, memberName: m.memberName, year: mv.season.year, week,
        type: mv.type as "WAIVER" | "ADD", startedPts: after.started, starts: after.starts,
      });
    }
  }

  // Drops that came back to bite, per manager
  const dropTotals = new Map<string, { memberId: string; memberName: string; pts: number; count: number }>();
  for (const d of drops) {
    if (d.elsewherePts < 30) continue;
    const t = dropTotals.get(d.memberId) ?? { memberId: d.memberId, memberName: d.memberName, pts: 0, count: 0 };
    t.pts += d.elsewherePts;
    t.count++;
    dropTotals.set(d.memberId, t);
  }

  const managers = [...mgr.values()]
    .map((m) => ({ ...m, seasons: m.seasons.size, perSeason: (m.claims + m.adds) / Math.max(1, m.seasons.size) }))
    .sort((a, b) => b.claims + b.adds - (a.claims + a.adds));

  return {
    managers,
    byWeek: [...byWeek.entries()].sort((a, b) => a[0] - b[0]),
    bestPickups: pickups.sort((a, b) => b.startedPts - a.startedPts).slice(0, 15),
    costlyDrops: drops.sort((a, b) => b.elsewherePts - a.elsewherePts).slice(0, 15),
    dropTotals: [...dropTotals.values()].sort((a, b) => b.pts - a.pts),
    totals: {
      claims: managers.reduce((s, m) => s + m.claims, 0),
      adds: managers.reduce((s, m) => s + m.adds, 0),
      drops: managers.reduce((s, m) => s + m.drops, 0),
      seasons: new Set(moves.map((m) => m.season.year)).size,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Player directory
// ─────────────────────────────────────────────────────────────────────────────

export interface DirectoryPlayer {
  playerId: string;
  name: string;
  position: string;
  nflTeam: string | null;
  weeksRostered: number;
  starts: number;
  startedPts: number;
  managers: number;
  seasons: number;
  timesDrafted: number;
  lastManager: string | null;
  lastYear: number | null;
}

export async function getPlayerDirectory(leagueId: string, scope: EraScope = {}) {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const [idx, players, drafts] = await Promise.all([
    loadSpotIndex(leagueId, scope),
    prisma.player.findMany({
      where: { rosterSpots: { some: { roster: { team: { season: seasonWhere } } } } },
      select: { id: true, name: true, position: true, team: true },
    }),
    prisma.transaction.groupBy({
      by: ["playerId"],
      where: { type: "DRAFT", season: seasonWhere },
      _count: { _all: true },
    }),
  ]);
  const drafted = new Map(drafts.map((d) => [d.playerId, d._count._all]));
  const agg = new Map<string, Omit<DirectoryPlayer, "name" | "position" | "nflTeam" | "timesDrafted"> & { mgrs: Set<string>; yrs: Set<number>; lastKey: number }>();

  for (const [key, rows] of idx.byPlayer) {
    const playerId = key.split("|")[1];
    let a = agg.get(playerId);
    if (!a) agg.set(playerId, (a = { playerId, weeksRostered: 0, starts: 0, startedPts: 0, managers: 0, seasons: 0, lastManager: null, lastYear: null, mgrs: new Set(), yrs: new Set(), lastKey: -1 }));
    for (const r of rows) {
      const tm = idx.teamMember.get(r.teamId);
      if (!tm) continue;
      a.weeksRostered++;
      if (r.started) { a.starts++; a.startedPts += r.points; }
      a.mgrs.add(tm.memberId);
      a.yrs.add(tm.year);
      const k = tm.year * 100 + r.week;
      if (k > a.lastKey) { a.lastKey = k; a.lastManager = tm.memberName; a.lastYear = tm.year; }
    }
  }

  return players
    .map((p) => {
      const a = agg.get(p.id);
      return {
        playerId: p.id, name: p.name, position: p.position, nflTeam: p.team,
        weeksRostered: a?.weeksRostered ?? 0, starts: a?.starts ?? 0, startedPts: a?.startedPts ?? 0,
        managers: a?.mgrs.size ?? 0, seasons: a?.yrs.size ?? 0, timesDrafted: drafted.get(p.id) ?? 0,
        lastManager: a?.lastManager ?? null, lastYear: a?.lastYear ?? null,
      } satisfies DirectoryPlayer;
    })
    .sort((a, b) => b.startedPts - a.startedPts);
}
