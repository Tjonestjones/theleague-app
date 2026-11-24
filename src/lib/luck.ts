import { prisma } from "./db";
import type { EraScope } from "./records";
import { BENCH_SLOTS, optimalLineup, type LineupSlot } from "./season";

// ─────────────────────────────────────────────────────────────────────────────
// Regular-season team-weeks: every score with its weekly context.
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamWeek {
  matchupId: string;
  year: number;
  week: number;
  teamId: string;
  memberId: string;
  memberName: string;
  score: number;
  opp: number;
  oppTeamId: string;
  oppMemberId: string;
  oppMemberName: string;
  result: "W" | "L" | "T";
  /** 1 = week's top score */
  rank: number;
  /** teams that played that week */
  n: number;
  oppRank: number;
}

export async function loadTeamWeeks(leagueId: string, scope: EraScope = {}): Promise<TeamWeek[]> {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const ms = await prisma.matchup.findMany({
    where: { status: "COMPLETED", homeScore: { not: null }, awayScore: { not: null }, week: { season: seasonWhere } },
    select: {
      id: true, homeScore: true, awayScore: true, homeTeamId: true, awayTeamId: true,
      week: { select: { weekNumber: true, isPlayoff: true, season: { select: { year: true, playoffStartWeek: true } } } },
      homeTeam: { select: { member: { select: { id: true, displayName: true } } } },
      awayTeam: { select: { member: { select: { id: true, displayName: true } } } },
    },
  });
  const rows: TeamWeek[] = [];
  for (const m of ms) {
    const w = m.week;
    if (w.isPlayoff || (w.season.playoffStartWeek != null && w.weekNumber >= w.season.playoffStartWeek)) continue;
    const h = m.homeScore!, a = m.awayScore!;
    const base = { matchupId: m.id, year: w.season.year, week: w.weekNumber, rank: 0, n: 0, oppRank: 0 };
    rows.push({ ...base, teamId: m.homeTeamId, memberId: m.homeTeam.member.id, memberName: m.homeTeam.member.displayName, score: h, opp: a, oppTeamId: m.awayTeamId, oppMemberId: m.awayTeam.member.id, oppMemberName: m.awayTeam.member.displayName, result: h > a ? "W" : h < a ? "L" : "T" });
    rows.push({ ...base, teamId: m.awayTeamId, memberId: m.awayTeam.member.id, memberName: m.awayTeam.member.displayName, score: a, opp: h, oppTeamId: m.homeTeamId, oppMemberId: m.homeTeam.member.id, oppMemberName: m.homeTeam.member.displayName, result: a > h ? "W" : a < h ? "L" : "T" });
  }
  const byWeek = new Map<string, TeamWeek[]>();
  for (const r of rows) {
    const k = `${r.year}|${r.week}`;
    if (!byWeek.has(k)) byWeek.set(k, []);
    byWeek.get(k)!.push(r);
  }
  for (const wk of byWeek.values()) {
    const scores = wk.map((r) => r.score).sort((x, y) => y - x);
    for (const r of wk) {
      r.n = wk.length;
      r.rank = scores.indexOf(r.score) + 1;
      r.oppRank = scores.indexOf(r.opp) + 1;
    }
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Luck & all-play
// ─────────────────────────────────────────────────────────────────────────────

export interface LuckRow {
  memberId: string;
  memberName: string;
  seasons: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  expectedWins: number;
  luck: number;
  allPlayWins: number;
  allPlayLosses: number;
  pointsFor: number;
  pointsPerWin: number;
  top3Weeks: number;
  top3Losses: number;
  bottomHalfWins: number;
  topHalfLosses: number;
  facedTopScorer: number;
  facedTopExpected: number;
  playoffBerthsEarned: number;
  playoffBerthsActual: number;
}

export interface SeasonLuck {
  year: number;
  memberId: string;
  memberName: string;
  wins: number;
  expectedWins: number;
  luck: number;
  allPlayRank: number;
  seed: number;
  teams: number;
}

export async function getLuckReport(leagueId: string, scope: EraScope = {}) {
  const tw = await loadTeamWeeks(leagueId, scope);
  const rows = new Map<string, LuckRow & { yrs: Set<number> }>();
  const row = (t: TeamWeek) => {
    let r = rows.get(t.memberId);
    if (!r) rows.set(t.memberId, (r = {
      memberId: t.memberId, memberName: t.memberName, seasons: 0, games: 0, wins: 0, losses: 0, ties: 0,
      expectedWins: 0, luck: 0, allPlayWins: 0, allPlayLosses: 0, pointsFor: 0, pointsPerWin: 0,
      top3Weeks: 0, top3Losses: 0, bottomHalfWins: 0, topHalfLosses: 0, facedTopScorer: 0, facedTopExpected: 0,
      playoffBerthsEarned: 0, playoffBerthsActual: 0, yrs: new Set(),
    }));
    return r;
  };

  // Season aggregates for seeds/all-play ranks
  const season = new Map<string, { year: number; memberId: string; memberName: string; wins: number; ties: number; pf: number; exp: number; apw: number }>();

  for (const t of tw) {
    const r = row(t);
    r.yrs.add(t.year);
    r.games++;
    r.pointsFor += t.score;
    if (t.result === "W") r.wins++; else if (t.result === "L") r.losses++; else r.ties++;
    const below = t.n - t.rank; // teams outscored (ties share the higher rank)
    r.allPlayWins += below;
    r.allPlayLosses += t.rank - 1;
    const exp = t.n > 1 ? below / (t.n - 1) : 0;
    r.expectedWins += exp;
    if (t.rank <= 3) { r.top3Weeks++; if (t.result === "L") r.top3Losses++; }
    const half = t.n / 2;
    if (t.rank > half && t.result === "W") r.bottomHalfWins++;
    if (t.rank <= half && t.result === "L") r.topHalfLosses++;
    if (t.oppRank === 1) r.facedTopScorer++;
    if (t.n > 1) r.facedTopExpected += t.rank === 1 ? 0 : 1 / (t.n - 1);

    const k = `${t.year}|${t.memberId}`;
    const s = season.get(k) ?? { year: t.year, memberId: t.memberId, memberName: t.memberName, wins: 0, ties: 0, pf: 0, exp: 0, apw: 0 };
    if (t.result === "W") s.wins++; else if (t.result === "T") s.ties++;
    s.pf += t.score;
    s.exp += exp;
    s.apw += below;
    season.set(k, s);
  }

  // Seeds vs all-play rank per season
  const seasonRows: SeasonLuck[] = [];
  const years = [...new Set([...season.values()].map((s) => s.year))].sort((a, b) => b - a);
  for (const y of years) {
    const list = [...season.values()].filter((s) => s.year === y);
    const bySeed = [...list].sort((a, b) => b.wins + b.ties / 2 - (a.wins + a.ties / 2) || b.pf - a.pf);
    const byAll = [...list].sort((a, b) => b.apw - a.apw || b.pf - a.pf);
    // Playoff line approximated as the top 60% of the league (6 of 10, 7 of 12)
    const cutoff = Math.round(list.length * 0.6);
    for (const s of list) {
      const seed = bySeed.indexOf(s) + 1;
      const allPlayRank = byAll.indexOf(s) + 1;
      seasonRows.push({ year: y, memberId: s.memberId, memberName: s.memberName, wins: s.wins, expectedWins: s.exp, luck: s.wins + s.ties / 2 - s.exp, allPlayRank, seed, teams: list.length });
      const r = rows.get(s.memberId)!;
      if (allPlayRank <= cutoff) r.playoffBerthsEarned++;
      if (seed <= cutoff) r.playoffBerthsActual++;
    }
  }

  const table: LuckRow[] = [...rows.values()].map(({ yrs, ...r }) => ({
    ...r,
    seasons: yrs.size,
    luck: r.wins + r.ties / 2 - r.expectedWins,
    pointsPerWin: r.wins ? r.pointsFor / r.wins : 0,
  }));
  table.sort((a, b) => a.luck - b.luck);

  const collapses = [...seasonRows].map((s) => ({ ...s, drop: s.seed - s.allPlayRank })).sort((a, b) => b.drop - a.drop).slice(0, 6);
  const rises = [...seasonRows].map((s) => ({ ...s, rise: s.allPlayRank - s.seed })).sort((a, b) => b.rise - a.rise).slice(0, 6);

  return { table, seasons: seasonRows, years, collapses, rises };
}

// ─────────────────────────────────────────────────────────────────────────────
// Close games
// ─────────────────────────────────────────────────────────────────────────────

export interface CloseRow {
  memberId: string;
  memberName: string;
  w2: number; l2: number;
  w3: number; l3: number;
  w5: number; l5: number;
  flippable: number;
  losses: number;
}

export interface FlippableLoss {
  matchupId: string;
  year: number;
  week: number;
  memberId: string;
  memberName: string;
  oppName: string;
  score: number;
  opp: number;
  optimal: number;
  bestBench: { name: string; points: number } | null;
}

export async function getCloseGamesReport(leagueId: string, scope: EraScope = {}) {
  const tw = await loadTeamWeeks(leagueId, scope);
  const rows = new Map<string, CloseRow>();
  for (const t of tw) {
    let r = rows.get(t.memberId);
    if (!r) rows.set(t.memberId, (r = { memberId: t.memberId, memberName: t.memberName, w2: 0, l2: 0, w3: 0, l3: 0, w5: 0, l5: 0, flippable: 0, losses: 0 }));
    const m = Math.abs(t.score - t.opp);
    if (t.result === "L") r.losses++;
    if (t.result === "T") continue;
    const won = t.result === "W";
    if (m <= 2) { if (won) r.w2++; else r.l2++; }
    if (m <= 3) { if (won) r.w3++; else r.l3++; }
    if (m <= 5) { if (won) r.w5++; else r.l5++; }
  }

  // Losses a perfect lineup would have won: load lineups for losing team-weeks.
  const losses = tw.filter((t) => t.result === "L");
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const rosters = await prisma.roster.findMany({
    where: { weekNumber: { not: null }, team: { season: seasonWhere } },
    select: {
      teamId: true, weekNumber: true,
      team: { select: { season: { select: { year: true } } } },
      spots: { select: { position: true, isStarter: true, points: true, player: { select: { id: true, name: true, position: true, team: true } } } },
    },
  });
  const byKey = new Map(rosters.map((r) => [`${r.team.season.year}|${r.weekNumber}|${r.teamId}`, r]));
  const flips: FlippableLoss[] = [];
  for (const t of losses) {
    const r = byKey.get(`${t.year}|${t.week}|${t.teamId}`);
    if (!r) continue;
    const spots: (LineupSlot & { started: boolean })[] = r.spots.map((s) => ({
      slot: s.position, playerId: s.player.id, name: s.player.name, position: s.player.position,
      nflTeam: s.player.team, points: s.points ?? 0, started: s.isStarter && !BENCH_SLOTS.has(s.position),
    }));
    const starters = spots.filter((s) => s.started);
    if (!starters.length) continue;
    const opt = optimalLineup(starters, spots);
    if (opt.total > t.opp) {
      rows.get(t.memberId)!.flippable++;
      const bench = spots.filter((s) => !s.started && s.slot !== "IR").sort((a, b) => b.points - a.points)[0];
      flips.push({
        matchupId: t.matchupId, year: t.year, week: t.week, memberId: t.memberId, memberName: t.memberName,
        oppName: t.oppMemberName, score: t.score, opp: t.opp, optimal: opt.total,
        bestBench: bench ? { name: bench.name, points: bench.points } : null,
      });
    }
  }

  const decided = tw.filter((t) => t.result === "W");
  const closest = [...decided].sort((a, b) => a.score - a.opp - (b.score - b.opp)).slice(0, 10);
  const totalGames = decided.length;
  const oneScore = decided.filter((t) => t.score - t.opp <= 3).length;

  return {
    table: [...rows.values()].sort((a, b) => (a.w3 - a.l3) - (b.w3 - b.l3)),
    closest,
    flips: flips.sort((a, b) => a.opp - a.score - (b.opp - b.score)).slice(0, 12),
    totals: { games: totalGames, oneScore, flippable: flips.length, losses: losses.length },
  };
}
