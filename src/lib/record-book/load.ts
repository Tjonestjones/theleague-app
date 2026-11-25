import { cache } from "react";
import { prisma } from "@/lib/db";
import type { BookData, BookMove } from "./engine";

/**
 * Everything the record book engine needs for one league, loaded once per
 * request (record pages and the overview share it).
 */
export const loadRecordBookData = cache(async (leagueId: string): Promise<BookData> => {
  const [members, seasons, lineups, transactions, draftPicks] = await Promise.all([
    prisma.member.findMany({ where: { leagueId }, select: { id: true, displayName: true } }),
    prisma.season.findMany({
      where: { leagueId },
      select: {
        year: true,
        numTeams: true,
        teams: { select: { id: true, memberId: true, name: true } },
        weeks: {
          select: {
            weekNumber: true,
            isPlayoff: true,
            matchups: {
              where: { status: "COMPLETED", homeScore: { not: null }, awayScore: { not: null } },
              select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
            },
          },
        },
      },
    }),
    prisma.roster.findMany({
      where: { team: { season: { leagueId } }, weekNumber: { not: null } },
      select: {
        teamId: true,
        weekNumber: true,
        team: { select: { season: { select: { year: true } } } },
        spots: {
          select: {
            playerId: true,
            position: true,
            isStarter: true,
            points: true,
            player: { select: { name: true, position: true } },
          },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { season: { leagueId }, status: "COMPLETED" },
      select: {
        type: true, sequence: true, weekNumber: true, playerId: true,
        fromTeamId: true, toTeamId: true, tradeGroup: true, draftPick: true, draftRound: true,
        season: { select: { year: true } },
        player: { select: { name: true, position: true } },
      },
    }),
    prisma.draftPick.findMany({
      where: { draft: { season: { leagueId } } },
      select: {
        teamId: true, playerId: true, round: true, overallPick: true,
        draft: { select: { season: { select: { year: true } } } },
        player: { select: { name: true, position: true } },
      },
    }),
  ]);

  const moves: BookMove[] = transactions.map((t) => ({
    year: t.season.year,
    week: t.weekNumber,
    sequence: t.sequence,
    type: t.type,
    playerId: t.playerId,
    playerName: t.player.name,
    playerPosition: t.player.position,
    fromTeamId: t.fromTeamId,
    toTeamId: t.toTeamId,
    tradeGroup: t.tradeGroup,
    draftRound: t.draftRound,
    draftPick: t.draftPick,
  }));

  // Seasons whose draft lives only in the Draft table, not the transaction log
  const draftedYears = new Set(moves.filter((m) => m.type === "DRAFT").map((m) => m.year));
  for (const p of draftPicks) {
    if (draftedYears.has(p.draft.season.year)) continue;
    moves.push({
      year: p.draft.season.year, week: null, sequence: p.overallPick, type: "DRAFT",
      playerId: p.playerId, playerName: p.player.name, playerPosition: p.player.position,
      fromTeamId: null, toTeamId: p.teamId, tradeGroup: null, draftRound: p.round, draftPick: p.overallPick,
    });
  }

  return {
    members: members.map((m) => ({ id: m.id, name: m.displayName })),
    seasons: seasons.map((s) => ({ year: s.year, numTeams: s.numTeams })),
    teams: seasons.flatMap((s) => s.teams.map((t) => ({ id: t.id, memberId: t.memberId, year: s.year, name: t.name }))),
    games: seasons.flatMap((s) =>
      s.weeks.flatMap((w) =>
        w.matchups.map((m) => ({
          year: s.year, week: w.weekNumber, isPlayoff: w.isPlayoff,
          homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId,
          homeScore: m.homeScore!, awayScore: m.awayScore!,
        })),
      ),
    ),
    lineups: lineups.map((l) => ({
      teamId: l.teamId,
      year: l.team.season.year,
      week: l.weekNumber!,
      spots: l.spots.map((s) => ({
        playerId: s.playerId,
        playerName: s.player.name,
        position: s.player.position,
        slot: s.position,
        isStarter: s.isStarter,
        points: s.points ?? 0,
      })),
    })),
    moves,
  };
});
