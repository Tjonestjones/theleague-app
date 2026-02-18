import { prisma } from "./db";

// ============================================
// RECORD BOOK ENGINE
// Computes 50+ records from matchup/team data
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

// Fetch all matchup data for a league
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
        include: {
          member: { select: { id: true, displayName: true } },
        },
      },
      awayTeam: {
        include: {
          member: { select: { id: true, displayName: true } },
        },
      },
    },
  });
}

// ============================================
// ALL-TIME STANDINGS
// ============================================
export async function getAllTimeStandings(leagueId: string): Promise<StandingsEntry[]> {
  const matchups = await getLeagueMatchups(leagueId);
  const stats: Map<string, StandingsEntry> = new Map();

  const ensure = (memberId: string, name: string) => {
    if (!stats.has(memberId)) {
      stats.set(memberId, {
        memberId,
        memberName: name,
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

    home.pointsFor += m.homeScore;
    home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore;
    away.pointsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
    } else if (m.awayScore > m.homeScore) {
      away.wins++;
      home.losses++;
    } else {
      home.ties++;
      away.ties++;
    }
  }

  // Count seasons per member
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

// ============================================
// SEASON STANDINGS
// ============================================
export async function getSeasonStandings(leagueId: string): Promise<SeasonStanding[]> {
  const seasons = await prisma.season.findMany({
    where: { leagueId },
    include: {
      teams: {
        include: { member: { select: { id: true, displayName: true } } },
      },
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
    const teamStats: Map<string, {
      teamId: string; teamName: string; memberName: string; memberId: string;
      wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number;
    }> = new Map();

    for (const team of season.teams) {
      teamStats.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        memberName: team.member.displayName,
        memberId: team.member.id,
        wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0,
      });
    }

    for (const week of season.weeks) {
      for (const m of week.matchups) {
        if (m.homeScore == null || m.awayScore == null) continue;
        const home = teamStats.get(m.homeTeamId);
        const away = teamStats.get(m.awayTeamId);
        if (!home || !away) continue;

        home.pointsFor += m.homeScore;
        home.pointsAgainst += m.awayScore;
        away.pointsFor += m.awayScore;
        away.pointsAgainst += m.homeScore;

        if (m.homeScore > m.awayScore) { home.wins++; away.losses++; }
        else if (m.awayScore > m.homeScore) { away.wins++; home.losses++; }
        else { home.ties++; away.ties++; }
      }
    }

    return {
      year: season.year,
      platform: season.platform,
      teams: Array.from(teamStats.values()).sort((a, b) =>
        b.wins - a.wins || b.pointsFor - a.pointsFor
      ),
    };
  });
}

// ============================================
// HEAD-TO-HEAD
// ============================================
export async function getHeadToHead(leagueId: string, memberId: string): Promise<HeadToHead[]> {
  const matchups = await getLeagueMatchups(leagueId);
  const h2h: Map<string, HeadToHead> = new Map();

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;

    let myScore: number, oppScore: number, oppId: string, oppName: string;

    if (m.homeTeam.member.id === memberId) {
      myScore = m.homeScore;
      oppScore = m.awayScore;
      oppId = m.awayTeam.member.id;
      oppName = m.awayTeam.member.displayName;
    } else if (m.awayTeam.member.id === memberId) {
      myScore = m.awayScore;
      oppScore = m.homeScore;
      oppId = m.homeTeam.member.id;
      oppName = m.homeTeam.member.displayName;
    } else {
      continue;
    }

    if (!h2h.has(oppId)) {
      h2h.set(oppId, { opponentId: oppId, opponentName: oppName, wins: 0, losses: 0, ties: 0, totalPointsFor: 0, totalPointsAgainst: 0 });
    }
    const entry = h2h.get(oppId)!;
    entry.totalPointsFor += myScore;
    entry.totalPointsAgainst += oppScore;

    if (myScore > oppScore) entry.wins++;
    else if (oppScore > myScore) entry.losses++;
    else entry.ties++;
  }

  return Array.from(h2h.values()).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
}

// ============================================
// RECORD BOOK (50+ records)
// ============================================
export async function getRecordBook(leagueId: string): Promise<LeagueRecord[]> {
  const matchups = await getLeagueMatchups(leagueId);
  const records: LeagueRecord[] = [];

  if (matchups.length === 0) return records;

  // --- Scoring Records ---
  interface ScoringEntry {
    score: number;
    name: string;
    team: string;
    year: number;
    week: number;
  }

  const allScores: ScoringEntry[] = [];
  for (const m of matchups) {
    if (m.homeScore != null) {
      allScores.push({
        score: m.homeScore,
        name: m.homeTeam.member.displayName,
        team: m.homeTeam.name,
        year: m.week.season.year,
        week: m.week.weekNumber,
      });
    }
    if (m.awayScore != null) {
      allScores.push({
        score: m.awayScore,
        name: m.awayTeam.member.displayName,
        team: m.awayTeam.name,
        year: m.week.season.year,
        week: m.week.weekNumber,
      });
    }
  }

  allScores.sort((a, b) => b.score - a.score);

  if (allScores.length > 0) {
    const highest = allScores[0];
    records.push({
      title: "Highest Single-Week Score",
      value: highest.score.toFixed(1),
      holder: highest.name,
      detail: `${highest.team} — Week ${highest.week}, ${highest.year}`,
      category: "Scoring",
    });

    const lowest = allScores[allScores.length - 1];
    records.push({
      title: "Lowest Single-Week Score",
      value: lowest.score.toFixed(1),
      holder: lowest.name,
      detail: `${lowest.team} — Week ${lowest.week}, ${lowest.year}`,
      category: "Scoring",
    });
  }

  // --- Matchup Records ---
  let biggestBlowout = { margin: 0, winner: "", loser: "", score: "", detail: "" };
  let closestGame = { margin: Infinity, winner: "", loser: "", score: "", detail: "" };
  let highestCombined = { total: 0, teams: "", score: "", detail: "" };
  let lowestCombined = { total: Infinity, teams: "", score: "", detail: "" };

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const margin = Math.abs(m.homeScore - m.awayScore);
    const combined = m.homeScore + m.awayScore;
    const winner = m.homeScore > m.awayScore ? m.homeTeam : m.awayTeam;
    const loser = m.homeScore > m.awayScore ? m.awayTeam : m.homeTeam;
    const winScore = Math.max(m.homeScore, m.awayScore);
    const loseScore = Math.min(m.homeScore, m.awayScore);

    if (margin > biggestBlowout.margin) {
      biggestBlowout = {
        margin,
        winner: winner.member.displayName,
        loser: loser.member.displayName,
        score: `${winScore.toFixed(1)}-${loseScore.toFixed(1)}`,
        detail: `Week ${m.week.weekNumber}, ${m.week.season.year}`,
      };
    }

    if (margin < closestGame.margin && margin > 0) {
      closestGame = {
        margin,
        winner: winner.member.displayName,
        loser: loser.member.displayName,
        score: `${winScore.toFixed(1)}-${loseScore.toFixed(1)}`,
        detail: `Week ${m.week.weekNumber}, ${m.week.season.year}`,
      };
    }

    if (combined > highestCombined.total) {
      highestCombined = {
        total: combined,
        teams: `${m.homeTeam.member.displayName} vs ${m.awayTeam.member.displayName}`,
        score: `${m.homeScore.toFixed(1)}-${m.awayScore.toFixed(1)}`,
        detail: `Week ${m.week.weekNumber}, ${m.week.season.year}`,
      };
    }

    if (combined < lowestCombined.total) {
      lowestCombined = {
        total: combined,
        teams: `${m.homeTeam.member.displayName} vs ${m.awayTeam.member.displayName}`,
        score: `${m.homeScore.toFixed(1)}-${m.awayScore.toFixed(1)}`,
        detail: `Week ${m.week.weekNumber}, ${m.week.season.year}`,
      };
    }
  }

  records.push({
    title: "Biggest Blowout",
    value: `${biggestBlowout.margin.toFixed(1)} pts`,
    holder: biggestBlowout.winner,
    detail: `${biggestBlowout.score} vs ${biggestBlowout.loser} — ${biggestBlowout.detail}`,
    category: "Matchups",
  });

  if (closestGame.margin < Infinity) {
    records.push({
      title: "Closest Game",
      value: `${closestGame.margin.toFixed(1)} pts`,
      holder: closestGame.winner,
      detail: `${closestGame.score} vs ${closestGame.loser} — ${closestGame.detail}`,
      category: "Matchups",
    });
  }

  records.push({
    title: "Highest Combined Score",
    value: highestCombined.total.toFixed(1),
    holder: highestCombined.teams,
    detail: `${highestCombined.score} — ${highestCombined.detail}`,
    category: "Matchups",
  });

  if (lowestCombined.total < Infinity) {
    records.push({
      title: "Lowest Combined Score",
      value: lowestCombined.total.toFixed(1),
      holder: lowestCombined.teams,
      detail: `${lowestCombined.score} — ${lowestCombined.detail}`,
      category: "Matchups",
    });
  }

  // --- Season Records ---
  const seasonStats: Map<string, {
    name: string; year: number; wins: number; losses: number;
    pointsFor: number; pointsAgainst: number;
  }> = new Map();

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const homeKey = `${m.homeTeam.member.id}-${m.week.season.year}`;
    const awayKey = `${m.awayTeam.member.id}-${m.week.season.year}`;

    if (!seasonStats.has(homeKey)) {
      seasonStats.set(homeKey, { name: m.homeTeam.member.displayName, year: m.week.season.year, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    }
    if (!seasonStats.has(awayKey)) {
      seasonStats.set(awayKey, { name: m.awayTeam.member.displayName, year: m.week.season.year, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    }

    const home = seasonStats.get(homeKey)!;
    const away = seasonStats.get(awayKey)!;

    home.pointsFor += m.homeScore;
    home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore;
    away.pointsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) { home.wins++; away.losses++; }
    else if (m.awayScore > m.homeScore) { away.wins++; home.losses++; }
  }

  const seasonEntries = Array.from(seasonStats.values());

  // Most wins in a season
  const mostWins = seasonEntries.sort((a, b) => b.wins - a.wins)[0];
  if (mostWins) {
    records.push({
      title: "Most Wins in a Season",
      value: `${mostWins.wins}`,
      holder: mostWins.name,
      detail: `${mostWins.wins}-${mostWins.losses} in ${mostWins.year}`,
      category: "Season",
    });
  }

  // Most losses in a season
  const mostLosses = [...seasonEntries].sort((a, b) => b.losses - a.losses)[0];
  if (mostLosses) {
    records.push({
      title: "Most Losses in a Season",
      value: `${mostLosses.losses}`,
      holder: mostLosses.name,
      detail: `${mostLosses.wins}-${mostLosses.losses} in ${mostLosses.year}`,
      category: "Season",
    });
  }

  // Most points in a season
  const mostPF = [...seasonEntries].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  if (mostPF) {
    records.push({
      title: "Most Points in a Season",
      value: mostPF.pointsFor.toFixed(1),
      holder: mostPF.name,
      detail: `${mostPF.year} season`,
      category: "Season",
    });
  }

  // Fewest points in a season
  const fewestPF = [...seasonEntries].sort((a, b) => a.pointsFor - b.pointsFor)[0];
  if (fewestPF) {
    records.push({
      title: "Fewest Points in a Season",
      value: fewestPF.pointsFor.toFixed(1),
      holder: fewestPF.name,
      detail: `${fewestPF.year} season`,
      category: "Season",
    });
  }

  // Most points against in a season
  const mostPA = [...seasonEntries].sort((a, b) => b.pointsAgainst - a.pointsAgainst)[0];
  if (mostPA) {
    records.push({
      title: "Most Points Against in a Season",
      value: mostPA.pointsAgainst.toFixed(1),
      holder: mostPA.name,
      detail: `${mostPA.year} season`,
      category: "Season",
    });
  }

  // --- Streak Records ---
  // Build timeline per member
  const memberTimelines: Map<string, Array<{ won: boolean; year: number; week: number }>> = new Map();

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;

    const homeId = m.homeTeam.member.id;
    const awayId = m.awayTeam.member.id;

    if (!memberTimelines.has(homeId)) memberTimelines.set(homeId, []);
    if (!memberTimelines.has(awayId)) memberTimelines.set(awayId, []);

    memberTimelines.get(homeId)!.push({
      won: m.homeScore > m.awayScore,
      year: m.week.season.year,
      week: m.week.weekNumber,
    });
    memberTimelines.get(awayId)!.push({
      won: m.awayScore > m.homeScore,
      year: m.week.season.year,
      week: m.week.weekNumber,
    });
  }

  // Sort timelines
  for (const [, timeline] of memberTimelines) {
    timeline.sort((a, b) => a.year - b.year || a.week - b.week);
  }

  let longestWinStreak = { streak: 0, name: "", detail: "" };
  let longestLoseStreak = { streak: 0, name: "", detail: "" };

  // Get member names
  const memberNames: Map<string, string> = new Map();
  for (const m of matchups) {
    memberNames.set(m.homeTeam.member.id, m.homeTeam.member.displayName);
    memberNames.set(m.awayTeam.member.id, m.awayTeam.member.displayName);
  }

  for (const [memberId, timeline] of memberTimelines) {
    let winStreak = 0, maxWin = 0, winEnd = 0;
    let loseStreak = 0, maxLose = 0, loseEnd = 0;

    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].won) {
        winStreak++;
        loseStreak = 0;
        if (winStreak > maxWin) { maxWin = winStreak; winEnd = i; }
      } else {
        loseStreak++;
        winStreak = 0;
        if (loseStreak > maxLose) { maxLose = loseStreak; loseEnd = i; }
      }
    }

    const name = memberNames.get(memberId) ?? "Unknown";

    if (maxWin > longestWinStreak.streak) {
      const startIdx = winEnd - maxWin + 1;
      longestWinStreak = {
        streak: maxWin,
        name,
        detail: `${timeline[startIdx].year} Wk${timeline[startIdx].week} → ${timeline[winEnd].year} Wk${timeline[winEnd].week}`,
      };
    }
    if (maxLose > longestLoseStreak.streak) {
      const startIdx = loseEnd - maxLose + 1;
      longestLoseStreak = {
        streak: maxLose,
        name,
        detail: `${timeline[startIdx].year} Wk${timeline[startIdx].week} → ${timeline[loseEnd].year} Wk${timeline[loseEnd].week}`,
      };
    }
  }

  if (longestWinStreak.streak > 0) {
    records.push({
      title: "Longest Win Streak",
      value: `${longestWinStreak.streak} games`,
      holder: longestWinStreak.name,
      detail: longestWinStreak.detail,
      category: "Streaks",
    });
  }

  if (longestLoseStreak.streak > 0) {
    records.push({
      title: "Longest Losing Streak",
      value: `${longestLoseStreak.streak} games`,
      holder: longestLoseStreak.name,
      detail: longestLoseStreak.detail,
      category: "Streaks",
    });
  }

  // --- All-Time Leaderboard Records ---
  const standings = await getAllTimeStandings(leagueId);

  if (standings.length > 0) {
    const mostAllTimeWins = standings.sort((a, b) => b.wins - a.wins)[0];
    records.push({
      title: "Most All-Time Wins",
      value: `${mostAllTimeWins.wins}`,
      holder: mostAllTimeWins.memberName,
      detail: `${mostAllTimeWins.wins}-${mostAllTimeWins.losses} (${(mostAllTimeWins.winPct * 100).toFixed(1)}%)`,
      category: "All-Time",
    });

    const bestWinPct = [...standings].filter(s => (s.wins + s.losses) >= 10).sort((a, b) => b.winPct - a.winPct)[0];
    if (bestWinPct) {
      records.push({
        title: "Best All-Time Win %",
        value: `${(bestWinPct.winPct * 100).toFixed(1)}%`,
        holder: bestWinPct.memberName,
        detail: `${bestWinPct.wins}-${bestWinPct.losses} (min 10 games)`,
        category: "All-Time",
      });
    }

    const mostAllTimePF = [...standings].sort((a, b) => b.pointsFor - a.pointsFor)[0];
    records.push({
      title: "Most All-Time Points",
      value: mostAllTimePF.pointsFor.toFixed(1),
      holder: mostAllTimePF.memberName,
      detail: `${mostAllTimePF.seasons} seasons`,
      category: "All-Time",
    });

    const mostSeasons = [...standings].sort((a, b) => b.seasons - a.seasons)[0];
    records.push({
      title: "Most Seasons Played",
      value: `${mostSeasons.seasons}`,
      holder: mostSeasons.memberName,
      detail: `${mostSeasons.wins}-${mostSeasons.losses} record`,
      category: "All-Time",
    });
  }

  // --- Average Records ---
  for (const entry of seasonEntries) {
    const gamesPlayed = entry.wins + entry.losses;
    if (gamesPlayed > 0) {
      (entry as unknown as { [key: string]: number }).avgPF = entry.pointsFor / gamesPlayed;
    }
  }

  const withAvg = seasonEntries.filter(e => (e.wins + e.losses) > 0).map(e => ({
    ...e,
    avgPF: e.pointsFor / (e.wins + e.losses),
    avgPA: e.pointsAgainst / (e.wins + e.losses),
  }));

  const highestAvg = withAvg.sort((a, b) => b.avgPF - a.avgPF)[0];
  if (highestAvg) {
    records.push({
      title: "Highest Avg Points/Game (Season)",
      value: highestAvg.avgPF.toFixed(1),
      holder: highestAvg.name,
      detail: `${highestAvg.year} — ${highestAvg.pointsFor.toFixed(1)} total in ${highestAvg.wins + highestAvg.losses} games`,
      category: "Scoring",
    });
  }

  const lowestAvg = [...withAvg].sort((a, b) => a.avgPF - b.avgPF)[0];
  if (lowestAvg) {
    records.push({
      title: "Lowest Avg Points/Game (Season)",
      value: lowestAvg.avgPF.toFixed(1),
      holder: lowestAvg.name,
      detail: `${lowestAvg.year} — ${lowestAvg.pointsFor.toFixed(1)} total in ${lowestAvg.wins + lowestAvg.losses} games`,
      category: "Scoring",
    });
  }

  // --- Top 5 Single-Week Scores ---
  const top5 = allScores.slice(0, 5);
  for (let i = 0; i < top5.length; i++) {
    records.push({
      title: `#${i + 1} Single-Week Score`,
      value: top5[i].score.toFixed(1),
      holder: top5[i].name,
      detail: `${top5[i].team} — Week ${top5[i].week}, ${top5[i].year}`,
      category: "Top Scores",
    });
  }

  // --- Bottom 5 Single-Week Scores ---
  const bottom5 = allScores.slice(-5).reverse();
  for (let i = 0; i < bottom5.length; i++) {
    records.push({
      title: `#${i + 1} Lowest Single-Week Score`,
      value: bottom5[i].score.toFixed(1),
      holder: bottom5[i].name,
      detail: `${bottom5[i].team} — Week ${bottom5[i].week}, ${bottom5[i].year}`,
      category: "Bottom Scores",
    });
  }

  // --- Unlucky / Lucky Records ---
  // Highest score in a loss
  const losses = matchups.filter(m => m.homeScore != null && m.awayScore != null).flatMap(m => {
    const entries: ScoringEntry[] = [];
    if (m.homeScore! < m.awayScore!) {
      entries.push({ score: m.homeScore!, name: m.homeTeam.member.displayName, team: m.homeTeam.name, year: m.week.season.year, week: m.week.weekNumber });
    }
    if (m.awayScore! < m.homeScore!) {
      entries.push({ score: m.awayScore!, name: m.awayTeam.member.displayName, team: m.awayTeam.name, year: m.week.season.year, week: m.week.weekNumber });
    }
    return entries;
  }).sort((a, b) => b.score - a.score);

  if (losses.length > 0) {
    records.push({
      title: "Highest Score in a Loss",
      value: losses[0].score.toFixed(1),
      holder: losses[0].name,
      detail: `${losses[0].team} — Week ${losses[0].week}, ${losses[0].year}`,
      category: "Luck",
    });
  }

  // Lowest score in a win
  const wins = matchups.filter(m => m.homeScore != null && m.awayScore != null).flatMap(m => {
    const entries: ScoringEntry[] = [];
    if (m.homeScore! > m.awayScore!) {
      entries.push({ score: m.homeScore!, name: m.homeTeam.member.displayName, team: m.homeTeam.name, year: m.week.season.year, week: m.week.weekNumber });
    }
    if (m.awayScore! > m.homeScore!) {
      entries.push({ score: m.awayScore!, name: m.awayTeam.member.displayName, team: m.awayTeam.name, year: m.week.season.year, week: m.week.weekNumber });
    }
    return entries;
  }).sort((a, b) => a.score - b.score);

  if (wins.length > 0) {
    records.push({
      title: "Lowest Score in a Win",
      value: wins[0].score.toFixed(1),
      holder: wins[0].name,
      detail: `${wins[0].team} — Week ${wins[0].week}, ${wins[0].year}`,
      category: "Luck",
    });
  }

  return records;
}

