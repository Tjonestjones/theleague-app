import { prisma } from "./db";

// ============================================
// RECORD BOOK ENGINE — 50+ records
// ============================================

export interface LeagueRecord {
  title: string;
  value: string;
  holder: string;
  detail: string;
  category: string;
}

export interface StandingsEntry {
  memberId: string;
  memberName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  championships: number;
  seasons: number;
  winPct: number;
}

export interface HeadToHead {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  ties: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
}

export interface SeasonStanding {
  year: number;
  platform: string | null;
  teams: Array<{
    teamId: string;
    teamName: string;
    memberName: string;
    memberId: string;
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared data fetch
// ─────────────────────────────────────────────────────────────────────────────
async function getLeagueMatchups(leagueId: string) {
  return prisma.matchup.findMany({
    where: {
      week: { season: { leagueId } },
      status: "COMPLETED",
    },
    include: {
      week: {
        include: {
          season: { select: { year: true, platform: true } },
        },
      },
      homeTeam: {
        include: { member: { select: { id: true, displayName: true } } },
      },
      awayTeam: {
        include: { member: { select: { id: true, displayName: true } } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL-TIME STANDINGS
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllTimeStandings(leagueId: string): Promise<StandingsEntry[]> {
  const matchups = await getLeagueMatchups(leagueId);
  const stats: Map<string, StandingsEntry> = new Map();

  const ensure = (memberId: string, name: string) => {
    if (!stats.has(memberId)) {
      stats.set(memberId, {
        memberId, memberName: name,
        wins: 0, losses: 0, ties: 0,
        pointsFor: 0, pointsAgainst: 0,
        championships: 0, seasons: 0, winPct: 0,
      });
    }
    return stats.get(memberId)!;
  };

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const home = ensure(m.homeTeam.member.id, m.homeTeam.member.displayName);
    const away = ensure(m.awayTeam.member.id, m.awayTeam.member.displayName);
    home.pointsFor += m.homeScore; home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore; away.pointsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) { home.wins++; away.losses++; }
    else if (m.awayScore > m.homeScore) { away.wins++; home.losses++; }
    else { home.ties++; away.ties++; }
  }

  const seasons = await prisma.team.findMany({
    where: { season: { leagueId } },
    select: { member: { select: { id: true } }, seasonId: true },
  });
  const seasonCounts: Map<string, Set<string>> = new Map();
  for (const t of seasons) {
    if (!seasonCounts.has(t.member.id)) seasonCounts.set(t.member.id, new Set());
    seasonCounts.get(t.member.id)!.add(t.seasonId);
  }

  for (const [memberId, entry] of stats) {
    entry.seasons = seasonCounts.get(memberId)?.size ?? 0;
    const total = entry.wins + entry.losses + entry.ties;
    entry.winPct = total > 0 ? (entry.wins + entry.ties * 0.5) / total : 0;
  }

  return Array.from(stats.values()).sort((a, b) => b.winPct - a.winPct || b.pointsFor - a.pointsFor);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASON STANDINGS
// ─────────────────────────────────────────────────────────────────────────────
export async function getSeasonStandings(leagueId: string): Promise<SeasonStanding[]> {
  const seasons = await prisma.season.findMany({
    where: { leagueId },
    include: {
      teams: { include: { member: { select: { id: true, displayName: true } } } },
      weeks: {
        include: {
          matchups: {
            where: { status: "COMPLETED" },
            include: {
              homeTeam: { select: { id: true, memberId: true } },
              awayTeam: { select: { id: true, memberId: true } },
            },
          },
        },
      },
    },
    orderBy: { year: "desc" },
  });

  return seasons.map((season) => {
    const teamStats = new Map<string, SeasonStanding["teams"][number]>();
    for (const team of season.teams) {
      teamStats.set(team.id, {
        teamId: team.id, teamName: team.name,
        memberName: team.member.displayName, memberId: team.member.id,
        wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0,
      });
    }
    for (const week of season.weeks) {
      for (const m of week.matchups) {
        if (m.homeScore == null || m.awayScore == null) continue;
        const home = teamStats.get(m.homeTeamId);
        const away = teamStats.get(m.awayTeamId);
        if (!home || !away) continue;
        home.pointsFor += m.homeScore; home.pointsAgainst += m.awayScore;
        away.pointsFor += m.awayScore; away.pointsAgainst += m.homeScore;
        if (m.homeScore > m.awayScore) { home.wins++; away.losses++; }
        else if (m.awayScore > m.homeScore) { away.wins++; home.losses++; }
        else { home.ties++; away.ties++; }
      }
    }
    return {
      year: season.year,
      platform: season.platform,
      teams: Array.from(teamStats.values()).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD-TO-HEAD
// ─────────────────────────────────────────────────────────────────────────────
export async function getHeadToHead(leagueId: string, memberId: string): Promise<HeadToHead[]> {
  const matchups = await getLeagueMatchups(leagueId);
  const h2h: Map<string, HeadToHead> = new Map();

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    let myScore: number, oppScore: number, oppId: string, oppName: string;
    if (m.homeTeam.member.id === memberId) {
      myScore = m.homeScore; oppScore = m.awayScore;
      oppId = m.awayTeam.member.id; oppName = m.awayTeam.member.displayName;
    } else if (m.awayTeam.member.id === memberId) {
      myScore = m.awayScore; oppScore = m.homeScore;
      oppId = m.homeTeam.member.id; oppName = m.homeTeam.member.displayName;
    } else continue;

    if (!h2h.has(oppId)) {
      h2h.set(oppId, { opponentId: oppId, opponentName: oppName, wins: 0, losses: 0, ties: 0, totalPointsFor: 0, totalPointsAgainst: 0 });
    }
    const e = h2h.get(oppId)!;
    e.totalPointsFor += myScore; e.totalPointsAgainst += oppScore;
    if (myScore > oppScore) e.wins++;
    else if (oppScore > myScore) e.losses++;
    else e.ties++;
  }

  return Array.from(h2h.values()).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD BOOK (50+ records)
// ─────────────────────────────────────────────────────────────────────────────
export async function getRecordBook(leagueId: string): Promise<LeagueRecord[]> {
  const matchups = await getLeagueMatchups(leagueId);
  const records: LeagueRecord[] = [];
  if (matchups.length === 0) return records;

  // ── Helpers ──────────────────────────────────────────────────────────────

  interface ScoringEntry {
    score: number; name: string; team: string; year: number; week: number;
    memberId: string;
  }

  // Build flat score list
  const allScores: ScoringEntry[] = [];
  for (const m of matchups) {
    if (m.homeScore != null) allScores.push({ score: m.homeScore, name: m.homeTeam.member.displayName, team: m.homeTeam.name, year: m.week.season.year, week: m.week.weekNumber, memberId: m.homeTeam.member.id });
    if (m.awayScore != null) allScores.push({ score: m.awayScore, name: m.awayTeam.member.displayName, team: m.awayTeam.name, year: m.week.season.year, week: m.week.weekNumber, memberId: m.awayTeam.member.id });
  }
  allScores.sort((a, b) => b.score - a.score);

  // Member name lookup
  const memberNames = new Map<string, string>();
  for (const m of matchups) {
    memberNames.set(m.homeTeam.member.id, m.homeTeam.member.displayName);
    memberNames.set(m.awayTeam.member.id, m.awayTeam.member.displayName);
  }

  // Per-season stats per member
  type SeasonStat = {
    name: string; memberId: string; year: number;
    wins: number; losses: number; ties: number;
    pointsFor: number; pointsAgainst: number;
  };
  const seasonStatMap = new Map<string, SeasonStat>();
  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const process = (memberId: string, memberName: string, myScore: number, oppScore: number, year: number) => {
      const key = `${memberId}-${year}`;
      if (!seasonStatMap.has(key)) seasonStatMap.set(key, { name: memberName, memberId, year, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });
      const s = seasonStatMap.get(key)!;
      s.pointsFor += myScore; s.pointsAgainst += oppScore;
      if (myScore > oppScore) s.wins++;
      else if (oppScore > myScore) s.losses++;
      else s.ties++;
    };
    process(m.homeTeam.member.id, m.homeTeam.member.displayName, m.homeScore, m.awayScore, m.week.season.year);
    process(m.awayTeam.member.id, m.awayTeam.member.displayName, m.awayScore, m.homeScore, m.week.season.year);
  }
  const seasonEntries = Array.from(seasonStatMap.values());

  // Weekly rankings per week (who scored highest/lowest each week)
  type WeekKey = `${number}-${number}`; // year-week
  const weeklyScores = new Map<WeekKey, ScoringEntry[]>();
  for (const s of allScores) {
    const key: WeekKey = `${s.year}-${s.week}`;
    if (!weeklyScores.has(key)) weeklyScores.set(key, []);
    weeklyScores.get(key)!.push(s);
  }
  // Weeks top scorer / bottom scorer per member
  const weeksTopScorer   = new Map<string, number>(); // memberId → count of weeks as #1
  const weeksLastScorer  = new Map<string, number>(); // memberId → count of weeks as last
  const weeksAboveAvg    = new Map<string, number>(); // memberId → count of weeks above league avg
  for (const [, scores] of weeklyScores) {
    if (scores.length < 2) continue;
    scores.sort((a, b) => b.score - a.score);
    const topId   = scores[0].memberId;
    const lastId  = scores[scores.length - 1].memberId;
    const avg = scores.reduce((s, e) => s + e.score, 0) / scores.length;
    weeksTopScorer.set(topId,  (weeksTopScorer.get(topId)  ?? 0) + 1);
    weeksLastScorer.set(lastId, (weeksLastScorer.get(lastId) ?? 0) + 1);
    for (const s of scores) {
      if (s.score > avg) weeksAboveAvg.set(s.memberId, (weeksAboveAvg.get(s.memberId) ?? 0) + 1);
    }
  }

  // Member timelines for streaks
  const memberTimelines = new Map<string, Array<{ won: boolean; year: number; week: number }>>();
  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const add = (id: string, won: boolean) => {
      if (!memberTimelines.has(id)) memberTimelines.set(id, []);
      memberTimelines.get(id)!.push({ won, year: m.week.season.year, week: m.week.weekNumber });
    };
    add(m.homeTeam.member.id, m.homeScore > m.awayScore);
    add(m.awayTeam.member.id, m.awayScore > m.homeScore);
  }
  for (const [, tl] of memberTimelines) tl.sort((a, b) => a.year - b.year || a.week - b.week);

  // H2H pair stats
  type H2HPair = { aId: string; bId: string; aName: string; bName: string; aWins: number; bWins: number; total: number };
  const pairMap = new Map<string, H2HPair>();
  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const [idA, idB] = [m.homeTeam.member.id, m.awayTeam.member.id].sort();
    const key = `${idA}|${idB}`;
    if (!pairMap.has(key)) pairMap.set(key, { aId: idA, bId: idB, aName: memberNames.get(idA)!, bName: memberNames.get(idB)!, aWins: 0, bWins: 0, total: 0 });
    const p = pairMap.get(key)!;
    p.total++;
    if (m.homeScore > m.awayScore) { m.homeTeam.member.id === idA ? p.aWins++ : p.bWins++; }
    else if (m.awayScore > m.homeScore) { m.awayTeam.member.id === idA ? p.aWins++ : p.bWins++; }
  }

  // ── SCORING records ──────────────────────────────────────────────────────

  if (allScores.length > 0) {
    // Highest & lowest single week
    records.push({ title: "Highest Single-Week Score",  value: allScores[0].score.toFixed(1),                   holder: allScores[0].name,                 detail: `${allScores[0].team} — Wk ${allScores[0].week}, ${allScores[0].year}`,   category: "Scoring" });
    records.push({ title: "Lowest Single-Week Score",   value: allScores[allScores.length - 1].score.toFixed(1), holder: allScores[allScores.length - 1].name, detail: `${allScores[allScores.length - 1].team} — Wk ${allScores[allScores.length - 1].week}, ${allScores[allScores.length - 1].year}`, category: "Scoring" });

    // Highest/lowest season avg (requires seasonEntries)
    const withAvg = seasonEntries.filter(e => (e.wins + e.losses) > 0).map(e => ({ ...e, avgPF: e.pointsFor / (e.wins + e.losses) }));
    const highestAvg = [...withAvg].sort((a, b) => b.avgPF - a.avgPF)[0];
    const lowestAvg  = [...withAvg].sort((a, b) => a.avgPF - b.avgPF)[0];
    if (highestAvg) records.push({ title: "Highest Avg Points/Game (Season)", value: highestAvg.avgPF.toFixed(1), holder: highestAvg.name, detail: `${highestAvg.year} — ${highestAvg.pointsFor.toFixed(0)} pts in ${highestAvg.wins + highestAvg.losses} games`, category: "Scoring" });
    if (lowestAvg)  records.push({ title: "Lowest Avg Points/Game (Season)",  value: lowestAvg.avgPF.toFixed(1),  holder: lowestAvg.name,  detail: `${lowestAvg.year} — ${lowestAvg.pointsFor.toFixed(0)} pts in ${lowestAvg.wins + lowestAvg.losses} games`,  category: "Scoring" });

    // All-time avg (across all seasons)
    const allTimeAvg = new Map<string, { name: string; total: number; games: number }>();
    for (const s of allScores) {
      if (!allTimeAvg.has(s.memberId)) allTimeAvg.set(s.memberId, { name: s.name, total: 0, games: 0 });
      const e = allTimeAvg.get(s.memberId)!;
      e.total += s.score; e.games++;
    }
    const allTimeAvgArr = Array.from(allTimeAvg.values()).filter(e => e.games >= 10).map(e => ({ ...e, avg: e.total / e.games }));
    const bestAllTimeAvg  = [...allTimeAvgArr].sort((a, b) => b.avg - a.avg)[0];
    const worstAllTimeAvg = [...allTimeAvgArr].sort((a, b) => a.avg - b.avg)[0];
    if (bestAllTimeAvg)  records.push({ title: "Best All-Time Avg Points/Game",   value: bestAllTimeAvg.avg.toFixed(1),  holder: bestAllTimeAvg.name,  detail: `${bestAllTimeAvg.games} games played`,  category: "Scoring" });
    if (worstAllTimeAvg && worstAllTimeAvg.name !== bestAllTimeAvg?.name) records.push({ title: "Lowest All-Time Avg Points/Game", value: worstAllTimeAvg.avg.toFixed(1), holder: worstAllTimeAvg.name, detail: `${worstAllTimeAvg.games} games played`, category: "Scoring" });
  }

  // ── TOP SCORES (top 5 weeks) ─────────────────────────────────────────────

  allScores.slice(0, 5).forEach((s, i) => {
    records.push({ title: `#${i + 1} Highest Week`, value: s.score.toFixed(1), holder: s.name, detail: `${s.team} — Wk ${s.week}, ${s.year}`, category: "Top Scores" });
  });

  // ── BOTTOM SCORES (bottom 5 weeks) ──────────────────────────────────────

  allScores.slice(-5).reverse().forEach((s, i) => {
    records.push({ title: `#${i + 1} Lowest Week`, value: s.score.toFixed(1), holder: s.name, detail: `${s.team} — Wk ${s.week}, ${s.year}`, category: "Bottom Scores" });
  });

  // ── MATCHUP records ──────────────────────────────────────────────────────

  let biggestBlowout  = { margin: 0,        winner: "", loser: "", score: "", detail: "" };
  let closestGame     = { margin: Infinity,  winner: "", loser: "", score: "", detail: "" };
  let highestCombined = { total: 0,          teams: "",  score: "", detail: "" };
  let lowestCombined  = { total: Infinity,   teams: "",  score: "", detail: "" };
  let closeGames = 0;   // decided by < 5 pts
  let blowouts   = 0;   // decided by > 30 pts

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const margin   = Math.abs(m.homeScore - m.awayScore);
    const combined = m.homeScore + m.awayScore;
    const winner   = m.homeScore > m.awayScore ? m.homeTeam : m.awayTeam;
    const loser    = m.homeScore > m.awayScore ? m.awayTeam : m.homeTeam;
    const winScore = Math.max(m.homeScore, m.awayScore);
    const loseScore = Math.min(m.homeScore, m.awayScore);

    if (margin > biggestBlowout.margin)  biggestBlowout  = { margin, winner: winner.member.displayName, loser: loser.member.displayName, score: `${winScore.toFixed(1)}-${loseScore.toFixed(1)}`, detail: `Wk ${m.week.weekNumber}, ${m.week.season.year}` };
    if (margin < closestGame.margin && margin > 0) closestGame = { margin, winner: winner.member.displayName, loser: loser.member.displayName, score: `${winScore.toFixed(1)}-${loseScore.toFixed(1)}`, detail: `Wk ${m.week.weekNumber}, ${m.week.season.year}` };
    if (combined > highestCombined.total) highestCombined = { total: combined, teams: `${m.homeTeam.member.displayName} vs ${m.awayTeam.member.displayName}`, score: `${m.homeScore.toFixed(1)}-${m.awayScore.toFixed(1)}`, detail: `Wk ${m.week.weekNumber}, ${m.week.season.year}` };
    if (combined < lowestCombined.total)  lowestCombined  = { total: combined, teams: `${m.homeTeam.member.displayName} vs ${m.awayTeam.member.displayName}`, score: `${m.homeScore.toFixed(1)}-${m.awayScore.toFixed(1)}`, detail: `Wk ${m.week.weekNumber}, ${m.week.season.year}` };

    if (margin < 5)  closeGames++;
    if (margin > 30) blowouts++;
  }

  records.push({ title: "Biggest Blowout",        value: `${biggestBlowout.margin.toFixed(1)} pts`, holder: biggestBlowout.winner, detail: `${biggestBlowout.score} vs ${biggestBlowout.loser} — ${biggestBlowout.detail}`, category: "Matchups" });
  if (closestGame.margin < Infinity) records.push({ title: "Closest Game",   value: `${closestGame.margin.toFixed(1)} pts`,  holder: closestGame.winner,  detail: `${closestGame.score} vs ${closestGame.loser} — ${closestGame.detail}`, category: "Matchups" });
  records.push({ title: "Highest Combined Score",  value: highestCombined.total.toFixed(1), holder: highestCombined.teams, detail: `${highestCombined.score} — ${highestCombined.detail}`, category: "Matchups" });
  if (lowestCombined.total < Infinity) records.push({ title: "Lowest Combined Score", value: lowestCombined.total.toFixed(1), holder: lowestCombined.teams, detail: `${lowestCombined.score} — ${lowestCombined.detail}`, category: "Matchups" });
  records.push({ title: "Total Games Decided by < 5 pts",  value: `${closeGames}`,  holder: "League All-Time", detail: `${((closeGames / matchups.length) * 100).toFixed(0)}% of all matchups`, category: "Matchups" });
  records.push({ title: "Total Blowouts (margin > 30 pts)", value: `${blowouts}`, holder: "League All-Time", detail: `${((blowouts / matchups.length) * 100).toFixed(0)}% of all matchups`, category: "Matchups" });

  // ── SEASON records ───────────────────────────────────────────────────────

  const mostWins    = [...seasonEntries].sort((a, b) => b.wins - a.wins)[0];
  const mostLosses  = [...seasonEntries].sort((a, b) => b.losses - a.losses)[0];
  const mostPF      = [...seasonEntries].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  const fewestPF    = [...seasonEntries].sort((a, b) => a.pointsFor - b.pointsFor)[0];
  const mostPA      = [...seasonEntries].sort((a, b) => b.pointsAgainst - a.pointsAgainst)[0];

  if (mostWins)   records.push({ title: "Most Wins in a Season",    value: `${mostWins.wins}`,        holder: mostWins.name,   detail: `${mostWins.wins}-${mostWins.losses} in ${mostWins.year}`,   category: "Season" });
  if (mostLosses) records.push({ title: "Most Losses in a Season",  value: `${mostLosses.losses}`,    holder: mostLosses.name, detail: `${mostLosses.wins}-${mostLosses.losses} in ${mostLosses.year}`, category: "Season" });
  if (mostPF)     records.push({ title: "Most Points in a Season",  value: mostPF.pointsFor.toFixed(1), holder: mostPF.name,   detail: `${mostPF.year}`,                                              category: "Season" });
  if (fewestPF)   records.push({ title: "Fewest Points in a Season", value: fewestPF.pointsFor.toFixed(1), holder: fewestPF.name, detail: `${fewestPF.year}`,                                        category: "Season" });
  if (mostPA)     records.push({ title: "Most Points Against in a Season", value: mostPA.pointsAgainst.toFixed(1), holder: mostPA.name, detail: `${mostPA.year}`,                                   category: "Season" });

  // Best & worst season win %
  const withWinPct = seasonEntries.filter(e => e.wins + e.losses >= 6).map(e => ({ ...e, pct: e.wins / (e.wins + e.losses) }));
  const bestSeasonPct  = [...withWinPct].sort((a, b) => b.pct - a.pct)[0];
  const worstSeasonPct = [...withWinPct].sort((a, b) => a.pct - b.pct)[0];
  if (bestSeasonPct)  records.push({ title: "Best Season Win %",   value: `${(bestSeasonPct.pct * 100).toFixed(0)}%`,  holder: bestSeasonPct.name,  detail: `${bestSeasonPct.wins}-${bestSeasonPct.losses} in ${bestSeasonPct.year}`,  category: "Season" });
  if (worstSeasonPct) records.push({ title: "Worst Season Win %",  value: `${(worstSeasonPct.pct * 100).toFixed(0)}%`, holder: worstSeasonPct.name, detail: `${worstSeasonPct.wins}-${worstSeasonPct.losses} in ${worstSeasonPct.year}`, category: "Season" });

  // Biggest PF improvement year-over-year
  const pfByMemberYear = new Map<string, { name: string; year: number; pf: number }[]>();
  for (const s of seasonEntries) {
    if (!pfByMemberYear.has(s.memberId)) pfByMemberYear.set(s.memberId, []);
    pfByMemberYear.get(s.memberId)!.push({ name: s.name, year: s.year, pf: s.pointsFor });
  }
  let biggestImprovement = { delta: 0, name: "", detail: "" };
  let biggestDecline     = { delta: 0, name: "", detail: "" };
  for (const [, seasons] of pfByMemberYear) {
    seasons.sort((a, b) => a.year - b.year);
    for (let i = 1; i < seasons.length; i++) {
      const delta = seasons[i].pf - seasons[i - 1].pf;
      if (delta > biggestImprovement.delta) biggestImprovement = { delta, name: seasons[i].name, detail: `${seasons[i - 1].year} → ${seasons[i].year} (+${delta.toFixed(0)} pts)` };
      if (delta < -biggestDecline.delta)    biggestDecline     = { delta: Math.abs(delta), name: seasons[i].name, detail: `${seasons[i - 1].year} → ${seasons[i].year} (${delta.toFixed(0)} pts)` };
    }
  }
  if (biggestImprovement.delta > 0) records.push({ title: "Biggest Season-to-Season PF Improvement", value: `+${biggestImprovement.delta.toFixed(0)}`, holder: biggestImprovement.name, detail: biggestImprovement.detail, category: "Season" });
  if (biggestDecline.delta > 0)     records.push({ title: "Biggest Season-to-Season PF Decline",     value: `-${biggestDecline.delta.toFixed(0)}`,     holder: biggestDecline.name,     detail: biggestDecline.detail,     category: "Season" });

  // ── STREAK records ───────────────────────────────────────────────────────

  let longestWinStreak  = { streak: 0, name: "", detail: "" };
  let longestLoseStreak = { streak: 0, name: "", detail: "" };
  // Current streaks (as of last game played)
  let currentWinStreak  = { streak: 0, name: "" };
  let currentLoseStreak = { streak: 0, name: "" };

  for (const [memberId, timeline] of memberTimelines) {
    let winStreak = 0, maxWin = 0, winEnd = 0;
    let loseStreak = 0, maxLose = 0, loseEnd = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].won) { winStreak++; loseStreak = 0; if (winStreak > maxWin) { maxWin = winStreak; winEnd = i; } }
      else                 { loseStreak++; winStreak = 0; if (loseStreak > maxLose) { maxLose = loseStreak; loseEnd = i; } }
    }
    const name = memberNames.get(memberId) ?? "Unknown";
    if (maxWin > longestWinStreak.streak) {
      const startIdx = winEnd - maxWin + 1;
      longestWinStreak = { streak: maxWin, name, detail: `${timeline[startIdx].year} Wk${timeline[startIdx].week} → ${timeline[winEnd].year} Wk${timeline[winEnd].week}` };
    }
    if (maxLose > longestLoseStreak.streak) {
      const startIdx = loseEnd - maxLose + 1;
      longestLoseStreak = { streak: maxLose, name, detail: `${timeline[startIdx].year} Wk${timeline[startIdx].week} → ${timeline[loseEnd].year} Wk${timeline[loseEnd].week}` };
    }
    // Current streak (trailing games)
    let curWin = 0, curLose = 0;
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].won && curLose === 0) curWin++;
      else if (!timeline[i].won && curWin === 0) curLose++;
      else break;
    }
    if (curWin  > currentWinStreak.streak)  currentWinStreak  = { streak: curWin,  name };
    if (curLose > currentLoseStreak.streak) currentLoseStreak = { streak: curLose, name };
  }

  if (longestWinStreak.streak > 0)  records.push({ title: "Longest Win Streak",     value: `${longestWinStreak.streak} games`,  holder: longestWinStreak.name,  detail: longestWinStreak.detail,  category: "Streaks" });
  if (longestLoseStreak.streak > 0) records.push({ title: "Longest Losing Streak",  value: `${longestLoseStreak.streak} games`, holder: longestLoseStreak.name, detail: longestLoseStreak.detail, category: "Streaks" });
  if (currentWinStreak.streak >= 2)  records.push({ title: "Active Win Streak",      value: `${currentWinStreak.streak} games`,  holder: currentWinStreak.name,  detail: "Current — still going",  category: "Streaks" });
  if (currentLoseStreak.streak >= 2) records.push({ title: "Active Losing Streak",   value: `${currentLoseStreak.streak} games`, holder: currentLoseStreak.name, detail: "Current — still going",  category: "Streaks" });

  // ── ALL-TIME records ─────────────────────────────────────────────────────

  const standings = await getAllTimeStandings(leagueId);

  if (standings.length > 0) {
    const mostATWins    = [...standings].sort((a, b) => b.wins - a.wins)[0];
    const mostATLosses  = [...standings].sort((a, b) => b.losses - a.losses)[0];
    const mostATPF      = [...standings].sort((a, b) => b.pointsFor - a.pointsFor)[0];
    const mostSeasons   = [...standings].sort((a, b) => b.seasons - a.seasons)[0];
    const bestWinPct    = [...standings].filter(s => s.wins + s.losses >= 10).sort((a, b) => b.winPct - a.winPct)[0];
    const worstWinPct   = [...standings].filter(s => s.wins + s.losses >= 10).sort((a, b) => a.winPct - b.winPct)[0];
    const mostATPA      = [...standings].sort((a, b) => b.pointsAgainst - a.pointsAgainst)[0];

    records.push({ title: "Most All-Time Wins",           value: `${mostATWins.wins}`,                                holder: mostATWins.memberName,   detail: `${mostATWins.wins}-${mostATWins.losses} (${(mostATWins.winPct * 100).toFixed(1)}%)`,    category: "All-Time" });
    records.push({ title: "Most All-Time Losses",         value: `${mostATLosses.losses}`,                            holder: mostATLosses.memberName, detail: `${mostATLosses.wins}-${mostATLosses.losses}`,                                           category: "All-Time" });
    records.push({ title: "Most All-Time Points",         value: mostATPF.pointsFor.toFixed(1),                       holder: mostATPF.memberName,     detail: `${mostATPF.seasons} seasons`,                                                          category: "All-Time" });
    records.push({ title: "Most All-Time Points Against", value: mostATPA.pointsAgainst.toFixed(1),                   holder: mostATPA.memberName,     detail: `The unluckiest manager`,                                                               category: "All-Time" });
    records.push({ title: "Most Seasons Played",          value: `${mostSeasons.seasons}`,                            holder: mostSeasons.memberName,  detail: `${mostSeasons.wins}-${mostSeasons.losses} record`,                                     category: "All-Time" });
    if (bestWinPct)  records.push({ title: "Best All-Time Win %",  value: `${(bestWinPct.winPct * 100).toFixed(1)}%`, holder: bestWinPct.memberName,   detail: `${bestWinPct.wins}-${bestWinPct.losses} (min 10 games)`,                               category: "All-Time" });
    if (worstWinPct && worstWinPct.memberName !== bestWinPct?.memberName) records.push({ title: "Worst All-Time Win %", value: `${(worstWinPct.winPct * 100).toFixed(1)}%`, holder: worstWinPct.memberName, detail: `${worstWinPct.wins}-${worstWinPct.losses} (min 10 games)`, category: "All-Time" });
  }

  // ── WEEKLY DOMINANCE records ─────────────────────────────────────────────

  const topScorerArr  = Array.from(weeksTopScorer.entries()).sort((a, b) => b[1] - a[1]);
  const lastScorerArr = Array.from(weeksLastScorer.entries()).sort((a, b) => b[1] - a[1]);
  const aboveAvgArr   = Array.from(weeksAboveAvg.entries()).sort((a, b) => b[1] - a[1]);
  const totalWeeks    = weeklyScores.size;

  if (topScorerArr.length > 0) {
    const [topId, topCount] = topScorerArr[0];
    records.push({ title: "Most Weeks as Top Scorer",    value: `${topCount}`,  holder: memberNames.get(topId) ?? "Unknown", detail: `${((topCount / totalWeeks) * 100).toFixed(0)}% of all weeks`,   category: "Weekly Dominance" });
  }
  if (lastScorerArr.length > 0) {
    const [lastId, lastCount] = lastScorerArr[0];
    records.push({ title: "Most Weeks as Bottom Scorer", value: `${lastCount}`, holder: memberNames.get(lastId) ?? "Unknown", detail: `${((lastCount / totalWeeks) * 100).toFixed(0)}% of all weeks`, category: "Weekly Dominance" });
  }
  if (aboveAvgArr.length > 0) {
    const [topId, topCount] = aboveAvgArr[0];
    records.push({ title: "Most Weeks Scoring Above Average", value: `${topCount}`, holder: memberNames.get(topId) ?? "Unknown", detail: `${((topCount / totalWeeks) * 100).toFixed(0)}% of weeks above league avg`, category: "Weekly Dominance" });
  }
  // Biggest single-week score gap (highest scorer vs lowest scorer same week)
  let biggestWeekSpread = { spread: 0, week: 0, year: 0, top: "", bot: "" };
  for (const [key, scores] of weeklyScores) {
    if (scores.length < 2) continue;
    scores.sort((a, b) => b.score - a.score);
    const spread = scores[0].score - scores[scores.length - 1].score;
    if (spread > biggestWeekSpread.spread) {
      const [year, week] = key.split("-").map(Number);
      biggestWeekSpread = { spread, week, year, top: scores[0].name, bot: scores[scores.length - 1].name };
    }
  }
  if (biggestWeekSpread.spread > 0) records.push({ title: "Biggest Single-Week Spread", value: `${biggestWeekSpread.spread.toFixed(1)} pts`, holder: biggestWeekSpread.top, detail: `vs ${biggestWeekSpread.bot} — Wk ${biggestWeekSpread.week}, ${biggestWeekSpread.year}`, category: "Weekly Dominance" });

  // ── HEAD-TO-HEAD records ─────────────────────────────────────────────────

  const pairs = Array.from(pairMap.values()).filter(p => p.total >= 3);
  if (pairs.length > 0) {
    // Most games between two managers
    const mostPlayed = [...pairs].sort((a, b) => b.total - a.total)[0];
    records.push({ title: "Most Games Between Two Managers", value: `${mostPlayed.total}`, holder: `${mostPlayed.aName} vs ${mostPlayed.bName}`, detail: `${mostPlayed.aWins}-${mostPlayed.bWins} record`, category: "Head-to-Head" });

    // Most dominant H2H (highest win % vs single opponent, min 5 games)
    const dominancePairs = pairs.filter(p => p.total >= 5).map(p => {
      const dominant = p.aWins >= p.bWins ? { name: p.aName, wins: p.aWins, vs: p.bName, total: p.total } : { name: p.bName, wins: p.bWins, vs: p.aName, total: p.total };
      return { ...dominant, pct: dominant.wins / p.total };
    }).sort((a, b) => b.pct - a.pct);
    if (dominancePairs.length > 0) {
      const d = dominancePairs[0];
      records.push({ title: "Most Dominant H2H Record", value: `${(d.pct * 100).toFixed(0)}%`, holder: d.name, detail: `${d.wins}-${d.total - d.wins} vs ${d.vs} (min 5 games)`, category: "Head-to-Head" });
    }

    // Most lopsided rivalry (biggest win disparity between same two managers)
    const mostLopsided = [...pairs].map(p => ({ ...p, diff: Math.abs(p.aWins - p.bWins) })).sort((a, b) => b.diff - a.diff)[0];
    if (mostLopsided && mostLopsided.diff > 0) {
      const leader = mostLopsided.aWins > mostLopsided.bWins ? { name: mostLopsided.aName, w: mostLopsided.aWins, l: mostLopsided.bWins, vs: mostLopsided.bName } : { name: mostLopsided.bName, w: mostLopsided.bWins, l: mostLopsided.aWins, vs: mostLopsided.aName };
      records.push({ title: "Most Lopsided Rivalry", value: `${leader.w}-${leader.l}`, holder: leader.name, detail: `vs ${leader.vs} (${leader.w + leader.l} games total)`, category: "Head-to-Head" });
    }
  }

  // ── LUCK records ─────────────────────────────────────────────────────────

  // Highest score in a loss
  const scoredInLoss = matchups.filter(m => m.homeScore != null && m.awayScore != null).flatMap(m => {
    const out: ScoringEntry[] = [];
    if (m.homeScore! < m.awayScore!) out.push({ score: m.homeScore!, name: m.homeTeam.member.displayName, team: m.homeTeam.name, year: m.week.season.year, week: m.week.weekNumber, memberId: m.homeTeam.member.id });
    if (m.awayScore! < m.homeScore!) out.push({ score: m.awayScore!, name: m.awayTeam.member.displayName, team: m.awayTeam.name, year: m.week.season.year, week: m.week.weekNumber, memberId: m.awayTeam.member.id });
    return out;
  }).sort((a, b) => b.score - a.score);

  // Lowest score in a win
  const scoredInWin = matchups.filter(m => m.homeScore != null && m.awayScore != null).flatMap(m => {
    const out: ScoringEntry[] = [];
    if (m.homeScore! > m.awayScore!) out.push({ score: m.homeScore!, name: m.homeTeam.member.displayName, team: m.homeTeam.name, year: m.week.season.year, week: m.week.weekNumber, memberId: m.homeTeam.member.id });
    if (m.awayScore! > m.homeScore!) out.push({ score: m.awayScore!, name: m.awayTeam.member.displayName, team: m.awayTeam.name, year: m.week.season.year, week: m.week.weekNumber, memberId: m.awayTeam.member.id });
    return out;
  }).sort((a, b) => a.score - b.score);

  if (scoredInLoss.length > 0) records.push({ title: "Highest Score in a Loss",  value: scoredInLoss[0].score.toFixed(1), holder: scoredInLoss[0].name, detail: `${scoredInLoss[0].team} — Wk ${scoredInLoss[0].week}, ${scoredInLoss[0].year}`, category: "Luck" });
  if (scoredInWin.length > 0)  records.push({ title: "Lowest Score in a Win",    value: scoredInWin[0].score.toFixed(1),  holder: scoredInWin[0].name,  detail: `${scoredInWin[0].team} — Wk ${scoredInWin[0].week}, ${scoredInWin[0].year}`,   category: "Luck" });

  // Most points ever scored in a losing effort (top 3)
  scoredInLoss.slice(0, 3).forEach((s, i) => {
    if (i === 0) return; // first already added above
    records.push({ title: `#${i + 1} Highest Score in a Loss`, value: s.score.toFixed(1), holder: s.name, detail: `${s.team} — Wk ${s.week}, ${s.year}`, category: "Luck" });
  });

  // Manager who has lost the most games where they scored above their own average
  const memberAvgScore = new Map<string, { name: string; total: number; count: number }>();
  for (const s of allScores) {
    if (!memberAvgScore.has(s.memberId)) memberAvgScore.set(s.memberId, { name: s.name, total: 0, count: 0 });
    const e = memberAvgScore.get(s.memberId)!;
    e.total += s.score; e.count++;
  }
  const memberAvg = new Map<string, number>();
  for (const [id, e] of memberAvgScore) memberAvg.set(id, e.total / e.count);

  const aboveAvgLosses = new Map<string, { name: string; count: number }>();
  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const checkLoss = (memberId: string, name: string, myScore: number, oppScore: number) => {
      if (myScore < oppScore) {
        const avg = memberAvg.get(memberId) ?? 0;
        if (myScore > avg) {
          if (!aboveAvgLosses.has(memberId)) aboveAvgLosses.set(memberId, { name, count: 0 });
          aboveAvgLosses.get(memberId)!.count++;
        }
      }
    };
    checkLoss(m.homeTeam.member.id, m.homeTeam.member.displayName, m.homeScore, m.awayScore);
    checkLoss(m.awayTeam.member.id, m.awayTeam.member.displayName, m.awayScore, m.homeScore);
  }
  const mostAboveAvgLosses = Array.from(aboveAvgLosses.values()).sort((a, b) => b.count - a.count)[0];
  if (mostAboveAvgLosses) records.push({ title: "Most Above-Average Scores in a Loss", value: `${mostAboveAvgLosses.count}x`, holder: mostAboveAvgLosses.name, detail: "The definition of unlucky", category: "Luck" });

