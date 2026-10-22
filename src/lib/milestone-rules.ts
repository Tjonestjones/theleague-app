// Milestone rules: which round numbers count, and how to tell whether a
// player has reached one or is close. Pure functions, no database access,
// so they can be unit-tested (tests/milestone-rules.test.mts).

export interface SeasonLine {
  season: number;
  games: number;
  passingYards: number;
  passingTds: number;
  rushingYards: number;
  rushingTds: number;
  receptions: number;
  receivingYards: number;
  receivingTds: number;
  fgMade: number;
}

export interface Milestone {
  key: string;
  label: string; // "receiving yards"
  value: number; // career total so far
  /** Highest round number reached, and the season it was crossed */
  reached: { threshold: number; season: number | null } | null;
  /** Next round number still ahead */
  next: { threshold: number; remaining: number; gamesAway: number | null } | null;
  /** Close enough to call out: active and within a few games of `next` */
  near: boolean;
  /** Crossed a round number during the current season */
  reachedThisSeason: boolean;
}

// A player is "near" when he should get there within this many games at his
// current rate
export const NEAR_GAMES = 4;

interface Def {
  key: string;
  label: string;
  positions: string[];
  thresholds: number[];
  get: (s: SeasonLine) => number;
}

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

export const NFL_MILESTONES: Def[] = [
  { key: "passYds", label: "passing yards", positions: ["QB"], thresholds: range(5000, 80000, 5000), get: (s) => s.passingYards },
  { key: "passTd", label: "passing TDs", positions: ["QB"], thresholds: [25, ...range(50, 650, 50)], get: (s) => s.passingTds },
  { key: "rushYds", label: "rushing yards", positions: ["RB", "QB"], thresholds: [1000, ...range(2500, 20000, 2500)], get: (s) => s.rushingYards },
  { key: "rushTd", label: "rushing TDs", positions: ["RB"], thresholds: [10, ...range(25, 175, 25)], get: (s) => s.rushingTds },
  { key: "rec", label: "receptions", positions: ["WR", "TE", "RB"], thresholds: [100, ...range(250, 1500, 250)], get: (s) => s.receptions },
  { key: "recYds", label: "receiving yards", positions: ["WR", "TE", "RB"], thresholds: [1000, ...range(2500, 22500, 2500)], get: (s) => s.receivingYards },
  { key: "recTd", label: "receiving TDs", positions: ["WR", "TE"], thresholds: [10, ...range(25, 200, 25)], get: (s) => s.receivingTds },
  { key: "scrimYds", label: "scrimmage yards", positions: ["RB"], thresholds: range(2500, 25000, 2500), get: (s) => s.rushingYards + s.receivingYards },
  { key: "totalTd", label: "total TDs", positions: ["RB", "WR", "TE"], thresholds: [25, ...range(50, 200, 25)], get: (s) => s.rushingTds + s.receivingTds },
  { key: "fg", label: "field goals", positions: ["K"], thresholds: range(100, 700, 100), get: (s) => s.fgMade },
];

// Count of big individual seasons, e.g. "5th 1,000-yard receiving season"
export const SEASON_MILESTONES: (Def & { per: number; perLabel: string })[] = [
  { key: "pass4k", label: "4,000-yard passing seasons", perLabel: "4,000 passing yards", positions: ["QB"], thresholds: range(1, 20, 1), per: 4000, get: (s) => s.passingYards },
  { key: "rush1k", label: "1,000-yard rushing seasons", perLabel: "1,000 rushing yards", positions: ["RB"], thresholds: range(1, 20, 1), per: 1000, get: (s) => s.rushingYards },
  { key: "rec1k", label: "1,000-yard receiving seasons", perLabel: "1,000 receiving yards", positions: ["WR", "TE"], thresholds: range(1, 20, 1), per: 1000, get: (s) => s.receivingYards },
];

const REGULAR_SEASON_GAMES = 17;

/**
 * Career milestones for one player.
 * `currentSeason` is the latest season with published stats; a player with no
 * games that season is treated as inactive and never "near".
 */
