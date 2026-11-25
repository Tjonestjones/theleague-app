// Record book engine: turns a league's games, lineups and transactions into
// ranked tables for every page in catalog.ts. Pure functions, no database
// access, so it can be unit-tested (tests/record-book.test.mts).

import type { RecordDef, RecordNeed } from "./catalog.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────────

export interface BookMember { id: string; name: string }
export interface BookTeam { id: string; memberId: string; year: number; name: string }
export interface BookSeason { year: number; numTeams: number }

export interface BookGame {
  year: number;
  week: number;
  isPlayoff: boolean;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface BookSpot {
  playerId: string;
  playerName: string;
  /** Natural position: QB, RB, WR, TE, K, D/ST ... */
  position: string;
  /** Lineup slot: QB, RB/WR/TE, BN, IR ... */
  slot: string;
  isStarter: boolean;
  points: number;
}

export interface BookLineup { teamId: string; year: number; week: number; spots: BookSpot[] }

export interface BookMove {
  year: number;
  week: number | null;
  sequence: number;
  type: "DRAFT" | "ADD" | "WAIVER" | "DROP" | "TRADE";
  playerId: string;
  playerName: string;
  playerPosition: string;
  fromTeamId: string | null;
  toTeamId: string | null;
  tradeGroup: string | null;
  draftRound: number | null;
  draftPick: number | null;
}

export interface BookData {
  members: BookMember[];
  seasons: BookSeason[];
  teams: BookTeam[];
  games: BookGame[];
  lineups: BookLineup[];
  moves: BookMove[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordRow {
  rank: number;
  holder: string;
  value: string;
  detail?: string;
}

export type RecordResult =
  | { status: "ok"; valueLabel: string; rows: RecordRow[]; note?: string }
  | { status: "empty"; reason: string };

const MAX_ROWS = 50;
const BLOWOUT = 30;
const NARROW = 5;
const TOP_N = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const pts = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + pts(Math.abs(n));
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const share = (n: number) => `${n.toFixed(2)}%`;
const record = (w: number, l: number, t = 0) => (t ? `${w}-${l}-${t}` : `${w}-${l}`);
const wk = (year: number, week: number) => `${year} · Wk ${week}`;

// ─────────────────────────────────────────────────────────────────────────────
// Ranking
// ─────────────────────────────────────────────────────────────────────────────

interface Candidate { holder: string; raw: number; value: string; detail?: string }

function ranked(items: Candidate[], dir: "desc" | "asc", valueLabel: string, note?: string): RecordResult {
  const list = items.filter((c) => Number.isFinite(c.raw));
  if (list.length === 0) return { status: "empty", reason: "Nothing qualifies for this record yet." };
  list.sort((a, b) => (dir === "desc" ? b.raw - a.raw : a.raw - b.raw));
  const rows: RecordRow[] = [];
  for (let i = 0; i < list.length && rows.length < MAX_ROWS; i++) {
    const c = list[i];
    const prev = rows[rows.length - 1];
    const tied = i > 0 && Math.abs(list[i - 1].raw - c.raw) < 1e-9;
    rows.push({ rank: tied && prev ? prev.rank : i + 1, holder: c.holder, value: c.value, detail: c.detail });
  }
  return { status: "ok", valueLabel, rows, ...(note ? { note } : {}) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived league context (built once per BookData)
// ─────────────────────────────────────────────────────────────────────────────

/** One team's side of one game */
interface Side {
  memberId: string;
  teamId: string;
  oppMemberId: string;
  year: number;
  week: number;
  isPlayoff: boolean;
  pf: number;
  pa: number;
  // Weekly context (regular season only; 0 for playoff games)
  weekRank: number;      // 1 = highest score that week
  weekLowRank: number;   // 1 = lowest score that week
  weekTeams: number;
  apW: number; apL: number; apT: number;
  share: number;         // % of league points that week
  oppShare: number;
}

interface SeasonAgg {
  memberId: string;
  year: number;
  games: number;
  w: number; l: number; t: number;
  pf: number; pa: number;
  apW: number; apL: number; apT: number;
  expW: number;
  shareSum: number; oppShareSum: number;
  high: number; low: number;
  top: number; bottom: number;
  topHalf: number; bottomHalf: number;
  blowW: number; blowL: number; narrowW: number; narrowL: number;
}

interface SeasonFinish {
  year: number;
  /** false when the season has no weeks flagged as playoffs */
  known: boolean;
  bracket: Set<string>;   // memberIds in the playoff bracket
  champion?: string;
  runnerUp?: string;
  third?: string;
}

interface LineupEval {
  memberId: string;
  teamId: string;
  year: number;
  week: number;
  actual: number;
  optimal: number;
  starters: BookSpot[];
}

interface Ctx {
  name: (memberId: string) => string;
  teamMember: Map<string, string>;
  teamName: Map<string, string>;
  sides: Side[];          // all sides, regular season + playoffs
  regSides: Side[];
  seasonAggs: SeasonAgg[];
  allTime: Map<string, SeasonAgg>;
  finishes: SeasonFinish[];
  lineups: LineupEval[];
}

const ctxCache = new WeakMap<BookData, Ctx>();

function emptyAgg(memberId: string, year: number): SeasonAgg {
  return {
    memberId, year, games: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, apW: 0, apL: 0, apT: 0, expW: 0,
    shareSum: 0, oppShareSum: 0, high: 0, low: 0, top: 0, bottom: 0, topHalf: 0, bottomHalf: 0,
    blowW: 0, blowL: 0, narrowW: 0, narrowL: 0,
  };
}

function addAgg(into: SeasonAgg, s: SeasonAgg) {
  for (const k of Object.keys(s) as Array<keyof SeasonAgg>) {
    if (k === "memberId" || k === "year") continue;
    (into[k] as number) += s[k] as number;
  }
}

function context(data: BookData): Ctx {
  const cached = ctxCache.get(data);
  if (cached) return cached;

  const names = new Map(data.members.map((m) => [m.id, m.name]));
  const name = (id: string) => names.get(id) ?? "Unknown";
  const teamMember = new Map(data.teams.map((t) => [t.id, t.memberId]));
  const teamName = new Map(data.teams.map((t) => [t.id, t.name]));

  // ── Sides ────────────────────────────────────────────────────────────────
  const sides: Side[] = [];
  for (const g of data.games) {
    const hm = teamMember.get(g.homeTeamId);
    const am = teamMember.get(g.awayTeamId);
    if (!hm || !am) continue;
    const base = { year: g.year, week: g.week, isPlayoff: g.isPlayoff, weekRank: 0, weekLowRank: 0, weekTeams: 0, apW: 0, apL: 0, apT: 0, share: 0, oppShare: 0 };
    sides.push({ ...base, memberId: hm, teamId: g.homeTeamId, oppMemberId: am, pf: g.homeScore, pa: g.awayScore });
    sides.push({ ...base, memberId: am, teamId: g.awayTeamId, oppMemberId: hm, pf: g.awayScore, pa: g.homeScore });
  }
  const regSides = sides.filter((s) => !s.isPlayoff);

  // Weekly context
  const byWeek = new Map<string, Side[]>();
  for (const s of regSides) {
    const k = `${s.year}-${s.week}`;
    if (!byWeek.has(k)) byWeek.set(k, []);
    byWeek.get(k)!.push(s);
  }
  for (const week of byWeek.values()) {
    const total = week.reduce((n, s) => n + s.pf, 0);
    for (const s of week) {
      s.weekTeams = week.length;
      s.weekRank = 1 + week.filter((o) => o.pf > s.pf).length;
      s.weekLowRank = 1 + week.filter((o) => o.pf < s.pf).length;
      s.apW = week.filter((o) => o !== s && o.pf < s.pf).length;
      s.apL = week.filter((o) => o !== s && o.pf > s.pf).length;
      s.apT = week.length - 1 - s.apW - s.apL;
      s.share = total > 0 ? (s.pf / total) * 100 : 0;
      s.oppShare = total > 0 ? (s.pa / total) * 100 : 0;
    }
  }

  // ── Season aggregates ────────────────────────────────────────────────────
  const aggMap = new Map<string, SeasonAgg>();
  for (const s of regSides) {
    const k = `${s.memberId}|${s.year}`;
    if (!aggMap.has(k)) aggMap.set(k, emptyAgg(s.memberId, s.year));
    const a = aggMap.get(k)!;
    const margin = s.pf - s.pa;
    a.games++;
    a.pf += s.pf; a.pa += s.pa;
    if (margin > 0) a.w++; else if (margin < 0) a.l++; else a.t++;
    a.apW += s.apW; a.apL += s.apL; a.apT += s.apT;
    const opps = s.weekTeams - 1;
    if (opps > 0) a.expW += (s.apW + s.apT / 2) / opps;
    a.shareSum += s.share; a.oppShareSum += s.oppShare;
    if (s.weekTeams >= 2) {
      if (s.weekRank === 1) a.high++;
      if (s.weekLowRank === 1) a.low++;
      if (s.weekRank <= TOP_N) a.top++;
      if (s.weekLowRank <= TOP_N) a.bottom++;
      if (s.weekRank <= s.weekTeams / 2) a.topHalf++;
      if (s.weekLowRank <= s.weekTeams / 2) a.bottomHalf++;
    }
    if (margin > BLOWOUT) a.blowW++;
    if (margin < -BLOWOUT) a.blowL++;
    if (margin > 0 && margin < NARROW) a.narrowW++;
    if (margin < 0 && margin > -NARROW) a.narrowL++;
  }
  const seasonAggs = Array.from(aggMap.values());
  const allTime = new Map<string, SeasonAgg>();
  for (const a of seasonAggs) {
    if (!allTime.has(a.memberId)) allTime.set(a.memberId, emptyAgg(a.memberId, 0));
    addAgg(allTime.get(a.memberId)!, a);
  }

  // ── Playoff finishes ─────────────────────────────────────────────────────
  const finishes: SeasonFinish[] = [];
  const years = Array.from(new Set(sides.map((s) => s.year))).sort((a, b) => a - b);
  for (const year of years) {
    const playoffSides = sides.filter((s) => s.year === year && s.isPlayoff);
    const playoffWeeks = Array.from(new Set(playoffSides.map((s) => s.week))).sort((a, b) => a - b);
    if (playoffWeeks.length === 0) {
      finishes.push({ year, known: false, bracket: new Set() });
      continue;
    }
    // Seed by regular-season record, then points
    const seeds = seasonAggs
      .filter((a) => a.year === year)
      .sort((a, b) => (b.w + b.t / 2) - (a.w + a.t / 2) || b.pf - a.pf)
      .map((a) => a.memberId);
    // Bracket size: one round per playoff week, capped at the teams playing
    const playing = new Set(playoffSides.map((s) => s.memberId));
    const size = Math.min(2 ** playoffWeeks.length, seeds.length, playing.size);
    const bracket = new Set(seeds.filter((id) => playing.has(id)).slice(0, size));

    let alive = new Set(bracket);
    const eliminatedIn = new Map<string, number>();
    for (const week of playoffWeeks) {
      const next = new Set(alive);
      for (const s of playoffSides.filter((x) => x.week === week)) {
        if (alive.has(s.memberId) && alive.has(s.oppMemberId) && s.pf < s.pa) {
          next.delete(s.memberId);
          eliminatedIn.set(s.memberId, week);
        }
      }
      alive = next;
    }
    const finish: SeasonFinish = { year, known: true, bracket };
    const lastWeek = playoffWeeks[playoffWeeks.length - 1];
    if (alive.size === 1) {
      finish.champion = [...alive][0];
      const final = playoffSides.find((s) => s.week === lastWeek && s.memberId === finish.champion);
      if (final && bracket.has(final.oppMemberId)) finish.runnerUp = final.oppMemberId;
      // Third place: the winner of the last-week game between the two
      // teams knocked out the round before the final
      const semiLosers = [...eliminatedIn].filter(([, w]) => w === playoffWeeks[playoffWeeks.length - 2]).map(([id]) => id);
      if (semiLosers.length === 2) {
        const g = playoffSides.find((s) => s.week === lastWeek && s.memberId === semiLosers[0] && s.oppMemberId === semiLosers[1]);
        if (g && g.pf !== g.pa) finish.third = g.pf > g.pa ? g.memberId : g.oppMemberId;
      }
    }
    finishes.push(finish);
  }

  // ── Lineups ──────────────────────────────────────────────────────────────
  const regWeeks = new Set(regSides.map((s) => `${s.year}-${s.week}`));
  const lineups: LineupEval[] = [];
  for (const lu of data.lineups) {
    const memberId = teamMember.get(lu.teamId);
    if (!memberId || !regWeeks.has(`${lu.year}-${lu.week}`)) continue;
    const starters = lu.spots.filter((s) => s.isStarter);
    if (starters.length === 0) continue;
    const actual = starters.reduce((n, s) => n + s.points, 0);
    lineups.push({ memberId, teamId: lu.teamId, year: lu.year, week: lu.week, actual, optimal: optimalPoints(lu.spots), starters });
  }

  const ctx: Ctx = { name, teamMember, teamName, sides, regSides, seasonAggs, allTime, finishes, lineups };
  ctxCache.set(data, ctx);
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimal lineup
// ─────────────────────────────────────────────────────────────────────────────

export function normalizePosition(p: string): string {
  const u = p.toUpperCase().trim();
  if (u === "D/ST" || u === "DST" || u === "DEF" || u === "D") return "DEF";
  if (u === "PK") return "K";
  if (u === "DE" || u === "DT") return "DL";
  if (u === "CB" || u === "S") return "DB";
  return u;
}

function slotEligible(slot: string): Set<string> {
  const u = slot.toUpperCase().trim();
  if (u === "FLEX" || u === "RB/WR/TE" || u === "W/R/T") return new Set(["RB", "WR", "TE"]);
  if (u === "OP" || u === "SUPER_FLEX" || u === "SUPERFLEX" || u === "QB/RB/WR/TE") return new Set(["QB", "RB", "WR", "TE"]);
  if (u === "REC_FLEX" || u === "WR/TE") return new Set(["WR", "TE"]);
  if (u === "RB/WR" || u === "W/R") return new Set(["RB", "WR"]);
  if (u === "IDP_FLEX" || u === "DP") return new Set(["DL", "LB", "DB"]);
  return new Set(u.split("/").map(normalizePosition));
}

/**
 * Best possible starting lineup points, filling the slots the manager
 * actually started with. Most restrictive slots are filled first, each with
 * the highest-scoring eligible player still available.
 */
export function optimalPoints(spots: BookSpot[]): number {
  const slots = spots.filter((s) => s.isStarter).map((s) => slotEligible(s.slot));
  slots.sort((a, b) => a.size - b.size);
  const pool = spots
    .filter((s) => s.slot.toUpperCase() !== "IR")
    .map((s) => ({ pos: normalizePosition(s.position), points: s.points, used: false }))
    .sort((a, b) => b.points - a.points);
  let total = 0;
  for (const slot of slots) {
    const pick = pool.find((p) => !p.used && slot.has(p.pos));
    if (pick) { pick.used = true; total += pick.points; }
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Value: points a player scored in a team's starting lineup
// ─────────────────────────────────────────────────────────────────────────────

function starterPointsIndex(ctx: Ctx) {
  // `${teamId}|${playerId}` → [{week, points}]
  const idx = new Map<string, Array<{ week: number; points: number }>>();
  for (const lu of ctx.lineups) {
    for (const s of lu.starters) {
      const k = `${lu.teamId}|${s.playerId}`;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k)!.push({ week: lu.week, points: s.points });
    }
  }
  return (teamId: string, playerId: string, fromWeek: number | null) =>
    (idx.get(`${teamId}|${playerId}`) ?? [])
      .filter((x) => fromWeek == null || x.week >= fromWeek)
      .reduce((n, x) => n + x.points, 0);
}

interface PickValue { memberId: string; year: number; round: number; pick: number | null; playerName: string; position: string; value: number; points: number }
interface MoveValue { memberId: string; year: number; week: number | null; label: string; value: number }

function draftValues(data: BookData, ctx: Ctx): PickValue[] {
  const pointsFor = starterPointsIndex(ctx);
  const picks = data.moves.filter((m) => m.type === "DRAFT" && m.toTeamId && m.draftRound != null);
  const base = picks.map((m) => ({
    memberId: ctx.teamMember.get(m.toTeamId!) ?? "",
    year: m.year,
    round: m.draftRound!,
    pick: m.draftPick,
    playerName: m.playerName,
    position: normalizePosition(m.playerPosition),
    points: pointsFor(m.toTeamId!, m.playerId, null),
  })).filter((p) => p.memberId);
  const roundAvg = new Map<string, number>();
  const groups = new Map<string, number[]>();
  for (const p of base) {
    const k = `${p.year}|${p.round}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p.points);
  }
  for (const [k, list] of groups) roundAvg.set(k, list.reduce((a, b) => a + b, 0) / list.length);
  return base.map((p) => ({ ...p, value: p.points - (roundAvg.get(`${p.year}|${p.round}`) ?? 0) }));
}

function waiverValues(data: BookData, ctx: Ctx): MoveValue[] {
  const pointsFor = starterPointsIndex(ctx);
  return data.moves
    .filter((m) => (m.type === "ADD" || m.type === "WAIVER") && m.toTeamId)
    .map((m) => ({
      memberId: ctx.teamMember.get(m.toTeamId!) ?? "",
      year: m.year,
      week: m.week,
      label: m.playerName,
      value: pointsFor(m.toTeamId!, m.playerId, m.week),
    }))
    .filter((v) => v.memberId);
}

function tradeValues(data: BookData, ctx: Ctx): MoveValue[] {
  const pointsFor = starterPointsIndex(ctx);
  const groups = new Map<string, BookMove[]>();
  for (const m of data.moves) {
    if (m.type !== "TRADE") continue;
    const k = m.tradeGroup ?? `${m.year}-${m.sequence}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m);
  }
  const out: MoveValue[] = [];
  for (const rows of groups.values()) {
    const teams = new Set(rows.flatMap((m) => [m.fromTeamId, m.toTeamId]).filter((x): x is string => !!x));
    for (const teamId of teams) {
      const memberId = ctx.teamMember.get(teamId);
      if (!memberId) continue;
      const got = rows.filter((m) => m.toTeamId === teamId);
      const gave = rows.filter((m) => m.fromTeamId === teamId);
      const gain = got.reduce((n, m) => n + pointsFor(teamId, m.playerId, m.week), 0);
      const loss = gave.reduce((n, m) => n + (m.toTeamId ? pointsFor(m.toTeamId, m.playerId, m.week) : 0), 0);
      const names = (list: BookMove[]) => list.map((m) => m.playerName).join(", ") || "nothing";
      out.push({
        memberId,
        year: rows[0].year,
        week: rows[0].week,
        label: `Got ${names(got)} for ${names(gave)}`,
        value: gain - loss,
      });
    }
  }
  return out;
}

function sumBy<T>(items: T[], key: (t: T) => string, val: (t: T) => number) {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + val(it));
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// Streak helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Run { length: number; from: string; to: string; active: boolean }

/** Longest run of `true` in an ordered list of labelled flags */
function longestRun(items: Array<{ hit: boolean; label: string }>): Run | null {
  let best: Run | null = null;
  let start = -1;
  for (let i = 0; i <= items.length; i++) {
    const hit = i < items.length && items[i].hit;
    if (hit && start < 0) start = i;
    if (!hit && start >= 0) {
      const length = i - start;
      if (!best || length > best.length) best = { length, from: items[start].label, to: items[i - 1].label, active: i === items.length };
      start = -1;
    }
  }
  return best;
}

function runRows(ctx: Ctx, perMember: Map<string, Array<{ hit: boolean; label: string }>>, unit: string, valueLabel: string, note?: string): RecordResult {
  const items: Candidate[] = [];
  for (const [memberId, list] of perMember) {
    const run = longestRun(list);
    if (!run) continue;
    const span = run.from === run.to ? run.from : `${run.from} to ${run.to}`;
    items.push({
      holder: ctx.name(memberId),
      raw: run.length,
      value: `${run.length} ${unit}${run.length === 1 ? "" : "s"}`,
      detail: `${span}${run.active ? " · active" : ""}`,
    });
  }
  return ranked(items, "desc", valueLabel, note);
}

function weeklyFlags(ctx: Ctx, hit: (s: Side) => boolean) {
  const per = new Map<string, Array<{ hit: boolean; label: string; y: number; w: number }>>();
  for (const s of ctx.regSides) {
    if (!per.has(s.memberId)) per.set(s.memberId, []);
    per.get(s.memberId)!.push({ hit: hit(s), label: wk(s.year, s.week), y: s.year, w: s.week });
  }
  for (const list of per.values()) list.sort((a, b) => a.y - b.y || a.w - b.w);
  return per;
}

function seasonFlags(ctx: Ctx, hit: (a: SeasonAgg) => boolean) {
  const per = new Map<string, Array<{ hit: boolean; label: string; y: number }>>();
  for (const a of ctx.seasonAggs) {
    if (!per.has(a.memberId)) per.set(a.memberId, []);
    per.get(a.memberId)!.push({ hit: hit(a), label: String(a.year), y: a.year });
  }
  for (const list of per.values()) list.sort((a, b) => a.y - b.y);
  return per;
}

function finishFlags(ctx: Ctx, hit: (f: SeasonFinish, memberId: string) => boolean) {
  const known = new Map(ctx.finishes.filter((f) => f.known).map((f) => [f.year, f]));
  const per = new Map<string, Array<{ hit: boolean; label: string; y: number }>>();
  for (const a of ctx.seasonAggs) {
    const f = known.get(a.year);
    if (!f) continue;
    if (!per.has(a.memberId)) per.set(a.memberId, []);
    per.get(a.memberId)!.push({ hit: hit(f, a.memberId), label: String(a.year), y: a.year });
  }
  for (const list of per.values()) list.sort((a, b) => a.y - b.y);
  return per;
}

const invert = <T extends { hit: boolean }>(m: Map<string, T[]>) =>
  new Map([...m].map(([k, list]) => [k, list.map((x) => ({ ...x, hit: !x.hit }))]));

function lineupFlags(ctx: Ctx, hit: (l: LineupEval) => boolean) {
  const per = new Map<string, Array<{ hit: boolean; label: string; y: number; w: number }>>();
  for (const l of ctx.lineups) {
    if (!per.has(l.memberId)) per.set(l.memberId, []);
    per.get(l.memberId)!.push({ hit: hit(l), label: wk(l.year, l.week), y: l.year, w: l.week });
  }
  for (const list of per.values()) list.sort((a, b) => a.y - b.y || a.w - b.w);
  return per;
}

const isPerfect = (l: LineupEval) => l.optimal - l.actual < 0.05;

// ─────────────────────────────────────────────────────────────────────────────
// Data availability
// ─────────────────────────────────────────────────────────────────────────────

export const NEED_MESSAGES: Record<RecordNeed, string> = {
  scores: "No completed matchups yet. Import a season and this record fills in automatically.",
  playoffs: "None of this league's seasons have weeks marked as playoffs yet. Sleeper imports mark them; ESPN, Yahoo and Fleaflicker imports don't yet.",
  lineups: "This record needs weekly lineups with each player's points. ESPN imports include them; Sleeper, Yahoo and Fleaflicker imports don't yet.",
  draft: "This record needs the league's draft picks plus weekly lineups with player points, to measure what each pick produced.",
  transactions: "This record needs the league's transaction history (adds, waiver claims and trades). Import or reload transactions to fill it in.",
  keepers: "TheLeague doesn't track keepers yet, so there's nothing to rank here. This page is ready for when keeper data is added.",
  playerStats: "TheLeague doesn't store weekly NFL stat lines (yards, touchdowns, field goals) for each player yet, only fantasy points. This page is ready for when those stats are added.",
};

export function missingData(data: BookData, need: RecordNeed): string | null {
  const ctx = context(data);
  switch (need) {
    case "scores":
      return ctx.regSides.length ? null : NEED_MESSAGES.scores;
    case "playoffs":
      return ctx.finishes.some((f) => f.known) ? null : NEED_MESSAGES.playoffs;
    case "lineups":
      return ctx.lineups.length ? null : NEED_MESSAGES.lineups;
    case "draft":
      return data.moves.some((m) => m.type === "DRAFT") && ctx.lineups.length ? null : NEED_MESSAGES.draft;
    case "transactions":
      return data.moves.some((m) => m.type !== "DRAFT") ? null : NEED_MESSAGES.transactions;
    case "keepers":
    case "playerStats":
      return NEED_MESSAGES[need];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute one record page
// ─────────────────────────────────────────────────────────────────────────────

export function computeRecord(data: BookData, categoryId: string, def: RecordDef, inverse: boolean): RecordResult {
  const missing = missingData(data, def.needs);
  if (missing) return { status: "empty", reason: missing };
  const ctx = context(data);
  const fn = COMPUTERS[categoryId]?.[def.id];
  if (!fn) return { status: "empty", reason: "This record isn't calculated yet." };
  return fn(data, ctx, inverse && !!def.inverseLabel);
}

type Computer = (data: BookData, ctx: Ctx, inverse: boolean) => RecordResult;

const dir = (inverse: boolean, flipped = false): "desc" | "asc" => (inverse !== flipped ? "asc" : "desc");

// ── League (all-time per manager) ────────────────────────────────────────────

function allTimeRows(ctx: Ctx, raw: (a: SeasonAgg) => number, fmt: (n: number, a: SeasonAgg) => string, detail: (a: SeasonAgg) => string, d: "desc" | "asc", label: string, note?: string, filter?: (a: SeasonAgg) => boolean) {
  const items: Candidate[] = [];
  for (const a of ctx.allTime.values()) {
    if (filter && !filter(a)) continue;
    const v = raw(a);
    items.push({ holder: ctx.name(a.memberId), raw: v, value: fmt(v, a), detail: detail(a) });
  }
  return ranked(items, d, label, note);
}

const seasonsPlayed = (ctx: Ctx, memberId: string) => ctx.seasonAggs.filter((s) => s.memberId === memberId).length;
const recDetail = (a: SeasonAgg) => `${record(a.w, a.l, a.t)} record`;
const apDetail = (a: SeasonAgg) => `${record(a.apW, a.apL, a.apT)} all-play`;
const winPct = (a: SeasonAgg) => (a.games ? (a.w + a.t / 2) / a.games : NaN);
const apPct = (a: SeasonAgg) => { const n = a.apW + a.apL + a.apT; return n ? (a.apW + a.apT / 2) / n : NaN; };

function titleCount(ctx: Ctx, pickWinner: (season: SeasonAgg[]) => SeasonAgg | undefined, label: string, note?: string): RecordResult {
  const years = Array.from(new Set(ctx.seasonAggs.map((a) => a.year)));
  const wins = new Map<string, number[]>();
  for (const y of years) {
    const winner = pickWinner(ctx.seasonAggs.filter((a) => a.year === y));
    if (!winner) continue;
    if (!wins.has(winner.memberId)) wins.set(winner.memberId, []);
    wins.get(winner.memberId)!.push(y);
  }
  return ranked(
    [...wins].map(([id, ys]) => ({ holder: ctx.name(id), raw: ys.length, value: int(ys.length), detail: ys.sort().join(", ") })),
    "desc", label, note,
  );
}

function playoffAgg(ctx: Ctx) {
  const bracketOf = new Map(ctx.finishes.map((f) => [f.year, f.bracket]));
  const m = new Map<string, { w: number; l: number; t: number; pf: number; pa: number }>();
  for (const s of ctx.sides) {
    if (!s.isPlayoff) continue;
    const b = bracketOf.get(s.year);
    if (!b || !b.has(s.memberId) || !b.has(s.oppMemberId)) continue;
    if (!m.has(s.memberId)) m.set(s.memberId, { w: 0, l: 0, t: 0, pf: 0, pa: 0 });
    const a = m.get(s.memberId)!;
    a.pf += s.pf; a.pa += s.pa;
    if (s.pf > s.pa) a.w++; else if (s.pf < s.pa) a.l++; else a.t++;
  }
  return m;
}

function finishCount(ctx: Ctx, score: (f: SeasonFinish, id: string) => number, fmt: (n: number) => string, label: string, detailYears = true, percentOfSeasons = false): RecordResult {
  const known = ctx.finishes.filter((f) => f.known);
  const items: Candidate[] = [];
  for (const id of ctx.allTime.keys()) {
    let total = 0;
    const years: number[] = [];
    let played = 0;
    for (const f of known) {
      if (!ctx.seasonAggs.some((a) => a.memberId === id && a.year === f.year)) continue;
      played++;
      const v = score(f, id);
      if (v > 0) { total += v; years.push(f.year); }
    }
    if (played === 0) continue;
    const raw = percentOfSeasons ? total / played : total;
    items.push({
      holder: ctx.name(id), raw, value: fmt(raw),
      detail: percentOfSeasons ? `${total} of ${played} seasons` : detailYears && years.length ? years.join(", ") : `${played} seasons`,
    });
  }
  return ranked(items, "desc", label, "Playoff brackets are inferred from regular-season seeding and playoff results.");
}

const LEAGUE: Record<string, Computer> = {
  "total-wins": (_d, c) => allTimeRows(c, (a) => a.w, int, recDetail, "desc", "Wins"),
  "total-losses": (_d, c) => allTimeRows(c, (a) => a.l, int, recDetail, "desc", "Losses"),
  "win-percent": (_d, c) => allTimeRows(c, winPct, pct, recDetail, "desc", "Win %"),
  "all-play-wins": (_d, c) => allTimeRows(c, (a) => a.apW, int, apDetail, "desc", "All-play wins"),
  "all-play-losses": (_d, c) => allTimeRows(c, (a) => a.apL, int, apDetail, "desc", "All-play losses"),
  "all-play-win-percent": (_d, c) => allTimeRows(c, apPct, pct, apDetail, "desc", "All-play win %"),
  "total-points": (_d, c) => allTimeRows(c, (a) => a.pf, pts, (a) => `${pts(a.pf / a.games)} per game`, "desc", "Points"),
  "total-opponent-points": (_d, c) => allTimeRows(c, (a) => a.pa, pts, (a) => `${pts(a.pa / a.games)} per game`, "desc", "Opponent points"),
  "points-share-average": (_d, c) => allTimeRows(c, (a) => a.shareSum / a.games, share, (a) => `${a.games} games`, "desc", "Points share"),
  "opponent-points-share-average": (_d, c) => allTimeRows(c, (a) => a.oppShareSum / a.games, share, (a) => `${a.games} games`, "desc", "Opp. points share"),
  luckiest: (_d, c, inv) => allTimeRows(c, (a) => a.w + a.t / 2 - a.expW, signed, (a) => `${record(a.w, a.l, a.t)} actual · ${pts(a.expW)} expected wins`, dir(inv), "Wins over expected"),
  "strength-of-schedule": (_d, c, inv) => allTimeRows(c, (a) => a.oppShareSum / a.games, share, (a) => `${pts(a.pa / a.games)} opponent points per game`, dir(inv), "Opp. points share"),
  "high-scores-count": (_d, c, inv) => allTimeRows(c, (a) => (inv ? a.low : a.high), int, (a) => `${a.games} weeks`, "desc", inv ? "Lowest scores" : "High scores"),
  "high-scores-percent": (_d, c, inv) => allTimeRows(c, (a) => (inv ? a.low : a.high) / a.games, pct, (a) => `${inv ? a.low : a.high} of ${a.games} weeks`, "desc", inv ? "Lowest score %" : "High score %"),
  "top-scores-count": (_d, c, inv) => allTimeRows(c, (a) => (inv ? a.bottom : a.top), int, (a) => `${a.games} weeks`, "desc", inv ? "Bottom-3 scores" : "Top-3 scores"),
  "top-scores-percent": (_d, c, inv) => allTimeRows(c, (a) => (inv ? a.bottom : a.top) / a.games, pct, (a) => `${inv ? a.bottom : a.top} of ${a.games} weeks`, "desc", inv ? "Bottom-3 %" : "Top-3 %"),
  "top-half-scores-count": (_d, c, inv) => allTimeRows(c, (a) => (inv ? a.bottomHalf : a.topHalf), int, (a) => `${a.games} weeks`, "desc", inv ? "Bottom-half weeks" : "Top-half weeks"),
  "top-half-scores-percent": (_d, c, inv) => allTimeRows(c, (a) => (inv ? a.bottomHalf : a.topHalf) / a.games, pct, (a) => `${inv ? a.bottomHalf : a.topHalf} of ${a.games} weeks`, "desc", inv ? "Bottom-half %" : "Top-half %"),
  "blowout-wins": (_d, c) => allTimeRows(c, (a) => a.blowW, int, recDetail, "desc", "Blowout wins"),
  "blowout-losses": (_d, c) => allTimeRows(c, (a) => a.blowL, int, recDetail, "desc", "Blowout losses"),
  "narrow-wins": (_d, c) => allTimeRows(c, (a) => a.narrowW, int, recDetail, "desc", "Narrow wins"),
  "narrow-losses": (_d, c) => allTimeRows(c, (a) => a.narrowL, int, recDetail, "desc", "Narrow losses"),
  "regular-season-titles": (_d, c) => titleCount(c, (s) => [...s].sort((a, b) => (b.w + b.t / 2) - (a.w + a.t / 2) || b.pf - a.pf)[0], "Titles"),
  "season-points-titles": (_d, c) => titleCount(c, (s) => [...s].sort((a, b) => b.pf - a.pf)[0], "Titles"),
  "season-all-play-titles": (_d, c) => titleCount(c, (s) => [...s].sort((a, b) => apPct(b) - apPct(a) || b.pf - a.pf)[0], "Titles"),
  "seasons-winning-record": (_d, c) => seasonCount(c, (a) => a.w > a.l, "Seasons"),
  "seasons-losing-record": (_d, c) => seasonCount(c, (a) => a.l > a.w, "Seasons"),

  championships: (_d, c) => finishCount(c, (f, id) => (f.champion === id ? 1 : 0), int, "Titles"),
  "medal-score": (_d, c) => finishCount(c, (f, id) => (f.champion === id ? 3 : f.runnerUp === id ? 2 : f.third === id ? 1 : 0), int, "Medal score"),
  "total-medals": (_d, c) => finishCount(c, (f, id) => (f.champion === id || f.runnerUp === id || f.third === id ? 1 : 0), int, "Medals"),
  "playoff-appearances": (_d, c) => finishCount(c, (f, id) => (f.bracket.has(id) ? 1 : 0), int, "Appearances"),
  "playoff-appearances-percent": (_d, c) => finishCount(c, (f, id) => (f.bracket.has(id) ? 1 : 0), pct, "Appearance %", false, true),
  "playoff-wins": (_d, c) => playoffRows(c, (a) => a.w, int, "Playoff wins"),
  "playoff-losses": (_d, c) => playoffRows(c, (a) => a.l, int, "Playoff losses"),
  "total-playoff-points": (_d, c) => playoffRows(c, (a) => a.pf, pts, "Playoff points"),
  "total-opponent-playoff-points": (_d, c) => playoffRows(c, (a) => a.pa, pts, "Opp. playoff points"),
};

function seasonCount(ctx: Ctx, hit: (a: SeasonAgg) => boolean, label: string): RecordResult {
  const items: Candidate[] = [];
  for (const id of ctx.allTime.keys()) {
    const seasons = ctx.seasonAggs.filter((a) => a.memberId === id);
    const hits = seasons.filter(hit).map((a) => a.year).sort();
    items.push({ holder: ctx.name(id), raw: hits.length, value: int(hits.length), detail: `${hits.length} of ${seasons.length} seasons${hits.length ? ` · ${hits.join(", ")}` : ""}` });
  }
  return ranked(items, "desc", label);
}

function playoffRows(ctx: Ctx, raw: (a: { w: number; l: number; t: number; pf: number; pa: number }) => number, fmt: (n: number) => string, label: string) {
  const items: Candidate[] = [...playoffAgg(ctx)].map(([id, a]) => ({ holder: ctx.name(id), raw: raw(a), value: fmt(raw(a)), detail: `${record(a.w, a.l, a.t)} in the playoffs` }));
  return ranked(items, "desc", label, "Playoff brackets are inferred from regular-season seeding and playoff results.");
}

// ── Season (single manager-season) ───────────────────────────────────────────

function seasonRows(ctx: Ctx, raw: (a: SeasonAgg) => number, fmt: (n: number) => string, detail: (a: SeasonAgg) => string, d: "desc" | "asc", label: string) {
  return ranked(
    ctx.seasonAggs.filter((a) => a.games > 0).map((a) => ({ holder: ctx.name(a.memberId), raw: raw(a), value: fmt(raw(a)), detail: `${a.year} · ${detail(a)}` })),
    d, label,
  );
}

const seasonScore = (a: SeasonAgg) => ((winPct(a) + apPct(a)) / 2) * 100;

const SEASON: Record<string, Computer> = {
  "season-score": (_d, c, inv) => seasonRows(c, seasonScore, (n) => n.toFixed(1), (a) => `${record(a.w, a.l, a.t)}, ${record(a.apW, a.apL, a.apT)} all-play`, dir(inv), "Season score"),
  "season-luckiest": (_d, c, inv) => seasonRows(c, (a) => a.w + a.t / 2 - a.expW, signed, (a) => `${record(a.w, a.l, a.t)} actual · ${pts(a.expW)} expected wins`, dir(inv), "Wins over expected"),
  "strength-of-schedule": (_d, c, inv) => seasonRows(c, (a) => a.oppShareSum / a.games, share, (a) => `${pts(a.pa)} points against`, dir(inv), "Opp. points share"),
  "most-wins": (_d, c) => seasonRows(c, (a) => a.w, int, (a) => record(a.w, a.l, a.t), "desc", "Wins"),
  "most-losses": (_d, c) => seasonRows(c, (a) => a.l, int, (a) => record(a.w, a.l, a.t), "desc", "Losses"),
  "most-all-play-wins": (_d, c) => seasonRows(c, (a) => a.apW, int, (a) => record(a.apW, a.apL, a.apT), "desc", "All-play wins"),
  "most-all-play-losses": (_d, c) => seasonRows(c, (a) => a.apL, int, (a) => record(a.apW, a.apL, a.apT), "desc", "All-play losses"),
  "best-all-play-win-percent": (_d, c) => seasonRows(c, apPct, pct, (a) => record(a.apW, a.apL, a.apT), "desc", "All-play win %"),
  "most-points": (_d, c, inv) => seasonRows(c, (a) => (inv ? a.pa : a.pf), pts, (a) => record(a.w, a.l, a.t), "desc", inv ? "Points against" : "Points"),
  "fewest-points": (_d, c, inv) => seasonRows(c, (a) => (inv ? a.pa : a.pf), pts, (a) => record(a.w, a.l, a.t), "asc", inv ? "Points against" : "Points"),
  "highest-points-share": (_d, c) => seasonRows(c, (a) => a.shareSum / a.games, share, (a) => `${pts(a.pf)} points`, "desc", "Points share"),
  "lowest-points-share": (_d, c) => seasonRows(c, (a) => a.shareSum / a.games, share, (a) => `${pts(a.pf)} points`, "asc", "Points share"),
  "highest-opponents-points-share": (_d, c) => seasonRows(c, (a) => a.oppShareSum / a.games, share, (a) => `${pts(a.pa)} points against`, "desc", "Opp. points share"),
  "lowest-opponents-points-share": (_d, c) => seasonRows(c, (a) => a.oppShareSum / a.games, share, (a) => `${pts(a.pa)} points against`, "asc", "Opp. points share"),
  "high-scores": (_d, c, inv) => seasonRows(c, (a) => (inv ? a.low : a.high), int, (a) => `${a.games} weeks`, "desc", inv ? "Lowest scores" : "High scores"),
  "top-scores": (_d, c, inv) => seasonRows(c, (a) => (inv ? a.bottom : a.top), int, (a) => `${a.games} weeks`, "desc", inv ? "Bottom-3 scores" : "Top-3 scores"),
  "top-half-scores": (_d, c, inv) => seasonRows(c, (a) => (inv ? a.bottomHalf : a.topHalf), int, (a) => `${a.games} weeks`, "desc", inv ? "Bottom-half weeks" : "Top-half weeks"),
  "most-blowout-wins": (_d, c) => seasonRows(c, (a) => a.blowW, int, (a) => record(a.w, a.l, a.t), "desc", "Blowout wins"),
  "most-blowout-losses": (_d, c) => seasonRows(c, (a) => a.blowL, int, (a) => record(a.w, a.l, a.t), "desc", "Blowout losses"),
  "most-narrow-wins": (_d, c) => seasonRows(c, (a) => a.narrowW, int, (a) => record(a.w, a.l, a.t), "desc", "Narrow wins"),
  "most-narrow-losses": (_d, c) => seasonRows(c, (a) => a.narrowL, int, (a) => record(a.w, a.l, a.t), "desc", "Narrow losses"),
};

// ── Matchup (single game) ────────────────────────────────────────────────────

function gameRows(ctx: Ctx, playoff: boolean, raw: (s: Side) => number, fmt: (n: number) => string, d: "desc" | "asc", label: string, opts: { oncePerGame?: boolean; winnersOnly?: boolean } = {}) {
  let list = ctx.sides.filter((s) => s.isPlayoff === playoff);
  if (playoff) {
    const brackets = new Map(ctx.finishes.map((f) => [f.year, f.bracket]));
    list = list.filter((s) => brackets.get(s.year)?.has(s.memberId) && brackets.get(s.year)?.has(s.oppMemberId));
  }
  if (opts.winnersOnly) list = list.filter((s) => s.pf > s.pa);
  else if (opts.oncePerGame) list = list.filter((s) => s.pf > s.pa || (s.pf === s.pa && s.memberId < s.oppMemberId));
  return ranked(
    list.map((s) => ({
      holder: opts.oncePerGame ? `${ctx.name(s.memberId)} vs ${ctx.name(s.oppMemberId)}` : ctx.name(s.memberId),
      raw: raw(s),
      value: fmt(raw(s)),
      detail: `${pts(s.pf)}–${pts(s.pa)}${opts.oncePerGame ? "" : ` vs ${ctx.name(s.oppMemberId)}`} · ${wk(s.year, s.week)}`,
    })),
    d, label,
    playoff ? "Playoff games between teams in the playoff bracket. Brackets are inferred from seeding and results." : undefined,
  );
}

const MATCHUP: Record<string, Computer> = {
  "most-matchup-points": (_d, c) => gameRows(c, false, (s) => s.pf, pts, "desc", "Points"),
  "fewest-matchup-points": (_d, c) => gameRows(c, false, (s) => s.pf, pts, "asc", "Points"),
  "highest-combined-score": (_d, c) => gameRows(c, false, (s) => s.pf + s.pa, pts, "desc", "Combined", { oncePerGame: true }),
  "lowest-combined-score": (_d, c) => gameRows(c, false, (s) => s.pf + s.pa, pts, "asc", "Combined", { oncePerGame: true }),
  "biggest-blowout": (_d, c) => gameRows(c, false, (s) => s.pf - s.pa, pts, "desc", "Margin", { winnersOnly: true }),
  "narrowest-win": (_d, c) => gameRows(c, false, (s) => s.pf - s.pa, pts, "asc", "Margin", { winnersOnly: true }),
  "highest-points-share": (_d, c) => gameRows(c, false, (s) => s.share, share, "desc", "Points share"),
  "lowest-points-share": (_d, c) => gameRows(c, false, (s) => s.share, share, "asc", "Points share"),
  "most-playoff-matchup-points": (_d, c) => gameRows(c, true, (s) => s.pf, pts, "desc", "Points"),
  "fewest-playoff-matchup-points": (_d, c) => gameRows(c, true, (s) => s.pf, pts, "asc", "Points"),
  "highest-playoff-combined-score": (_d, c) => gameRows(c, true, (s) => s.pf + s.pa, pts, "desc", "Combined", { oncePerGame: true }),
  "lowest-playoff-combined-score": (_d, c) => gameRows(c, true, (s) => s.pf + s.pa, pts, "asc", "Combined", { oncePerGame: true }),
  "biggest-playoff-win": (_d, c) => gameRows(c, true, (s) => s.pf - s.pa, pts, "desc", "Margin", { winnersOnly: true }),
  "narrowest-playoff-win": (_d, c) => gameRows(c, true, (s) => s.pf - s.pa, pts, "asc", "Margin", { winnersOnly: true }),
};

// ── Draft & transactions ─────────────────────────────────────────────────────

const VALUE_NOTE = "Value counts only points scored in the manager's starting lineup during the regular season.";

function draftComputer(kind: "alltime" | "season" | "pick", position: string | null): Computer {
  return (data, ctx, inv) => {
    const picks = draftValues(data, ctx).filter((p) => !position || p.position === position);
    if (picks.length === 0) return { status: "empty", reason: position ? `No ${position} picks in this league's drafts.` : "No draft picks found." };
    const note = "A pick's value is the points the player scored in the drafting team's starting lineup that season, minus the average for picks in the same round. " + VALUE_NOTE;
    if (kind === "pick") {
      return ranked(picks.map((p) => ({
        holder: ctx.name(p.memberId), raw: p.value, value: signed(p.value),
        detail: `${p.playerName} (${p.position}) · ${p.year} round ${p.round}${p.pick ? `, pick ${p.pick}` : ""} · ${pts(p.points)} pts`,
      })), dir(inv), "Value over round", note);
    }
    const key = kind === "season" ? (p: PickValue) => `${p.memberId}|${p.year}` : (p: PickValue) => p.memberId;
    const totals = sumBy(picks, key, (p) => p.value);
    const counts = sumBy(picks, key, () => 1);
    return ranked([...totals].map(([k, v]) => {
      const [memberId, year] = k.split("|");
      return { holder: ctx.name(memberId), raw: v, value: signed(v), detail: `${year ? `${year} · ` : ""}${counts.get(k)} picks` };
    }), dir(inv), "Draft value", note);
  };
}

function moveTotals(ctx: Ctx, values: MoveValue[], perSeason: boolean, inv: boolean, label: string, note: string): RecordResult {
  const key = perSeason ? (v: MoveValue) => `${v.memberId}|${v.year}` : (v: MoveValue) => v.memberId;
  const totals = sumBy(values, key, (v) => v.value);
  const counts = sumBy(values, key, () => 1);
  return ranked([...totals].map(([k, v]) => {
    const [memberId, year] = k.split("|");
    return { holder: ctx.name(memberId), raw: v, value: signed(v), detail: `${year ? `${year} · ` : ""}${counts.get(k)} moves` };
  }), dir(inv), label, note);
}

function managerValue(data: BookData, ctx: Ctx, perSeason: boolean, inv: boolean): RecordResult {
  const parts: MoveValue[] = [
    ...draftValues(data, ctx).map((p) => ({ memberId: p.memberId, year: p.year, week: null, label: "", value: p.value })),
    ...waiverValues(data, ctx),
    ...tradeValues(data, ctx),
  ];
  return moveTotals(ctx, parts, perSeason, inv, "Manager value", "Draft value plus waiver value plus trade value. " + VALUE_NOTE);
}

const needsLineups = (ctx: Ctx): RecordResult | null => (ctx.lineups.length ? null : { status: "empty", reason: NEED_MESSAGES.lineups });

const WAIVER_NOTE = "Points the player scored in the acquiring manager's starting lineup from the week of the pickup. " + VALUE_NOTE;
const TRADE_NOTE = "Points the received players scored in the manager's starting lineup after the trade, minus what the players sent away scored for their new team. " + VALUE_NOTE;

const DRAFT: Record<string, Computer> = {
  "draft-value": draftComputer("alltime", null),
  "top-draft-season": draftComputer("season", null),
  "best-draft-pick": draftComputer("pick", null),
  "manager-value": (d, c) => needsLineups(c) ?? managerValue(d, c, false, false),
  "best-manager-season": (d, c, inv) => needsLineups(c) ?? managerValue(d, c, true, inv),
  "waiver-value": (d, c) => needsLineups(c) ?? moveTotals(c, waiverValues(d, c), false, false, "Waiver value", WAIVER_NOTE),
  "best-waiver-season": (d, c, inv) => needsLineups(c) ?? moveTotals(c, waiverValues(d, c), true, inv, "Waiver value", WAIVER_NOTE),
  "trade-value": (d, c) => needsLineups(c) ?? moveTotals(c, tradeValues(d, c), false, false, "Trade value", TRADE_NOTE),
  "best-trade-season": (d, c, inv) => needsLineups(c) ?? moveTotals(c, tradeValues(d, c), true, inv, "Trade value", TRADE_NOTE),
  "top-trades": (d, c, inv) => needsLineups(c) ?? ranked(tradeValues(d, c).map((v) => ({
    holder: c.name(v.memberId), raw: v.value, value: signed(v.value), detail: `${v.label} · ${v.week ? wk(v.year, v.week) : v.year}`,
  })), dir(inv), "Trade value", TRADE_NOTE),
  "top-waivers": (d, c, inv) => needsLineups(c) ?? ranked(waiverValues(d, c).map((v) => ({
    holder: c.name(v.memberId), raw: v.value, value: pts(v.value), detail: `${v.label} · ${v.week ? wk(v.year, v.week) : v.year}`,
  })), dir(inv), "Points after pickup", WAIVER_NOTE),
  "most-transactions": (d, c) => {
    const counts = new Map<string, number>();
    const seenTrades = new Set<string>();
    for (const m of d.moves) {
      if (m.type === "ADD" || m.type === "WAIVER") {
        const id = m.toTeamId && c.teamMember.get(m.toTeamId);
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      } else if (m.type === "TRADE") {
        for (const t of [m.fromTeamId, m.toTeamId]) {
          const id = t && c.teamMember.get(t);
          const k = `${m.tradeGroup ?? m.sequence}|${id}`;
          if (id && !seenTrades.has(k)) { seenTrades.add(k); counts.set(id, (counts.get(id) ?? 0) + 1); }
        }
      }
    }
    return ranked([...counts].map(([id, n]) => ({ holder: c.name(id), raw: n, value: int(n), detail: `${seasonsPlayed(c, id)} seasons` })), "desc", "Transactions", "Free-agent adds, waiver claims and trades (each trade counts once). Drops aren't counted.");
  },
  "most-trades": (d, c) => {
    const groups = new Map<string, Set<string>>();
    for (const m of d.moves) {
      if (m.type !== "TRADE") continue;
      for (const t of [m.fromTeamId, m.toTeamId]) {
        const id = t && c.teamMember.get(t);
        if (!id) continue;
        if (!groups.has(id)) groups.set(id, new Set());
        groups.get(id)!.add(m.tradeGroup ?? `${m.year}-${m.sequence}`);
      }
    }
    return ranked([...groups].map(([id, g]) => ({ holder: c.name(id), raw: g.size, value: int(g.size), detail: `${seasonsPlayed(c, id)} seasons` })), "desc", "Trades");
  },
};
for (const p of ["QB", "RB", "WR", "TE", "K", "DEF", "DL", "LB", "DB"]) {
  const s = p.toLowerCase();
  DRAFT[`${s}-draft-value`] = draftComputer("alltime", p);
  DRAFT[`${s}-top-draft-season`] = draftComputer("season", p);
  DRAFT[`${s}-best-draft-pick`] = draftComputer("pick", p);
}

// ── Roster (lineups) ─────────────────────────────────────────────────────────

const COACH_NOTE = "Coach score is the points a manager started divided by the best lineup they could have started from the same roster, using the same lineup slots.";

function lineupGroups(ctx: Ctx, perSeason: boolean) {
  const g = new Map<string, LineupEval[]>();
  for (const l of ctx.lineups) {
    const k = perSeason ? `${l.memberId}|${l.year}` : l.memberId;
    if (!g.has(k)) g.set(k, []);
    g.get(k)!.push(l);
  }
  return g;
}

function lineupRows(ctx: Ctx, perSeason: boolean, raw: (ls: LineupEval[]) => number, fmt: (n: number) => string, detail: (ls: LineupEval[]) => string, d: "desc" | "asc", label: string, note?: string) {
  return ranked([...lineupGroups(ctx, perSeason)].map(([k, ls]) => {
    const [memberId, year] = k.split("|");
    return { holder: ctx.name(memberId), raw: raw(ls), value: fmt(raw(ls)), detail: `${year ? `${year} · ` : ""}${detail(ls)}` };
  }), d, label, note);
}

const coach = (ls: LineupEval[]) => {
  const opt = ls.reduce((n, l) => n + l.optimal, 0);
  return opt > 0 ? (ls.reduce((n, l) => n + l.actual, 0) / opt) * 100 : NaN;
};
const missed = (ls: LineupEval[]) => ls.reduce((n, l) => n + (l.optimal - l.actual), 0);
const posAvg = (pos: string) => (ls: LineupEval[]) =>
  ls.reduce((n, l) => n + l.starters.filter((s) => normalizePosition(s.position) === pos).reduce((m, s) => m + s.points, 0), 0) / ls.length;

function topPlayer(ctx: Ctx, perSeason: boolean, pos: string | null): RecordResult {
  const totals = new Map<string, { memberId: string; year: number; week: number; name: string; pos: string; points: number; weeks: number }>();
  for (const l of ctx.lineups) {
    for (const s of l.starters) {
      const p = normalizePosition(s.position);
      if (pos && p !== pos) continue;
      const k = perSeason ? `${l.memberId}|${l.year}|${s.playerId}` : `${l.memberId}|${l.year}|${l.week}|${s.playerId}`;
      if (!totals.has(k)) totals.set(k, { memberId: l.memberId, year: l.year, week: l.week, name: s.playerName, pos: p, points: 0, weeks: 0 });
      const t = totals.get(k)!;
      t.points += s.points; t.weeks++;
    }
  }
  return ranked([...totals.values()].map((t) => ({
    holder: ctx.name(t.memberId), raw: t.points, value: pts(t.points),
    detail: perSeason
      ? `${t.name} (${t.pos}) · ${t.year} · ${t.weeks} starts`
      : `${t.name} (${t.pos}) · ${wk(t.year, t.week)}`,
  })), "desc", "Points", "Points scored while in the manager's starting lineup, regular season only.");
}

const ROSTER: Record<string, Computer> = {
  "coach-score": (_d, c, inv) => lineupRows(c, false, coach, (n) => `${n.toFixed(1)}%`, (ls) => `${ls.length} weeks`, dir(inv), "Coach score", COACH_NOTE),
  "optimal-points-missed": (_d, c) => lineupRows(c, false, missed, pts, (ls) => `${ls.length} weeks`, "desc", "Points missed", COACH_NOTE),
  "season-coach-score": (_d, c, inv) => lineupRows(c, true, coach, (n) => `${n.toFixed(1)}%`, (ls) => `${ls.length} weeks`, dir(inv), "Coach score", COACH_NOTE),
  "season-perfect-games": (_d, c) => lineupRows(c, true, (ls) => ls.filter(isPerfect).length, int, (ls) => `${ls.length} weeks`, "desc", "Perfect weeks", COACH_NOTE),
  "season-optimal-points-missed": (_d, c) => lineupRows(c, true, missed, pts, (ls) => `${ls.length} weeks`, "desc", "Points missed", COACH_NOTE),
  "season-top-player": (_d, c) => topPlayer(c, true, null),
  "matchup-optimal-points-missed": (_d, c) => ranked(c.lineups.map((l) => ({
    holder: c.name(l.memberId), raw: l.optimal - l.actual, value: pts(l.optimal - l.actual),
    detail: `Started ${pts(l.actual)} of a possible ${pts(l.optimal)} · ${wk(l.year, l.week)}`,
  })), "desc", "Points missed", COACH_NOTE),
  "matchup-top-player": (_d, c) => topPlayer(c, false, null),
};
for (const p of ["QB", "RB", "WR", "TE", "K", "DEF"]) {
  const s = p.toLowerCase();
  ROSTER[`${s}-avg-points`] = (_d, c, inv) => lineupRows(c, false, posAvg(p), pts, (ls) => `${ls.length} weeks`, dir(inv), `${p} points / week`);
  ROSTER[`season-${s}-avg-points`] = (_d, c, inv) => lineupRows(c, true, posAvg(p), pts, (ls) => `${ls.length} weeks`, dir(inv), `${p} points / week`);
  ROSTER[`season-${s}-top-player`] = (_d, c) => topPlayer(c, true, p);
  ROSTER[`matchup-${s}-top-player`] = (_d, c) => topPlayer(c, false, p);
}

// ── Streaks & droughts ───────────────────────────────────────────────────────

const PLAYOFF_NOTE = "Only seasons with weeks marked as playoffs count. Brackets are inferred from seeding and results.";
const isFinalist = (f: SeasonFinish, id: string) => f.champion === id || f.runnerUp === id;
const isMedal = (f: SeasonFinish, id: string) => isFinalist(f, id) || f.third === id;

const STREAKS: Record<string, Computer> = {
  "win-streak": (_d, c) => runRows(c, weeklyFlags(c, (s) => s.pf > s.pa), "game", "Wins"),
  "loss-streak": (_d, c) => runRows(c, weeklyFlags(c, (s) => s.pf < s.pa), "game", "Losses"),
  "high-score-streak": (_d, c) => runRows(c, weeklyFlags(c, (s) => s.weekRank === 1), "week", "Weeks"),
  "top-score-streak": (_d, c) => runRows(c, weeklyFlags(c, (s) => s.weekRank <= TOP_N), "week", "Weeks"),
  "top-half-streak": (_d, c) => runRows(c, weeklyFlags(c, (s) => s.weekRank <= s.weekTeams / 2), "week", "Weeks"),
  "winning-record-streak": (_d, c) => runRows(c, seasonFlags(c, (a) => a.w > a.l), "season", "Seasons"),
  "coach-score-perfect-streak": (_d, c) => runRows(c, lineupFlags(c, isPerfect), "week", "Weeks", COACH_NOTE),
  "championship-streak": (_d, c) => runRows(c, finishFlags(c, (f, id) => f.champion === id), "season", "Seasons", PLAYOFF_NOTE),
  "title-game-streak": (_d, c) => runRows(c, finishFlags(c, isFinalist), "season", "Seasons", PLAYOFF_NOTE),
  "medal-streak": (_d, c) => runRows(c, finishFlags(c, isMedal), "season", "Seasons", PLAYOFF_NOTE),
  "playoff-appearance-streak": (_d, c) => runRows(c, finishFlags(c, (f, id) => f.bracket.has(id)), "season", "Seasons", PLAYOFF_NOTE),
  "high-score-drought": (_d, c) => runRows(c, invert(weeklyFlags(c, (s) => s.weekRank === 1)), "week", "Weeks"),
  "top-score-drought": (_d, c) => runRows(c, invert(weeklyFlags(c, (s) => s.weekRank <= TOP_N)), "week", "Weeks"),
  "top-half-drought": (_d, c) => runRows(c, invert(weeklyFlags(c, (s) => s.weekRank <= s.weekTeams / 2)), "week", "Weeks"),
  "winning-record-drought": (_d, c) => runRows(c, invert(seasonFlags(c, (a) => a.w > a.l)), "season", "Seasons"),
  "coach-score-perfect-drought": (_d, c) => runRows(c, invert(lineupFlags(c, isPerfect)), "week", "Weeks", COACH_NOTE),
  "championship-drought": (_d, c) => runRows(c, invert(finishFlags(c, (f, id) => f.champion === id)), "season", "Seasons", PLAYOFF_NOTE),
  "title-game-drought": (_d, c) => runRows(c, invert(finishFlags(c, isFinalist)), "season", "Seasons", PLAYOFF_NOTE),
  "medal-drought": (_d, c) => runRows(c, invert(finishFlags(c, isMedal)), "season", "Seasons", PLAYOFF_NOTE),
  "playoff-appearance-drought": (_d, c) => runRows(c, invert(finishFlags(c, (f, id) => f.bracket.has(id))), "season", "Seasons", PLAYOFF_NOTE),
};

// ── Milestones ───────────────────────────────────────────────────────────────

function milestone(ctx: Ctx, step: number, perGame: (s: Side) => number, fmt: (n: number) => string, label: string): RecordResult {
  const items: Candidate[] = [];
  for (const memberId of ctx.allTime.keys()) {
    const games = ctx.regSides.filter((s) => s.memberId === memberId).sort((a, b) => a.year - b.year || a.week - b.week);
    let total = 0;
    let reachedAt = "";
    for (const g of games) {
      const before = total;
      total += perGame(g);
      if (Math.floor(total / step) > Math.floor(before / step)) reachedAt = wk(g.year, g.week);
    }
    const reached = Math.floor(total / step) * step;
    const next = reached + step;
    items.push({
      holder: ctx.name(memberId),
      raw: total,
      value: fmt(total),
      detail: reached > 0
        ? `Reached ${fmt(reached)} in ${reachedAt} · ${fmt(next - total)} to ${fmt(next)}`
        : `${fmt(next - total)} to ${fmt(next)}`,
    });
  }
  return ranked(items, "desc", label);
}

const MILESTONES: Record<string, Computer> = {
  "total-wins": (_d, c) => milestone(c, 25, (s) => (s.pf > s.pa ? 1 : 0), int, "Wins"),
  "total-losses": (_d, c) => milestone(c, 25, (s) => (s.pf < s.pa ? 1 : 0), int, "Losses"),
  "all-play-wins": (_d, c) => milestone(c, 250, (s) => s.apW, int, "All-play wins"),
  "all-play-losses": (_d, c) => milestone(c, 250, (s) => s.apL, int, "All-play losses"),
  "total-points": (_d, c) => milestone(c, 5000, (s) => s.pf, int, "Points"),
  "total-opponent-points": (_d, c) => milestone(c, 5000, (s) => s.pa, int, "Opponent points"),
  "high-scores": (_d, c, inv) => milestone(c, 5, (s) => (s.weekTeams >= 2 && (inv ? s.weekLowRank : s.weekRank) === 1 ? 1 : 0), int, inv ? "Lowest scores" : "High scores"),
  "top-scores": (_d, c, inv) => milestone(c, 10, (s) => (s.weekTeams >= 2 && (inv ? s.weekLowRank : s.weekRank) <= TOP_N ? 1 : 0), int, inv ? "Bottom-3 scores" : "Top-3 scores"),
  "top-half-scores": (_d, c, inv) => milestone(c, 25, (s) => (s.weekTeams >= 2 && (inv ? s.weekLowRank : s.weekRank) <= s.weekTeams / 2 ? 1 : 0), int, inv ? "Bottom-half weeks" : "Top-half weeks"),
};

const COMPUTERS: Record<string, Record<string, Computer>> = {
  league: LEAGUE,
  season: SEASON,
  matchup: MATCHUP,
  "draft-transactions": DRAFT,
  roster: ROSTER,
  streaks: STREAKS,
  milestones: MILESTONES,
};

/** For tests: whether a record page has a calculation behind it */
export function hasComputer(categoryId: string, recordId: string): boolean {
  return !!COMPUTERS[categoryId]?.[recordId];
}
