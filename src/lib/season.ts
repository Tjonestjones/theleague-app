import { prisma } from "./db";

// ─────────────────────────────────────────────────────────────────────────────
// Season detail: regular-season standings, all-play, weekly scores, playoffs
// ─────────────────────────────────────────────────────────────────────────────

export interface SeasonTeamRow {
  teamId: string;
  teamName: string;
  memberId: string;
  memberName: string;
  seed: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  ppg: number;
  allPlayWins: number;
  allPlayLosses: number;
  /** Sum over weeks of (teams outscored ÷ opponents). */
  expectedWins: number;
  /** wins − expectedWins */
  luck: number;
  finish: "Champion" | "Runner-up" | "Semifinal" | "Quarterfinal" | "Playoffs" | "Missed playoffs";
  weekly: (number | null)[];
}

export interface BracketGame {
  matchupId: string;
  week: number;
  round: string;
  home: { teamId: string; teamName: string; memberName: string; seed: number; score: number | null };
  away: { teamId: string; teamName: string; memberName: string; seed: number; score: number | null };
  winnerTeamId: string | null;
}

export interface SeasonFact {
  label: string;
  value: string;
  detail: string;
  href?: string;
}

export interface SeasonDetail {
  seasonId: string;
  year: number;
  platform: string | null;
  numTeams: number;
  regularSeasonWeeks: number[];
  playoffStartWeek: number | null;
  teams: SeasonTeamRow[];
  bracket: BracketGame[][];
  champion: SeasonTeamRow | null;
  runnerUp: SeasonTeamRow | null;
  finalScore: string | null;
  leagueAvg: number;
  facts: SeasonFact[];
}

const isDecided = (h: number | null, a: number | null): h is number => h != null && a != null;

export async function getSeasonDetail(leagueId: string, year: number): Promise<SeasonDetail | null> {
  const season = await prisma.season.findUnique({
    where: { leagueId_year: { leagueId, year } },
    include: {
      teams: { include: { member: { select: { id: true, displayName: true } } } },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: { matchups: true },
      },
    },
  });
  if (!season) return null;

  const playoffStart =
    season.playoffStartWeek ??
    season.weeks.find((w) => w.isPlayoff)?.weekNumber ??
    null;
  const isPlayoffWeek = (w: { weekNumber: number; isPlayoff: boolean }) =>
    w.isPlayoff || (playoffStart != null && w.weekNumber >= playoffStart);

  const regWeeks = season.weeks.filter((w) => !isPlayoffWeek(w) && w.matchups.length > 0);
  const poWeeks = season.weeks.filter((w) => isPlayoffWeek(w) && w.matchups.length > 0);
  const weekNums = regWeeks.map((w) => w.weekNumber);

  const rows = new Map<string, SeasonTeamRow>();
  for (const t of season.teams) {
    rows.set(t.id, {
      teamId: t.id, teamName: t.name, memberId: t.member.id, memberName: t.member.displayName,
      seed: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, ppg: 0,
      allPlayWins: 0, allPlayLosses: 0, expectedWins: 0, luck: 0, finish: "Missed playoffs",
      weekly: weekNums.map(() => null),
    });
  }

  // Regular season results + all-play
  regWeeks.forEach((w, wi) => {
    const scores: { teamId: string; score: number }[] = [];
    for (const m of w.matchups) {
      if (!isDecided(m.homeScore, m.awayScore)) continue;
      const h = rows.get(m.homeTeamId);
      const a = rows.get(m.awayTeamId);
      if (!h || !a) continue;
      const hs = m.homeScore, as = m.awayScore!;
      h.pointsFor += hs; h.pointsAgainst += as; a.pointsFor += as; a.pointsAgainst += hs;
      h.weekly[wi] = hs; a.weekly[wi] = as;
      if (hs > as) { h.wins++; a.losses++; } else if (as > hs) { a.wins++; h.losses++; } else { h.ties++; a.ties++; }
      scores.push({ teamId: h.teamId, score: hs }, { teamId: a.teamId, score: as });
    }
    const n = scores.length;
    for (const s of scores) {
      const beat = scores.filter((o) => o.score < s.score).length;
      const lost = scores.filter((o) => o.score > s.score).length;
      const r = rows.get(s.teamId)!;
      r.allPlayWins += beat;
      r.allPlayLosses += lost;
      if (n > 1) r.expectedWins += beat / (n - 1);
    }
  });

  const teams = [...rows.values()];
  for (const r of teams) {
    const g = r.wins + r.losses + r.ties;
    r.ppg = g ? r.pointsFor / g : 0;
    r.luck = r.wins + r.ties * 0.5 - r.expectedWins;
  }
  teams.sort((a, b) => b.wins + b.ties * 0.5 - (a.wins + a.ties * 0.5) || b.pointsFor - a.pointsFor);
  teams.forEach((t, i) => (t.seed = i + 1));

  // Playoff bracket: walk back from the championship game.
  const bracket = buildBracket(poWeeks, rows);
  const final = bracket.at(-1)?.[0] ?? null;
  let champion: SeasonTeamRow | null = null;
  let runnerUp: SeasonTeamRow | null = null;
  let finalScore: string | null = null;
  if (final && final.winnerTeamId) {
    champion = rows.get(final.winnerTeamId) ?? null;
    const loserId = final.home.teamId === final.winnerTeamId ? final.away.teamId : final.home.teamId;
    runnerUp = rows.get(loserId) ?? null;
    const w = final.home.teamId === final.winnerTeamId ? final.home : final.away;
    const l = final.home.teamId === final.winnerTeamId ? final.away : final.home;
    finalScore = `${w.score?.toFixed(2)}–${l.score?.toFixed(2)}`;
  }
  const roundsFromEnd = bracket.length;
  bracket.forEach((games, ri) => {
    const fromEnd = roundsFromEnd - ri; // 1 = final
    for (const g of games) {
      for (const side of [g.home, g.away]) {
        const r = rows.get(side.teamId);
        if (!r) continue;
        if (r.finish === "Missed playoffs") r.finish = "Playoffs";
        if (g.winnerTeamId && g.winnerTeamId !== side.teamId) {
          r.finish = fromEnd === 1 ? "Runner-up" : fromEnd === 2 ? "Semifinal" : fromEnd === 3 ? "Quarterfinal" : "Playoffs";
        }
      }
    }
  });
  // Teams with a first-round bye show up first in round 2.
  if (champion) champion.finish = "Champion";

  const totalGames = teams.reduce((s, t) => s + t.wins + t.losses + t.ties, 0);
  const leagueAvg = totalGames ? teams.reduce((s, t) => s + t.pointsFor, 0) / totalGames : 0;

  return {
    seasonId: season.id,
    year: season.year,
    platform: season.platform,
    numTeams: season.teams.length,
    regularSeasonWeeks: weekNums,
    playoffStartWeek: playoffStart,
    teams,
    bracket,
    champion,
    runnerUp,
    finalScore,
    leagueAvg,
    facts: seasonFacts(leagueId, year, regWeeks, rows, teams),
  };
}