// ============================================
// MEMBER CAREER STATS
// ============================================
export async function getMemberCareerStats(leagueId: string, memberId: string) {
  const matchups = await getLeagueMatchups(leagueId);
  const h2h = await getHeadToHead(leagueId, memberId);

  const seasonBreakdown: Map<number, {
    year: number; teamName: string; wins: number; losses: number; ties: number;
    pointsFor: number; pointsAgainst: number; highWeek: number; lowWeek: number;
  }> = new Map();

  let totalWins = 0, totalLosses = 0, totalTies = 0;
  let totalPF = 0, totalPA = 0;
  let highestWeekScore = 0, lowestWeekScore = Infinity;
  const weekScores: number[] = [];

  for (const m of matchups) {
    if (m.homeScore == null || m.awayScore == null) continue;

    let myScore: number, oppScore: number, year: number, teamName: string;

    if (m.homeTeam.member.id === memberId) {
      myScore = m.homeScore; oppScore = m.awayScore;
      year = m.week.season.year; teamName = m.homeTeam.name;
    } else if (m.awayTeam.member.id === memberId) {
      myScore = m.awayScore; oppScore = m.homeScore;
      year = m.week.season.year; teamName = m.awayTeam.name;
    } else continue;

    weekScores.push(myScore);
    totalPF += myScore; totalPA += oppScore;
    if (myScore > highestWeekScore) highestWeekScore = myScore;
    if (myScore < lowestWeekScore) lowestWeekScore = myScore;

    const won = myScore > oppScore;
    const lost = myScore < oppScore;
    if (won) totalWins++; else if (lost) totalLosses++; else totalTies++;

    if (!seasonBreakdown.has(year)) {
      seasonBreakdown.set(year, { year, teamName, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, highWeek: 0, lowWeek: Infinity });
    }
    const s = seasonBreakdown.get(year)!;
    s.teamName = teamName;
    s.pointsFor += myScore; s.pointsAgainst += oppScore;
    if (won) s.wins++; else if (lost) s.losses++; else s.ties++;
    if (myScore > s.highWeek) s.highWeek = myScore;
    if (myScore < s.lowWeek) s.lowWeek = myScore;
  }

  const totalGames = totalWins + totalLosses + totalTies;
  const avgPF = totalGames > 0 ? totalPF / totalGames : 0;

  return {
    totalWins, totalLosses, totalTies, totalGames,
    totalPF, totalPA, avgPF,
    highestWeekScore, lowestWeekScore: lowestWeekScore === Infinity ? 0 : lowestWeekScore,
    winPct: totalGames > 0 ? (totalWins + totalTies * 0.5) / totalGames : 0,
    seasons: Array.from(seasonBreakdown.values()).sort((a, b) => b.year - a.year),
    headToHead: h2h,
    weekScores,
  };
}
