import type { RecapKind } from "@prisma/client";
import { prisma } from "./db";
import { generateText, RECAP_SYSTEM, aiConfig } from "./ai";
import { loadTeamWeeks, type TeamWeek } from "./luck";
import { BENCH_SLOTS, getSeasonDetail, optimalLineup, ordinal, type LineupSlot } from "./season";
import { getTradeLedger, getWaiverReport } from "./activity";

const r1 = (n: number) => Math.round(n * 10) / 10;

// ─────────────────────────────────────────────────────────────────────────────
// Shared loaders
// ─────────────────────────────────────────────────────────────────────────────

interface TeamLineup {
  teamId: string;
  starters: LineupSlot[];
  bench: LineupSlot[];
  optimal: number | null;
  moves: { in: LineupSlot; out: LineupSlot }[];
}

async function weekLineups(leagueId: string, year: number, week: number): Promise<Map<string, TeamLineup>> {
  const rosters = await prisma.roster.findMany({
    where: { weekNumber: week, team: { season: { leagueId, year } } },
    select: {
      teamId: true,
      spots: { select: { position: true, isStarter: true, points: true, player: { select: { id: true, name: true, position: true, team: true } } } },
    },
  });
  const out = new Map<string, TeamLineup>();
  for (const r of rosters) {
    const spots = r.spots.map((s) => ({
      slot: s.position, playerId: s.player.id, name: s.player.name, position: s.player.position,
      nflTeam: s.player.team, points: s.points ?? 0, started: s.isStarter && !BENCH_SLOTS.has(s.position),
    }));
    const starters = spots.filter((s) => s.started);
    const bench = spots.filter((s) => !s.started && s.slot !== "IR").sort((a, b) => b.points - a.points);
    const opt = starters.length ? optimalLineup(starters, spots) : null;
    out.set(r.teamId, { teamId: r.teamId, starters, bench, optimal: opt?.total ?? null, moves: opt?.moves ?? [] });
  }
  return out;
}

function standingsThrough(tw: TeamWeek[], week: number) {
  const rows = new Map<string, { memberId: string; name: string; w: number; l: number; t: number; pf: number; streak: number }>();
  for (const t of [...tw].filter((x) => x.week <= week).sort((a, b) => a.week - b.week)) {
    let r = rows.get(t.memberId);
    if (!r) rows.set(t.memberId, (r = { memberId: t.memberId, name: t.memberName, w: 0, l: 0, t: 0, pf: 0, streak: 0 }));
    r.pf += t.score;
    if (t.result === "W") { r.w++; r.streak = r.streak > 0 ? r.streak + 1 : 1; }
    else if (t.result === "L") { r.l++; r.streak = r.streak < 0 ? r.streak - 1 : -1; }
    else { r.t++; r.streak = 0; }
  }
  return [...rows.values()].sort((a, b) => b.w + b.t / 2 - (a.w + a.t / 2) || b.pf - a.pf);
}

