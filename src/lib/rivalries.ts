import { prisma } from "./db";
import type { EraScope } from "./records";

export interface Game {
  matchupId: string;
  year: number;
  week: number;
  isPlayoff: boolean;
  aScore: number;
  bScore: number;
}

async function loadGames(leagueId: string, scope: EraScope) {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  return prisma.matchup.findMany({
    where: { status: "COMPLETED", homeScore: { not: null }, awayScore: { not: null }, week: { season: seasonWhere } },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      week: { select: { weekNumber: true, isPlayoff: true, season: { select: { year: true, playoffStartWeek: true } } } },
      homeTeam: { select: { member: { select: { id: true, displayName: true } } } },
      awayTeam: { select: { member: { select: { id: true, displayName: true } } } },
    },
  });
}

const playoff = (w: { weekNumber: number; isPlayoff: boolean; season: { playoffStartWeek: number | null } }) =>
  w.isPlayoff || (w.season.playoffStartWeek != null && w.weekNumber >= w.season.playoffStartWeek);

export interface GridCell {
  wins: number;
  losses: number;
  ties: number;
  games: number;
}

/** Head-to-head record for every pair of managers. cells[a][b] is a's record vs b. */
export async function getRivalryGrid(leagueId: string, scope: EraScope = {}) {
  const games = await loadGames(leagueId, scope);
  const names = new Map<string, string>();
  const cells = new Map<string, Map<string, GridCell>>();
  const cell = (a: string, b: string) => {
    let row = cells.get(a);
    if (!row) cells.set(a, (row = new Map()));
    let c = row.get(b);
    if (!c) row.set(b, (c = { wins: 0, losses: 0, ties: 0, games: 0 }));
    return c;
  };
  const totals = new Map<string, number>();
  for (const g of games) {
    const a = g.homeTeam.member, b = g.awayTeam.member;
    if (a.id === b.id) continue;
    names.set(a.id, a.displayName);
    names.set(b.id, b.displayName);
    const ca = cell(a.id, b.id), cb = cell(b.id, a.id);
    ca.games++; cb.games++;
    if (g.homeScore! > g.awayScore!) { ca.wins++; cb.losses++; }
    else if (g.awayScore! > g.homeScore!) { cb.wins++; ca.losses++; }
    else { ca.ties++; cb.ties++; }
    totals.set(a.id, (totals.get(a.id) ?? 0) + 1);
    totals.set(b.id, (totals.get(b.id) ?? 0) + 1);
  }
  const members = [...names.entries()]
    .map(([id, name]) => ({ id, name, games: totals.get(id) ?? 0 }))
    .sort((x, y) => y.games - x.games || x.name.localeCompare(y.name));

  // Headline rivalries
  const pairs: { a: { id: string; name: string }; b: { id: string; name: string }; c: GridCell }[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const c = cells.get(members[i].id)?.get(members[j].id);
      if (c && c.games) pairs.push({ a: members[i], b: members[j], c });
    }
  }
  const minGames = Math.max(3, Math.floor(Math.max(0, ...pairs.map((p) => p.c.games)) / 2));
  const mostLopsided = pairs
    .filter((p) => p.c.games >= minGames)
    .sort((x, y) => Math.abs(y.c.wins - y.c.losses) / y.c.games - Math.abs(x.c.wins - x.c.losses) / x.c.games)
    .slice(0, 4)
    .map((p) => (p.c.wins >= p.c.losses ? p : { a: p.b, b: p.a, c: cells.get(p.b.id)!.get(p.a.id)! }));
  const mostEven = pairs
    .filter((p) => p.c.games >= minGames)
    .sort((x, y) => Math.abs(x.c.wins - x.c.losses) - Math.abs(y.c.wins - y.c.losses) || y.c.games - x.c.games)
    .slice(0, 4);
  const mostPlayed = [...pairs].sort((x, y) => y.c.games - x.c.games).slice(0, 4);

  return {
    members,
    get: (a: string, b: string) => cells.get(a)?.get(b) ?? null,
    mostLopsided,
    mostEven,
    mostPlayed,
  };
}

/** Full series between two managers, oldest first, from a's point of view. */
export async function getRivalry(leagueId: string, aId: string, bId: string, scope: EraScope = {}) {
  const [a, b] = await Promise.all([
    prisma.member.findFirst({ where: { id: aId, leagueId }, select: { id: true, displayName: true } }),
    prisma.member.findFirst({ where: { id: bId, leagueId }, select: { id: true, displayName: true } }),
  ]);
  if (!a || !b) return null;
  const all = await loadGames(leagueId, scope);
  const games: Game[] = all
    .filter((g) => {
      const h = g.homeTeam.member.id, w = g.awayTeam.member.id;
      return (h === aId && w === bId) || (h === bId && w === aId);
    })
    .map((g) => {
      const aHome = g.homeTeam.member.id === aId;
      return {
        matchupId: g.id,
        year: g.week.season.year,
        week: g.week.weekNumber,
        isPlayoff: playoff(g.week),
        aScore: aHome ? g.homeScore! : g.awayScore!,
        bScore: aHome ? g.awayScore! : g.homeScore!,
      };
    })
    .sort((x, y) => x.year - y.year || x.week - y.week);

  let aw = 0, bw = 0, t = 0, aPts = 0, bPts = 0;
  for (const g of games) {
    aPts += g.aScore; bPts += g.bScore;
    if (g.aScore > g.bScore) aw++; else if (g.bScore > g.aScore) bw++; else t++;
  }

  // Current streak
  let streak = 0;
  let streakHolder: "a" | "b" | null = null;
  for (let i = games.length - 1; i >= 0; i--) {
    const w = games[i].aScore > games[i].bScore ? "a" : games[i].bScore > games[i].aScore ? "b" : null;
    if (!w) break;
    if (streakHolder == null) streakHolder = w;
    if (w !== streakHolder) break;
    streak++;
  }

  const byMargin = (side: "a" | "b") =>
    games
      .filter((g) => (side === "a" ? g.aScore > g.bScore : g.bScore > g.aScore))
      .sort((x, y) => Math.abs(y.aScore - y.bScore) - Math.abs(x.aScore - x.bScore))[0] ?? null;

  const bySeason = new Map<number, { year: number; a: number; b: number }>();
  for (const g of games) {
    const s = bySeason.get(g.year) ?? { year: g.year, a: 0, b: 0 };
    if (g.aScore > g.bScore) s.a++; else if (g.bScore > g.aScore) s.b++;
    bySeason.set(g.year, s);
  }

  const closest = [...games].sort((x, y) => Math.abs(x.aScore - x.bScore) - Math.abs(y.aScore - y.bScore))[0] ?? null;

  return {
    a: { id: a.id, name: a.displayName },
    b: { id: b.id, name: b.displayName },
    games,
    record: { a: aw, b: bw, ties: t },
    points: { a: aPts, b: bPts },
    avgMargin: games.length ? Math.abs(aPts - bPts) / games.length : 0,
    streak: streakHolder ? { holder: streakHolder, length: streak } : null,
    biggestWin: { a: byMargin("a"), b: byMargin("b") },
    closest,
    playoffGames: games.filter((g) => g.isPlayoff),
    bySeason: [...bySeason.values()],
  };
}
