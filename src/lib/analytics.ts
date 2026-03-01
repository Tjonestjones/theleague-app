import { prisma } from "@/lib/db";

/**
 * Standard fantasy lineup slots (ESPN-style).
 * Calculates optimal lineup by assigning best players to required positions.
 */
const LINEUP_SLOTS = [
  { slot: "QB", count: 1, eligible: ["QB"] },
  { slot: "RB", count: 2, eligible: ["RB"] },
  { slot: "WR", count: 2, eligible: ["WR"] },
  { slot: "TE", count: 1, eligible: ["TE"] },
  { slot: "FLEX", count: 1, eligible: ["RB", "WR", "TE"] },
  { slot: "D/ST", count: 1, eligible: ["D/ST", "DEF", "DST"] },
  { slot: "K", count: 1, eligible: ["K"] },
];

function calculateMaxPotential(
  players: { position: string; points: number }[]
): number {
  // Greedy optimal lineup solver
  // Sort all players by points descending
  const available = players
    .filter((p) => p.points != null)
    .map((p) => ({ ...p, used: false }));

  let maxPoints = 0;

  // Fill each slot greedily (most constrained slots first — K, D/ST, QB, TE, then RB/WR, then FLEX)
  const slotOrder = [...LINEUP_SLOTS].sort((a, b) => a.eligible.length - b.eligible.length);

  for (const slot of slotOrder) {
    for (let i = 0; i < slot.count; i++) {
      let bestIdx = -1;
      let bestPts = -1;

      for (let j = 0; j < available.length; j++) {
        if (
          !available[j].used &&
          slot.eligible.includes(available[j].position) &&
          available[j].points > bestPts
        ) {
          bestIdx = j;
          bestPts = available[j].points;
        }
      }

      if (bestIdx >= 0) {
        available[bestIdx].used = true;
        maxPoints += bestPts;
      }
    }
  }

  return maxPoints;
}

export interface TeamWeekAnalytics {
  weekNumber: number;
  actualPoints: number;
  maxPotentialPoints: number;
  efficiency: number; // 0-1
}

export interface TeamAnalytics {
  teamId: string;
  teamName: string;
  memberName: string;
  memberId: string;
  weeks: TeamWeekAnalytics[];
  avgActual: number;
  avgMax: number;
  avgEfficiency: number;
  totalPointsLeft: number;
}

export async function getSeasonAnalytics(
  leagueId: string,
  seasonId: string
): Promise<TeamAnalytics[]> {
  // Get all teams for this season
  const teams = await prisma.team.findMany({
    where: { seasonId },
    include: {
      member: { select: { displayName: true, id: true } },
      rosters: {
        include: {
          spots: {
            include: { player: { select: { position: true } } },
          },
        },
        orderBy: { weekNumber: "asc" },
      },
      homeMatchups: {
        include: { week: { select: { weekNumber: true } } },
      },
      awayMatchups: {
        include: { week: { select: { weekNumber: true } } },
      },
    },
  });

  const results: TeamAnalytics[] = [];

  for (const team of teams) {
    const weeks: TeamWeekAnalytics[] = [];

    // Build matchup scores map
    const matchupScores = new Map<number, number>();
    for (const m of team.homeMatchups) {
      if (m.homeScore != null) matchupScores.set(m.week.weekNumber, m.homeScore);
    }
    for (const m of team.awayMatchups) {
      if (m.awayScore != null) matchupScores.set(m.week.weekNumber, m.awayScore);
    }

    // Process each roster week
    for (const roster of team.rosters) {
      if (roster.weekNumber == null) continue;
      if (roster.spots.length === 0) continue;

      // Actual points from matchup or sum of starter points
      const matchupScore = matchupScores.get(roster.weekNumber);
      const starterPoints = roster.spots
        .filter((s) => s.isStarter && s.points != null)
        .reduce((sum, s) => sum + (s.points ?? 0), 0);

      const actualPoints = matchupScore ?? starterPoints;
      if (actualPoints === 0 && !matchupScore) continue;

      // Calculate max potential from ALL rostered players
      const allPlayers = roster.spots
        .filter((s) => s.points != null)
        .map((s) => ({
          position: s.player?.position ?? s.position,
          points: s.points ?? 0,
        }));

      const maxPotentialPoints = calculateMaxPotential(allPlayers);
      const efficiency = maxPotentialPoints > 0 ? actualPoints / maxPotentialPoints : 1;

      weeks.push({
        weekNumber: roster.weekNumber,
        actualPoints,
        maxPotentialPoints,
        efficiency: Math.min(efficiency, 1),
      });
    }

    if (weeks.length === 0) continue;

    const totalActual = weeks.reduce((s, w) => s + w.actualPoints, 0);
    const totalMax = weeks.reduce((s, w) => s + w.maxPotentialPoints, 0);

    results.push({
      teamId: team.id,
      teamName: team.name,
      memberName: team.member.displayName,
      memberId: team.member.id,
      weeks: weeks.sort((a, b) => a.weekNumber - b.weekNumber),
      avgActual: totalActual / weeks.length,
      avgMax: totalMax / weeks.length,
      avgEfficiency: totalMax > 0 ? totalActual / totalMax : 1,
      totalPointsLeft: totalMax - totalActual,
    });
  }

  // Sort by efficiency descending
  results.sort((a, b) => b.avgEfficiency - a.avgEfficiency);

  return results;
}