async function weekGames(leagueId: string, year: number, week: number) {
  const ms = await prisma.matchup.findMany({
    where: { week: { weekNumber: week, season: { leagueId, year } } },
    select: {
      id: true, homeScore: true, awayScore: true, status: true, homeTeamId: true, awayTeamId: true,
      week: { select: { isPlayoff: true, season: { select: { playoffStartWeek: true } } } },
      homeTeam: { select: { name: true, member: { select: { id: true, displayName: true } } } },
      awayTeam: { select: { name: true, member: { select: { id: true, displayName: true } } } },
    },
  });
  return ms.map((m) => ({
    matchupId: m.id,
    playoff: m.week.isPlayoff || (m.week.season.playoffStartWeek != null && week >= m.week.season.playoffStartWeek),
    home: { teamId: m.homeTeamId, memberId: m.homeTeam.member.id, name: m.homeTeam.member.displayName, team: m.homeTeam.name, score: m.homeScore },
    away: { teamId: m.awayTeamId, memberId: m.awayTeam.member.id, name: m.awayTeam.member.displayName, team: m.awayTeam.name, score: m.awayScore },
    decided: m.homeScore != null && m.awayScore != null && m.status === "COMPLETED",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Fact packs
// ─────────────────────────────────────────────────────────────────────────────

export async function weeklyFacts(leagueId: string, year: number, week: number) {
  const [games, tw, lineups] = await Promise.all([
    weekGames(leagueId, year, week),
    loadTeamWeeks(leagueId, { years: [year] }),
    weekLineups(leagueId, year, week),
  ]);
  const done = games.filter((g) => g.decided);
  if (!done.length) return null;
  const results = done.map((g) => {
    const hw = g.home.score! >= g.away.score!;
    const w = hw ? g.home : g.away, l = hw ? g.away : g.home;
    return { matchupId: g.matchupId, playoff: g.playoff, winner: w.name, loser: l.name, winnerScore: r1(w.score!), loserScore: r1(l.score!), margin: r1(w.score! - l.score!), winnerId: w.memberId, loserId: l.memberId, winnerTeamId: w.teamId, loserTeamId: l.teamId };
  }).sort((a, b) => b.winnerScore - a.winnerScore);
  const scores = done.flatMap((g) => [{ name: g.home.name, score: g.home.score!, won: g.home.score! > g.away.score! }, { name: g.away.name, score: g.away.score!, won: g.away.score! > g.home.score! }]).sort((a, b) => b.score - a.score);

  const top = [...lineups.entries()].flatMap(([teamId, l]) => l.starters.map((s) => ({ ...s, teamId })))
    .sort((a, b) => b.points - a.points).slice(0, 5);
  const teamName = new Map(done.flatMap((g) => [[g.home.teamId, g.home.name], [g.away.teamId, g.away.name]] as [string, string][]));
  const lostWithBench = results.flatMap((r) => {
    const l = lineups.get(r.loserTeamId);
    if (!l || l.optimal == null || l.optimal <= r.winnerScore) return [];
    return [{ manager: r.loser, lostBy: r.margin, couldHaveScored: r1(l.optimal), benchedStar: l.bench[0] ? `${l.bench[0].name} (${r1(l.bench[0].points)})` : null }];
  });
  const standings = standingsThrough(tw, week);
  const unluckiest = scores.find((s) => !s.won);

  return {
    league: (await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }))?.name ?? "",
    year,
    week,
    playoffs: done.some((g) => g.playoff),
    results,
    highScore: { name: scores[0].name, score: r1(scores[0].score) },
    lowScore: { name: scores.at(-1)!.name, score: r1(scores.at(-1)!.score) },
    highestLosingScore: unluckiest ? { name: unluckiest.name, score: r1(unluckiest.score), weekRank: scores.indexOf(unluckiest) + 1 } : null,
    closest: [...results].sort((a, b) => a.margin - b.margin)[0],
    blowout: [...results].sort((a, b) => b.margin - a.margin)[0],
    topPerformers: top.map((p) => ({ player: p.name, position: p.position, points: r1(p.points), manager: teamName.get(p.teamId) ?? "" })),
    benchCostThemTheGame: lostWithBench,
    standings: standings.map((s, i) => ({ rank: i + 1, manager: s.name, record: `${s.w}-${s.l}${s.t ? `-${s.t}` : ""}`, pointsFor: r1(s.pf), streak: s.streak })),
  };
}
export type WeeklyFacts = NonNullable<Awaited<ReturnType<typeof weeklyFacts>>>;

export async function managerWeekFacts(leagueId: string, year: number, week: number, memberId: string) {
  const [games, tw, lineups, nextGames] = await Promise.all([
    weekGames(leagueId, year, week),
    loadTeamWeeks(leagueId, { years: [year] }),
    weekLineups(leagueId, year, week),
    weekGames(leagueId, year, week + 1),
  ]);
  const g = games.find((x) => x.home.memberId === memberId || x.away.memberId === memberId);
  if (!g || !g.decided) return null;
  const me = g.home.memberId === memberId ? g.home : g.away;
  const opp = g.home.memberId === memberId ? g.away : g.home;
  const l = lineups.get(me.teamId);
  const weekScores = games.filter((x) => x.decided).flatMap((x) => [x.home.score!, x.away.score!]).sort((a, b) => b - a);
  const standings = standingsThrough(tw, week);
  const myRank = standings.findIndex((s) => s.memberId === memberId) + 1;
  const mine = tw.filter((t) => t.memberId === memberId && t.week <= week);
  const exp = mine.reduce((s, t) => s + (t.n > 1 ? (t.n - t.rank) / (t.n - 1) : 0), 0);
  const wins = mine.filter((t) => t.result === "W").length;
  const next = nextGames.find((x) => x.home.memberId === memberId || x.away.memberId === memberId);
  const nextOpp = next ? (next.home.memberId === memberId ? next.away : next.home) : null;

  return {
    year, week, manager: me.name, team: me.team, opponent: opp.name,
    result: me.score! > opp.score! ? "won" : me.score! < opp.score! ? "lost" : "tied",
    score: r1(me.score!), oppScore: r1(opp.score!), margin: r1(Math.abs(me.score! - opp.score!)),
    weekRank: weekScores.indexOf(me.score!) + 1, teams: weekScores.length,
    starters: (l?.starters ?? []).map((s) => ({ slot: s.slot, player: s.name, points: r1(s.points) })),
    bench: (l?.bench ?? []).slice(0, 4).map((s) => ({ player: s.name, points: r1(s.points) })),
    bestPossible: l?.optimal != null ? r1(l.optimal) : null,
    lineupSwaps: (l?.moves ?? []).map((m) => `${m.in.name} (${r1(m.in.points)}) over ${m.out.name} (${r1(m.out.points)})`),
    record: standings[myRank - 1] ? `${standings[myRank - 1].w}-${standings[myRank - 1].l}` : "",
    standing: myRank, of: standings.length,
    seasonLuck: r1(wins - exp),
    nextOpponent: nextOpp?.name ?? null,
  };
}
export type ManagerWeekFacts = NonNullable<Awaited<ReturnType<typeof managerWeekFacts>>>;

export async function seasonStoryFacts(leagueId: string, year: number) {
  const scope = { years: [year] };
  const [d, ledger, waivers] = await Promise.all([
    getSeasonDetail(leagueId, year),
    getTradeLedger(leagueId, scope),
    getWaiverReport(leagueId, scope),
  ]);
  if (!d) return null;
  const bestAllPlay = [...d.teams].sort((a, b) => b.allPlayWins - a.allPlayWins)[0];
  const bigTrade = [...ledger.trades].filter((t) => t.sides.length > 1).sort((a, b) => b.margin - a.margin)[0];
  return {
    year,
    teams: d.numTeams,
    champion: d.champion ? { manager: d.champion.memberName, team: d.champion.teamName, seed: d.champion.seed, record: `${d.champion.wins}-${d.champion.losses}`, allPlayRank: [...d.teams].sort((a, b) => b.allPlayWins - a.allPlayWins).indexOf(d.champion) + 1 } : null,
    runnerUp: d.runnerUp?.memberName ?? null,
    finalScore: d.finalScore,
    standings: d.teams.map((t) => ({ seed: t.seed, manager: t.memberName, team: t.teamName, record: `${t.wins}-${t.losses}`, pointsFor: r1(t.pointsFor), allPlay: `${t.allPlayWins}-${t.allPlayLosses}`, luck: r1(t.luck), finish: t.finish })),
    bestAllPlayTeam: { manager: bestAllPlay.memberName, finish: bestAllPlay.finish, seed: bestAllPlay.seed },
    seasonFacts: d.facts.map((f) => ({ label: f.label, value: f.value, detail: f.detail })),
    playoffRounds: d.bracket.map((round) => round.map((g) => ({
      round: g.round,
      winner: g.winnerTeamId === g.home.teamId ? g.home.memberName : g.away.memberName,
      loser: g.winnerTeamId === g.home.teamId ? g.away.memberName : g.home.memberName,
      score: `${r1(Math.max(g.home.score ?? 0, g.away.score ?? 0))}-${r1(Math.min(g.home.score ?? 0, g.away.score ?? 0))}`,
    }))),
    trades: ledger.trades.length,
    biggestTrade: bigTrade ? { week: bigTrade.week, sides: bigTrade.sides.map((s) => ({ manager: s.memberName, got: s.players.map((p) => p.name), pointsAfter: r1(s.startedPts) })) } : null,
    bestPickup: waivers.bestPickups[0] ? { player: waivers.bestPickups[0].name, manager: waivers.bestPickups[0].memberName, week: waivers.bestPickups[0].week, pointsAfter: r1(waivers.bestPickups[0].startedPts) } : null,
    costliestDrop: waivers.costlyDrops[0] ? { player: waivers.costlyDrops[0].name, droppedBy: waivers.costlyDrops[0].memberName, pointsElsewhere: r1(waivers.costlyDrops[0].elsewherePts) } : null,
    mostActive: waivers.managers[0] ? { manager: waivers.managers[0].memberName, pickups: waivers.managers[0].claims + waivers.managers[0].adds } : null,
  };
}
export type SeasonStoryFacts = NonNullable<Awaited<ReturnType<typeof seasonStoryFacts>>>;

export async function wrappedFacts(leagueId: string, year: number, memberId: string) {
  const scope = { years: [year] };
  const [d, ledger, waivers, tw] = await Promise.all([
    getSeasonDetail(leagueId, year),
    getTradeLedger(leagueId, scope),
    getWaiverReport(leagueId, scope),
    loadTeamWeeks(leagueId, scope),
  ]);
  const me = d?.teams.find((t) => t.memberId === memberId);
  if (!d || !me) return null;

  const rankOf = (key: (t: NonNullable<typeof me>) => number, desc = true) =>
    [...d.teams].sort((a, b) => (desc ? key(b) - key(a) : key(a) - key(b))).findIndex((t) => t.memberId === memberId) + 1;

  // Weekly lineups for this team, for players and efficiency
  const rosters = await prisma.roster.findMany({
    where: { teamId: me.teamId, weekNumber: { in: d.regularSeasonWeeks } },
    select: { weekNumber: true, spots: { select: { position: true, isStarter: true, points: true, player: { select: { id: true, name: true, position: true, team: true } } } } },
  });
  const byPlayer = new Map<string, { name: string; position: string; pts: number; starts: number }>();
  let actual = 0, optimal = 0, perfectWeeks = 0;
  for (const r of rosters) {
    const spots = r.spots.map((s) => ({ slot: s.position, playerId: s.player.id, name: s.player.name, position: s.player.position, nflTeam: s.player.team, points: s.points ?? 0, started: s.isStarter && !BENCH_SLOTS.has(s.position) }));
    const starters = spots.filter((s) => s.started);
    for (const s of starters) {
      const p = byPlayer.get(s.playerId) ?? { name: s.name, position: s.position, pts: 0, starts: 0 };
      p.pts += s.points; p.starts++;
      byPlayer.set(s.playerId, p);
    }
    if (starters.length) {
      const a = starters.reduce((x, s) => x + s.points, 0);
      const o = optimalLineup(starters, spots).total;
      actual += a; optimal += o;
      if (o - a < 0.01) perfectWeeks++;
    }
  }
  const mine = tw.filter((t) => t.memberId === memberId);
  const best = [...mine].sort((a, b) => b.score - a.score)[0];
  const worst = [...mine].sort((a, b) => a.score - b.score)[0];
  const close = mine.filter((t) => Math.abs(t.score - t.opp) <= 5 && t.result !== "T");
  const vs = new Map<string, { name: string; w: number; l: number }>();
  for (const t of mine) {
    const v = vs.get(t.oppMemberId) ?? { name: t.oppMemberName, w: 0, l: 0 };
    if (t.result === "W") v.w++; else if (t.result === "L") v.l++;
    vs.set(t.oppMemberId, v);
  }
  const myTrades = ledger.trades.filter((t) => t.sides.some((s) => s.memberId === memberId));
  const myPickups = waivers.bestPickups.filter((p) => p.memberId === memberId);
  const myPickupsAll = waivers.managers.find((m) => m.memberId === memberId);
  const myDrops = waivers.costlyDrops.filter((p) => p.memberId === memberId);
  const allEff = await leagueEfficiencyRank(leagueId, year, d.regularSeasonWeeks, actual / Math.max(1, optimal));

  return {
    year,
    manager: me.memberName,
    team: me.teamName,
    teams: d.numTeams,
    record: `${me.wins}-${me.losses}${me.ties ? `-${me.ties}` : ""}`,
    seed: me.seed,
    finish: me.finish,
    champion: d.champion?.memberName ?? null,
    pointsFor: r1(me.pointsFor), pointsForRank: rankOf((t) => t.pointsFor),
    pointsAgainst: r1(me.pointsAgainst), pointsAgainstRank: rankOf((t) => t.pointsAgainst),
    allPlay: `${me.allPlayWins}-${me.allPlayLosses}`, allPlayRank: rankOf((t) => t.allPlayWins),
    expectedWins: r1(me.expectedWins), luck: r1(me.luck), luckRank: rankOf((t) => t.luck),
    bestWeek: best ? { week: best.week, score: r1(best.score), opponent: best.oppMemberName, result: best.result, weekRank: best.rank } : null,
    worstWeek: worst ? { week: worst.week, score: r1(worst.score), opponent: worst.oppMemberName, result: worst.result } : null,
    topPlayers: [...byPlayer.values()].sort((a, b) => b.pts - a.pts).slice(0, 5).map((p) => ({ player: p.name, position: p.position, points: r1(p.pts), starts: p.starts })),
    lineupEfficiency: optimal ? r1((actual / optimal) * 100) : null,
    lineupEfficiencyRank: allEff,
    perfectWeeks,
    pointsLeftOnBench: r1(optimal - actual),
    closeGames: `${close.filter((t) => t.result === "W").length}-${close.filter((t) => t.result === "L").length}`,
    favoriteOpponent: [...vs.values()].sort((a, b) => b.w - b.l - (a.w - a.l))[0] ?? null,
    nemesis: [...vs.values()].sort((a, b) => b.l - b.w - (a.l - a.w))[0] ?? null,
    trades: myTrades.map((t) => {
      const mineSide = t.sides.find((s) => s.memberId === memberId)!;
      const other = t.sides.filter((s) => s.memberId !== memberId);
      return { week: t.week, partner: other.map((o) => o.memberName).join(", "), got: mineSide.players.map((p) => p.name), gave: other.flatMap((o) => o.players.map((p) => p.name)), won: t.winnerMemberId === memberId, net: r1(mineSide.startedPts - other.reduce((s, o) => s + o.startedPts, 0)) };
    }),
    pickups: myPickupsAll ? myPickupsAll.claims + myPickupsAll.adds : 0,
    bestPickup: myPickups[0] ? { player: myPickups[0].name, week: myPickups[0].week, pointsAfter: r1(myPickups[0].startedPts) } : null,
    worstDrop: myDrops[0] ? { player: myDrops[0].name, week: myDrops[0].week, pointsElsewhere: r1(myDrops[0].elsewherePts), to: myDrops[0].pickedUpBy.join(", ") } : null,
  };
}
export type WrappedFacts = NonNullable<Awaited<ReturnType<typeof wrappedFacts>>>;

async function leagueEfficiencyRank(leagueId: string, year: number, weeks: number[], mine: number) {
  const rosters = await prisma.roster.findMany({
    where: { weekNumber: { in: weeks }, team: { season: { leagueId, year } } },
    select: { teamId: true, spots: { select: { position: true, isStarter: true, points: true, player: { select: { id: true, name: true, position: true, team: true } } } } },
  });
  const t = new Map<string, { a: number; o: number }>();
  for (const r of rosters) {
    const spots = r.spots.map((s) => ({ slot: s.position, playerId: s.player.id, name: s.player.name, position: s.player.position, nflTeam: s.player.team, points: s.points ?? 0, started: s.isStarter && !BENCH_SLOTS.has(s.position) }));
    const starters = spots.filter((s) => s.started);
    if (!starters.length) continue;
    const e = t.get(r.teamId) ?? { a: 0, o: 0 };
    e.a += starters.reduce((x, s) => x + s.points, 0);
    e.o += optimalLineup(starters, spots).total;
    t.set(r.teamId, e);
  }
  const effs = [...t.values()].map((x) => (x.o ? x.a / x.o : 0)).sort((a, b) => b - a);
  return effs.filter((e) => e > mine + 1e-9).length + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template writers (used when no AI provider is configured)
// ─────────────────────────────────────────────────────────────────────────────

export function weeklyTemplate(f: WeeklyFacts) {
  const lines: string[] = [];
  lines.push(
    `**${f.highScore.name}** put up the week's best score at ${f.highScore.score}, while **${f.lowScore.name}** brought up the rear with ${f.lowScore.score}.` +
      (f.highestLosingScore && f.highestLosingScore.weekRank <= 3
        ? ` The hard-luck story belongs to ${f.highestLosingScore.name}, whose ${f.highestLosingScore.score} was the ${f.highestLosingScore.weekRank}${ordinal(f.highestLosingScore.weekRank)}-best score of the week and still lost.`
        : ""),
  );
  lines.push("## Results");
  lines.push(f.results.map((r) => `- ${r.winner} beat ${r.loser}, ${r.winnerScore}–${r.loserScore}`).join("\n"));
  lines.push(
    `The closest game was ${f.closest.winner} over ${f.closest.loser} by ${f.closest.margin}. The biggest margin was ${f.blowout.winner}'s ${f.blowout.margin}-point win over ${f.blowout.loser}.`,
  );
  if (f.benchCostThemTheGame.length) {
    lines.push("## Left on the bench");
    lines.push(f.benchCostThemTheGame.map((b) => `- ${b.manager} lost by ${b.lostBy} but could have scored ${b.couldHaveScored}${b.benchedStar ? `; ${b.benchedStar} sat on the bench` : ""}.`).join("\n"));
  }
  if (f.topPerformers.length) {
    lines.push("## Top performers");
    lines.push(f.topPerformers.slice(0, 3).map((p) => `- ${p.player} (${p.position}), ${p.points} for ${p.manager}`).join("\n"));
  }
  if (!f.playoffs && f.standings.length) {
    const lead = f.standings[0];
    const hot = f.standings.filter((s) => s.streak >= 3).map((s) => `${s.manager} (${s.streak} straight)`);
    const cold = f.standings.filter((s) => s.streak <= -3).map((s) => `${s.manager} (${-s.streak} straight losses)`);
    lines.push(
      `## Standings\n${lead.manager} leads at ${lead.record}.` +
        (hot.length ? ` On a heater: ${hot.join(", ")}.` : "") +
        (cold.length ? ` Still looking for a win: ${cold.join(", ")}.` : ""),
    );
  }
  return lines.join("\n\n");
}

export function managerWeekTemplate(f: ManagerWeekFacts) {
  const out = [
    `**${f.manager} ${f.result} ${f.score}–${f.oppScore}** against ${f.opponent}. That score ranked ${f.weekRank}${ordinal(f.weekRank)} of ${f.teams} this week.`,
  ];
  if (f.bestPossible != null) {
    out.push(
      f.lineupSwaps.length
        ? `The best possible lineup would have scored ${f.bestPossible}: ${f.lineupSwaps.join("; ")}.`
        : `The lineup was perfect: nobody on the bench would have scored more.`,
    );
  }
  const top = [...f.starters].sort((a, b) => b.points - a.points)[0];
  if (top) out.push(`${top.player} led the way with ${top.points}.`);
  out.push(
    `That leaves ${f.manager} ${f.record}, ${f.standing}${ordinal(f.standing)} of ${f.of}. Season luck so far: ${f.seasonLuck >= 0 ? "+" : ""}${f.seasonLuck} wins against expectation.` +
      (f.nextOpponent ? ` Next up: ${f.nextOpponent}.` : ""),
  );
  return out.join("\n\n");
}

export function seasonStoryTemplate(f: SeasonStoryFacts) {
  const out: string[] = [];
  if (f.champion) {
    out.push(
      `**${f.champion.manager}** won the ${f.year} title as the ${f.champion.seed}${ordinal(f.champion.seed)} seed (${f.champion.record}), beating ${f.runnerUp} ${f.finalScore} in the final.` +
        (f.champion.allPlayRank > 1 ? ` By all-play the champion was only the ${f.champion.allPlayRank}${ordinal(f.champion.allPlayRank)}-best team.` : ` They were also the best team by all-play.`),
    );
  }
  if (f.bestAllPlayTeam && f.champion && f.bestAllPlayTeam.manager !== f.champion.manager) {
    out.push(`The strongest team on paper was ${f.bestAllPlayTeam.manager}, who finished the regular season ${f.bestAllPlayTeam.seed}${ordinal(f.bestAllPlayTeam.seed)} and went out at the ${f.bestAllPlayTeam.finish.toLowerCase()} stage.`);
  }
  const lucky = [...f.standings].sort((a, b) => b.luck - a.luck)[0];
  const unlucky = [...f.standings].sort((a, b) => a.luck - b.luck)[0];
  out.push(`${lucky.manager} ran the luckiest (${lucky.luck >= 0 ? "+" : ""}${lucky.luck} wins over expectation); ${unlucky.manager} the unluckiest (${unlucky.luck}).`);
  const moves: string[] = [];
  if (f.bestPickup) moves.push(`the best pickup was ${f.bestPickup.player}, claimed by ${f.bestPickup.manager} in week ${f.bestPickup.week} and worth ${f.bestPickup.pointsAfter} starter points`);
  if (f.costliestDrop) moves.push(`the costliest drop was ${f.costliestDrop.droppedBy} letting go of ${f.costliestDrop.player}, who scored ${f.costliestDrop.pointsElsewhere} elsewhere`);
  if (moves.length) out.push(`Off the field, ${moves.join(", and ")}. There ${f.trades === 1 ? "was 1 trade" : `were ${f.trades} trades`}.`);
  return out.join("\n\n");
}

export function wrappedTemplate(f: WrappedFacts) {
  return [
    `${f.manager}'s ${f.year}: **${f.record}**, the ${f.seed}${ordinal(f.seed)} seed, finishing as ${f.finish.toLowerCase()}. The team scored ${f.pointsFor} (${f.pointsForRank}${ordinal(f.pointsForRank)} in the league) and faced ${f.pointsAgainst} (${f.pointsAgainstRank}${ordinal(f.pointsAgainstRank)} most).`,
    `By all-play that was a ${f.allPlayRank}${ordinal(f.allPlayRank)}-best team; luck came out at ${f.luck >= 0 ? "+" : ""}${f.luck} wins.` +
      (f.lineupEfficiency != null ? ` Lineups were ${f.lineupEfficiency}% efficient (${f.lineupEfficiencyRank}${ordinal(f.lineupEfficiencyRank)} in the league) with ${f.perfectWeeks} perfect week${f.perfectWeeks === 1 ? "" : "s"}.` : ""),
  ].join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate + store
// ─────────────────────────────────────────────────────────────────────────────

const PROMPTS: Record<RecapKind, (facts: unknown) => string> = {
  WEEKLY: (f) => `Write this week's league recap (250-400 words). Lead with the most interesting storyline, cover every result briefly, call out bench decisions that cost games, and end with where the standings stand. Facts (JSON):\n${JSON.stringify(f)}`,
  MANAGER_WEEKLY: (f) => `Write a personal weekly recap for this one manager (120-200 words), addressed to them in the second person. Cover the result, what worked, the lineup decisions, and what's next. Facts (JSON):\n${JSON.stringify(f)}`,
  SEASON_STORY: (f) => `Write the story of this season (350-550 words) as an outside analyst treating every manager evenly. Cover the title run, the best team that didn't win, luck, the defining moves, and the playoffs. Facts (JSON):\n${JSON.stringify(f)}`,
  SEASON_WRAPPED: (f) => `Write a short "Season Wrapped" intro for this manager (90-150 words), second person, like an end-of-year highlights reel: honest about the bad parts, warm about the good. Facts (JSON):\n${JSON.stringify(f)}`,
};

export function templateFor(kind: RecapKind, facts: unknown) {
  switch (kind) {
    case "WEEKLY": return weeklyTemplate(facts as WeeklyFacts);
    case "MANAGER_WEEKLY": return managerWeekTemplate(facts as ManagerWeekFacts);
    case "SEASON_STORY": return seasonStoryTemplate(facts as SeasonStoryFacts);
    case "SEASON_WRAPPED": return wrappedTemplate(facts as WrappedFacts);
  }
}

export async function buildFacts(leagueId: string, kind: RecapKind, year: number, week = 0, memberId = "") {
  switch (kind) {
    case "WEEKLY": return weeklyFacts(leagueId, year, week);
    case "MANAGER_WEEKLY": return managerWeekFacts(leagueId, year, week, memberId);
    case "SEASON_STORY": return seasonStoryFacts(leagueId, year);
    case "SEASON_WRAPPED": return wrappedFacts(leagueId, year, memberId);
  }
}

export function recapTitle(kind: RecapKind, year: number, week: number, who?: string) {
  switch (kind) {
    case "WEEKLY": return `${year} · Week ${week} recap`;
    case "MANAGER_WEEKLY": return `${who ?? ""} · ${year} Week ${week}`;
    case "SEASON_STORY": return `The ${year} season`;
    case "SEASON_WRAPPED": return `${who ?? ""}'s ${year} Wrapped`;
  }
}

export async function getRecap(leagueId: string, kind: RecapKind, year: number, week = 0, memberId = "") {
  return prisma.recap.findUnique({ where: { leagueId_kind_year_week_memberId: { leagueId, kind, year, week, memberId } } });
}

/** Build facts, write with AI (or template), and save. */
export async function writeRecap(leagueId: string, kind: RecapKind, year: number, week = 0, memberId = "") {
  const facts = await buildFacts(leagueId, kind, year, week, memberId);
  if (!facts) throw new Error("Not enough data for this recap yet");
  let body = templateFor(kind, facts);
  let writer = "template";
  const ai = await generateText({ system: RECAP_SYSTEM, prompt: PROMPTS[kind](facts), maxTokens: kind === "SEASON_STORY" ? 1600 : 1000 });
  if (ai?.text) { body = ai.text; writer = ai.model; }
  const who = "manager" in facts ? (facts as { manager: string }).manager : undefined;
  const data = { title: recapTitle(kind, year, week, who), body, facts: JSON.parse(JSON.stringify(facts)), writer };
  return prisma.recap.upsert({
    where: { leagueId_kind_year_week_memberId: { leagueId, kind, year, week, memberId } },
    update: data,
    create: { leagueId, kind, year, week, memberId, ...data },
  });
}

export const aiEnabled = () => aiConfig() != null;