type WeekWithMatchups = Awaited<ReturnType<typeof prisma.week.findMany<{ include: { matchups: true } }>>>[number];

function buildBracket(poWeeks: WeekWithMatchups[], rows: Map<string, SeasonTeamRow>): BracketGame[][] {
  if (poWeeks.length === 0) return [];
  const winnerOf = (m: WeekWithMatchups["matchups"][number]) =>
    !isDecided(m.homeScore, m.awayScore) ? null : m.homeScore > m.awayScore! ? m.homeTeamId : m.awayScore! > m.homeScore ? m.awayTeamId : null;

  const seedOf = (id: string) => rows.get(id)?.seed ?? 99;
  const rounds: WeekWithMatchups["matchups"][] = [];

  // Championship: in the last playoff week, prefer the game whose teams both
  // won the week before (if there was one), then the best combined seed.
  const last = poWeeks[poWeeks.length - 1];
  const prev = poWeeks.length > 1 ? poWeeks[poWeeks.length - 2] : null;
  const prevWinners = new Set(prev ? prev.matchups.map(winnerOf).filter((x): x is string => !!x) : []);
  const finalGame = [...last.matchups].sort((a, b) => {
    const qa = (prevWinners.has(a.homeTeamId) ? 1 : 0) + (prevWinners.has(a.awayTeamId) ? 1 : 0);
    const qb = (prevWinners.has(b.homeTeamId) ? 1 : 0) + (prevWinners.has(b.awayTeamId) ? 1 : 0);
    return qb - qa || seedOf(a.homeTeamId) + seedOf(a.awayTeamId) - (seedOf(b.homeTeamId) + seedOf(b.awayTeamId));
  })[0];
  if (!finalGame) return [];
  rounds.unshift([finalGame]);

  let alive = new Set([finalGame.homeTeamId, finalGame.awayTeamId]);
  for (let i = poWeeks.length - 2; i >= 0; i--) {
    const games = poWeeks[i].matchups.filter((m) => {
      const w = winnerOf(m);
      return w != null && alive.has(w);
    });
    if (games.length === 0) break;
    rounds.unshift(games);
    const next = new Set<string>();
    for (const id of alive) {
      const played = games.some((g) => g.homeTeamId === id || g.awayTeamId === id);
      if (!played) next.add(id); // bye
    }
    for (const g of games) { next.add(g.homeTeamId); next.add(g.awayTeamId); }
    alive = next;
  }

  const names = ["Final", "Semifinals", "Quarterfinals", "First round"];
  return rounds.map((games, ri) => {
    const fromEnd = rounds.length - 1 - ri;
    const label = names[fromEnd] ?? `Round ${ri + 1}`;
    const week = poWeeks.find((w) => w.matchups.some((m) => m.id === games[0].id))?.weekNumber ?? 0;
    return games
      .map((m) => {
        const side = (id: string, score: number | null) => {
          const r = rows.get(id);
          return { teamId: id, teamName: r?.teamName ?? "—", memberName: r?.memberName ?? "", seed: r?.seed ?? 0, score };
        };
        const h = side(m.homeTeamId, m.homeScore);
        const a = side(m.awayTeamId, m.awayScore);
        const [top, bottom] = h.seed <= a.seed ? [h, a] : [a, h];
        return { matchupId: m.id, week, round: label, home: top, away: bottom, winnerTeamId: winnerOf(m) };
      })
      .sort((x, y) => Math.min(x.home.seed, x.away.seed) - Math.min(y.home.seed, y.away.seed));
  });
}