  return records;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER CAREER STATS
// ─────────────────────────────────────────────────────────────────────────────
export async function getMemberCareerStats(leagueId: string, memberId: string) {
  const matchups = await getLeagueMatchups(leagueId);
  const h2h = await getHeadToHead(leagueId, memberId);

  const seasonBreakdown = new Map<number, {
    year: number; teamName: string; wins: number; losses: number; ties: number;
    pointsFor: number; pointsAgainst: number; highWeek: number; lowWeek: number;
  }>();

  let totalWins = 0, totalLosses = 0, totalTies = 0;
  let totalPF = 0, totalPA = 0;
  let highestWeekScore = 0, lowestWeekScore = Infinity;
  const weekScores: number[] = [];

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    let myScore: number, oppScore: number, year: number, teamName: string;

    if (m.homeTeam.member.id === memberId) {
      myScore = m.homeScore; oppScore = m.awayScore; year = m.week.season.year; teamName = m.homeTeam.name;
    } else if (m.awayTeam.member.id === memberId) {
      myScore = m.awayScore; oppScore = m.homeScore; year = m.week.season.year; teamName = m.awayTeam.name;
    } else continue;

    weekScores.push(myScore);
    totalPF += myScore; totalPA += oppScore;
    if (myScore > highestWeekScore) highestWeekScore = myScore;
    if (myScore < lowestWeekScore)  lowestWeekScore  = myScore;

    const won = myScore > oppScore, lost = myScore < oppScore;
    if (won) totalWins++; else if (lost) totalLosses++; else totalTies++;

    if (!seasonBreakdown.has(year)) {
      seasonBreakdown.set(year, { year, teamName, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, highWeek: 0, lowWeek: Infinity });
    }
    const s = seasonBreakdown.get(year)!;
    s.teamName = teamName; s.pointsFor += myScore; s.pointsAgainst += oppScore;
    if (won) s.wins++; else if (lost) s.losses++; else s.ties++;
    if (myScore > s.highWeek) s.highWeek = myScore;
    if (myScore < s.lowWeek)  s.lowWeek  = myScore;
  }

  const totalGames = totalWins + totalLosses + totalTies;
  return {
    totalWins, totalLosses, totalTies, totalGames,
    totalPF, totalPA,
    avgPF: totalGames > 0 ? totalPF / totalGames : 0,
    highestWeekScore,
    lowestWeekScore: lowestWeekScore === Infinity ? 0 : lowestWeekScore,
    winPct: totalGames > 0 ? (totalWins + totalTies * 0.5) / totalGames : 0,
    seasons: Array.from(seasonBreakdown.values()).sort((a, b) => b.year - a.year),
    headToHead: h2h,
    weekScores,
  };
}