export function computeNflMilestones(position: string, seasons: SeasonLine[], currentSeason: number): Milestone[] {
  const lines = [...seasons].sort((a, b) => a.season - b.season);
  if (!lines.length) return [];
  const cur = lines.find((s) => s.season === currentSeason && s.games > 0) ?? null;
  const last = lines[lines.length - 1];
  const out: Milestone[] = [];

  for (const def of NFL_MILESTONES) {
    if (!def.positions.includes(position)) continue;
    const total = lines.reduce((n, s) => n + def.get(s), 0);
    if (total < def.thresholds[0] * 0.4) continue; // not a meaningful stat for him

    // Season each round number was crossed
    let running = 0;
    let reached: Milestone["reached"] = null;
    let reachedThisSeason = false;
    for (const s of lines) {
      const before = running;
      running += def.get(s);
      for (const t of def.thresholds) {
        if (before < t && running >= t) {
          reached = { threshold: t, season: s.season };
          if (s.season === currentSeason) reachedThisSeason = true;
        }
      }
    }

    const nextT = def.thresholds.find((t) => t > total);
    let next: Milestone["next"] = null;
    let near = false;
    if (nextT !== undefined) {
      // Rate: this season if he's played 2+ games, else his last season
      const basis = cur && cur.games >= 2 ? cur : last;
      const rate = basis.games > 0 ? def.get(basis) / basis.games : 0;
      const remaining = nextT - total;
      const gamesAway = cur && rate > 0 ? Math.ceil(remaining / rate) : null;
      next = { threshold: nextT, remaining, gamesAway };
      near = gamesAway !== null && gamesAway <= NEAR_GAMES;
    }
    out.push({ key: def.key, label: def.label, value: total, reached, next, near, reachedThisSeason });
  }

  for (const def of SEASON_MILESTONES) {
    if (!def.positions.includes(position)) continue;
    const big = lines.filter((s) => def.get(s) >= def.per);
    const best = Math.max(...lines.map(def.get));
    if (!big.length && best < def.per * 0.6) continue;
    const count = big.length;
    const reached = count ? { threshold: count, season: big[big.length - 1].season } : null;
    const reachedThisSeason = !!cur && def.get(cur) >= def.per;

    let next: Milestone["next"] = null;
    let near = false;
    if (cur && !reachedThisSeason) {
      // Still possible this season: how many games at his current pace
      const rate = cur.games > 0 ? def.get(cur) / cur.games : 0;
      const remaining = def.per - def.get(cur);
      const gamesAway = rate > 0 ? Math.ceil(remaining / rate) : null;
      const gamesLeft = Math.max(0, REGULAR_SEASON_GAMES - cur.games);
      next = { threshold: count + 1, remaining, gamesAway };
      near = gamesAway !== null && gamesAway <= Math.min(NEAR_GAMES, gamesLeft);
    }
    out.push({ key: def.key, label: def.label, value: count, reached, next, near, reachedThisSeason });
  }
  return out;
}

// ── League milestones ───────────────────────────────────────────────────────

export interface LeagueTotals {
  starterPoints: number | null; // null = no weekly roster data for this league
  starts: number | null;
  weeksRostered: number | null;
  currentSeasonPointsPerStart: number | null;
  rosteredNow: boolean;
  managers: number;
  drafted: number;
  moves: number;
}

const LEAGUE_DEFS: { key: string; label: string; thresholds: number[]; get: (t: LeagueTotals) => number | null }[] = [
  { key: "starterPoints", label: "fantasy points in starting lineups", thresholds: [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000], get: (t) => t.starterPoints },
  { key: "starts", label: "starts", thresholds: [10, 25, 50, 75, 100, 125, 150, 200], get: (t) => t.starts },
  { key: "weeksRostered", label: "weeks on a roster", thresholds: [25, 50, 75, 100, 150, 200], get: (t) => t.weeksRostered },
  { key: "managers", label: "managers have rostered him", thresholds: [3, 5, 7, 10, 12], get: (t) => t.managers },
  { key: "drafted", label: "times drafted", thresholds: [3, 5, 7, 10], get: (t) => t.drafted },
  { key: "moves", label: "transactions", thresholds: [10, 15, 20, 25, 30], get: (t) => t.moves },
];

export function computeLeagueMilestones(t: LeagueTotals): Milestone[] {
  const out: Milestone[] = [];
  for (const def of LEAGUE_DEFS) {
    const value = def.get(t);
    if (value === null || value <= 0) continue;
    const reachedT = [...def.thresholds].reverse().find((x) => x <= value) ?? null;
    const nextT = def.thresholds.find((x) => x > value);
    let next: Milestone["next"] = null;
    let near = false;
    if (nextT !== undefined) {
      const remaining = nextT - value;
      let gamesAway: number | null = null;
      if (t.rosteredNow) {
        if (def.key === "starterPoints" && t.currentSeasonPointsPerStart) gamesAway = Math.ceil(remaining / t.currentSeasonPointsPerStart);
        if (def.key === "starts" || def.key === "weeksRostered") gamesAway = remaining;
      }
      next = { threshold: nextT, remaining, gamesAway };
      near = gamesAway !== null && gamesAway <= 3;
    }
    if (!reachedT && !near) continue; // nothing to say yet
    out.push({
      key: def.key,
      label: def.label,
      value,
      reached: reachedT ? { threshold: reachedT, season: null } : null,
      next,
      near,
      reachedThisSeason: false,
    });
  }
  return out;
}

export function formatThreshold(n: number) {
  return n.toLocaleString("en-US");
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