function seasonFacts(
  leagueId: string,
  year: number,
  regWeeks: WeekWithMatchups[],
  rows: Map<string, SeasonTeamRow>,
  teams: SeasonTeamRow[],
): SeasonFact[] {
  const facts: SeasonFact[] = [];
  const base = `/dashboard/leagues/${leagueId}`;
  type G = { id: string; week: number; hi: SeasonTeamRow; lo: SeasonTeamRow; hs: number; ls: number };
  const games: G[] = [];
  const scores: { r: SeasonTeamRow; s: number; week: number; id: string }[] = [];
  for (const w of regWeeks) {
    for (const m of w.matchups) {
      if (!isDecided(m.homeScore, m.awayScore)) continue;
      const h = rows.get(m.homeTeamId), a = rows.get(m.awayTeamId);
      if (!h || !a) continue;
      scores.push({ r: h, s: m.homeScore, week: w.weekNumber, id: m.id }, { r: a, s: m.awayScore!, week: w.weekNumber, id: m.id });
      const homeWon = m.homeScore >= m.awayScore!;
      games.push({ id: m.id, week: w.weekNumber, hi: homeWon ? h : a, lo: homeWon ? a : h, hs: Math.max(m.homeScore, m.awayScore!), ls: Math.min(m.homeScore, m.awayScore!) });
    }
  }
  if (scores.length === 0) return facts;

  const high = scores.reduce((x, y) => (y.s > x.s ? y : x));
  const low = scores.reduce((x, y) => (y.s < x.s ? y : x));
  facts.push({ label: "Highest score", value: high.s.toFixed(2), detail: `${high.r.memberName} · Week ${high.week}`, href: `${base}/matchups/${high.id}` });
  facts.push({ label: "Lowest score", value: low.s.toFixed(2), detail: `${low.r.memberName} · Week ${low.week}`, href: `${base}/matchups/${low.id}` });

  const blowout = games.reduce((x, y) => (y.hs - y.ls > x.hs - x.ls ? y : x));
  const closest = games.reduce((x, y) => (y.hs - y.ls < x.hs - x.ls ? y : x));
  facts.push({ label: "Biggest blowout", value: (blowout.hs - blowout.ls).toFixed(2), detail: `${blowout.hi.memberName} over ${blowout.lo.memberName} · Week ${blowout.week}`, href: `${base}/matchups/${blowout.id}` });
  facts.push({ label: "Closest game", value: (closest.hs - closest.ls).toFixed(2), detail: `${closest.hi.memberName} over ${closest.lo.memberName} · Week ${closest.week}`, href: `${base}/matchups/${closest.id}` });

  const bestAllPlay = [...teams].sort((a, b) => b.allPlayWins - a.allPlayWins)[0];
  facts.push({ label: "Best all-play record", value: `${bestAllPlay.allPlayWins}-${bestAllPlay.allPlayLosses}`, detail: `${bestAllPlay.memberName} · finished ${bestAllPlay.seed}${ordinal(bestAllPlay.seed)}` });

  const luckiest = [...teams].sort((a, b) => b.luck - a.luck)[0];
  const unluckiest = [...teams].sort((a, b) => a.luck - b.luck)[0];
  facts.push({ label: "Luckiest", value: signed(luckiest.luck), detail: `${luckiest.memberName} · ${luckiest.wins} wins vs ${luckiest.expectedWins.toFixed(1)} expected` });
  facts.push({ label: "Unluckiest", value: signed(unluckiest.luck), detail: `${unluckiest.memberName} · ${unluckiest.wins} wins vs ${unluckiest.expectedWins.toFixed(1)} expected` });

  const unluckyLoss = games.reduce((x, y) => (y.ls > x.ls ? y : x));
  facts.push({ label: "Most points in a loss", value: unluckyLoss.ls.toFixed(2), detail: `${unluckyLoss.lo.memberName} lost to ${unluckyLoss.hi.memberName} · Week ${unluckyLoss.week}`, href: `${base}/matchups/${unluckyLoss.id}` });

  void year;
  return facts;
}

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};
export const signed = (n: number, d = 2) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(d)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Matchups
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeekMatchups(leagueId: string, year: number, week: number) {
  return prisma.matchup.findMany({
    where: { week: { weekNumber: week, season: { leagueId, year } } },
    include: {
      week: { select: { weekNumber: true, isPlayoff: true } },
      homeTeam: { select: { id: true, name: true, member: { select: { id: true, displayName: true } } } },
      awayTeam: { select: { id: true, name: true, member: { select: { id: true, displayName: true } } } },
    },
  });
}

export interface LineupSlot {
  slot: string;
  playerId: string;
  name: string;
  position: string;
  nflTeam: string | null;
  points: number;
}

export interface MatchupSide {
  teamId: string;
  teamName: string;
  memberId: string;
  memberName: string;
  score: number | null;
  starters: LineupSlot[];
  bench: LineupSlot[];
  benchPoints: number;
  optimal: number | null;
  optimalMoves: { out: LineupSlot; in: LineupSlot }[];
}

const FLEX_ELIGIBLE: Record<string, string[]> = {
  FLEX: ["RB", "WR", "TE"],
  "RB/WR/TE": ["RB", "WR", "TE"],
  "RB/WR": ["RB", "WR"],
  "WR/TE": ["WR", "TE"],
  OP: ["QB", "RB", "WR", "TE"],
  "QB/RB/WR/TE": ["QB", "RB", "WR", "TE"],
  SUPERFLEX: ["QB", "RB", "WR", "TE"],
};
const eligible = (slot: string, pos: string) => {
  const norm = (p: string) => (p === "DST" || p === "DEF" ? "D/ST" : p);
  if (FLEX_ELIGIBLE[slot]) return FLEX_ELIGIBLE[slot].includes(norm(pos));
  return norm(slot) === norm(pos);
};
export const BENCH_SLOTS = new Set(["BE", "BN", "BENCH", "IR"]);

/** Best possible lineup using the same starting slots, flex slots filled last. */
export function optimalLineup(starters: LineupSlot[], all: LineupSlot[]) {
  const slots = starters.map((s) => s.slot).sort((a, b) => Number(!!FLEX_ELIGIBLE[a]) - Number(!!FLEX_ELIGIBLE[b]));
  const pool = [...all].filter((p) => p.slot !== "IR").sort((a, b) => b.points - a.points);
  const used = new Set<string>();
  let total = 0;
  const chosen: LineupSlot[] = [];
  for (const slot of slots) {
    const p = pool.find((x) => !used.has(x.playerId) && eligible(slot, x.position));
    if (!p) continue;
    used.add(p.playerId);
    total += p.points;
    chosen.push(p);
  }
  const startedIds = new Set(starters.map((s) => s.playerId));
  const ins = chosen.filter((p) => !startedIds.has(p.playerId)).sort((a, b) => b.points - a.points);
  const outs = starters.filter((s) => !used.has(s.playerId)).sort((a, b) => a.points - b.points);
  const moves = ins.map((p, i) => ({ in: p, out: outs[i] })).filter((m) => m.out);
  return { total, moves };
}

export async function getMatchupDetail(leagueId: string, matchupId: string) {
  const m = await prisma.matchup.findUnique({
    where: { id: matchupId },
    include: {
      week: { include: { season: { select: { id: true, year: true, leagueId: true, playoffStartWeek: true } } } },
      homeTeam: { include: { member: { select: { id: true, displayName: true } } } },
      awayTeam: { include: { member: { select: { id: true, displayName: true } } } },
    },
  });
  if (!m || m.week.season.leagueId !== leagueId) return null;
  const weekNumber = m.week.weekNumber;

  const rosters = await prisma.roster.findMany({
    where: { teamId: { in: [m.homeTeamId, m.awayTeamId] }, weekNumber },
    include: { spots: { include: { player: { select: { id: true, name: true, position: true, team: true } } } } },
  });

  const side = (team: typeof m.homeTeam, score: number | null): MatchupSide => {
    const roster = rosters.find((r) => r.teamId === team.id);
    const spots: (LineupSlot & { isStarter: boolean })[] = (roster?.spots ?? []).map((s) => ({
      slot: s.position,
      playerId: s.player.id,
      name: s.player.name,
      position: s.player.position,
      nflTeam: s.player.team,
      points: s.points ?? 0,
      isStarter: s.isStarter && !BENCH_SLOTS.has(s.position),
    }));
    const starters = spots.filter((s) => s.isStarter);
    const bench = spots.filter((s) => !s.isStarter).sort((a, b) => b.points - a.points);
    const opt = starters.length ? optimalLineup(starters, spots) : null;
    return {
      teamId: team.id,
      teamName: team.name,
      memberId: team.member.id,
      memberName: team.member.displayName,
      score,
      starters,
      bench,
      benchPoints: bench.filter((b) => b.slot !== "IR").reduce((s, b) => s + b.points, 0),
      optimal: opt ? opt.total : null,
      optimalMoves: opt ? opt.moves : [],
    };
  };

  // Head-to-head between these two managers before this game
  const prior = await prisma.matchup.findMany({
    where: {
      status: "COMPLETED",
      week: { season: { leagueId } },
      OR: [
        { homeTeam: { memberId: m.homeTeam.memberId }, awayTeam: { memberId: m.awayTeam.memberId } },
        { homeTeam: { memberId: m.awayTeam.memberId }, awayTeam: { memberId: m.homeTeam.memberId } },
      ],
    },
    include: {
      week: { select: { weekNumber: true, season: { select: { year: true } } } },
      homeTeam: { select: { memberId: true } },
    },
  });
  const key = (y: number, w: number) => y * 100 + w;
  const thisKey = key(m.week.season.year, weekNumber);
  let hw = 0, aw = 0, ties = 0;
  const meetings = prior
    .map((p) => {
      const homeIsHomeMgr = p.homeTeam.memberId === m.homeTeam.memberId;
      const hs = homeIsHomeMgr ? p.homeScore : p.awayScore;
      const as = homeIsHomeMgr ? p.awayScore : p.homeScore;
      return { id: p.id, year: p.week.season.year, week: p.week.weekNumber, hs, as, k: key(p.week.season.year, p.week.weekNumber) };
    })
    .sort((a, b) => b.k - a.k);
  for (const g of meetings) {
    if (g.k >= thisKey || g.hs == null || g.as == null) continue;
    if (g.hs > g.as) hw++; else if (g.as > g.hs) aw++; else ties++;
  }

  // Prev / next week for the same home team
  const [prevWeek, nextWeek] = await Promise.all([
    prisma.matchup.findFirst({
      where: { week: { seasonId: m.week.season.id, weekNumber: weekNumber - 1 }, OR: [{ homeTeamId: m.homeTeamId }, { awayTeamId: m.homeTeamId }] },
      select: { id: true },
    }),
    prisma.matchup.findFirst({
      where: { week: { seasonId: m.week.season.id, weekNumber: weekNumber + 1 }, OR: [{ homeTeamId: m.homeTeamId }, { awayTeamId: m.homeTeamId }] },
      select: { id: true },
    }),
  ]);

  const isPlayoff = m.week.isPlayoff || (m.week.season.playoffStartWeek != null && weekNumber >= m.week.season.playoffStartWeek);

  return {
    id: m.id,
    year: m.week.season.year,
    week: weekNumber,
    isPlayoff,
    status: m.status,
    home: side(m.homeTeam, m.homeScore),
    away: side(m.awayTeam, m.awayScore),
    h2hBefore: { homeWins: hw, awayWins: aw, ties },
    meetings: meetings.filter((g) => g.id !== m.id).slice(0, 8),
    prevId: prevWeek?.id ?? null,
    nextId: nextWeek?.id ?? null,
  };
}

export type MatchupDetail = NonNullable<Awaited<ReturnType<typeof getMatchupDetail>>>;
