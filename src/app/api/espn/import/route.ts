import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  saveSeasonTransactions,
  type ImportedSeasonTransactions,
  type SaveResult,
} from "@/lib/transactions-import";

const ESPN_SERVICE_URL = process.env.ESPN_SERVICE_URL || "http://127.0.0.1:8001";

// ──────────────────────────────────────────────────────────────────────────────
// Types mirroring the Python service response
// ──────────────────────────────────────────────────────────────────────────────

interface ESPNPlayer {
  player_id: number;
  name: string;
  position: string;
  slot_position: string;
  pro_team: string;
  points: number;
  is_starter: boolean;
}

interface TeamRosterWeek {
  team_id: number;
  week: number;
  players: ESPNPlayer[];
}

interface ESPNImportResponse {
  league: { league_id: number; name: string; year: number; size: number; current_week: number };
  teams: { team_id: number; team_name?: string; name?: string; owner_name: string }[];
  matchups: {
    week: number;
    home_team_id: number;
    home_team_name: string;
    home_score: number;
    away_team_id: number;
    away_team_name: string;
    away_score: number;
  }[];
  rosters: TeamRosterWeek[];
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/espn/import
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { league_id, year, espn_s2, swid, leagueId } = body;

    if (!league_id || !year) {
      return NextResponse.json(
        { error: "Missing required ESPN fields: league_id, year" },
        { status: 400 }
      );
    }
    if (!leagueId) {
      return NextResponse.json(
        { error: "Missing leagueId — create a league first, then import into it" },
        { status: 400 }
      );
    }

    // 2. Must be a commissioner
    const membership = await prisma.member.findFirst({
      where: { leagueId, userId: user.id },
    });
    if (!membership || !["COMMISSIONER", "CO_COMMISSIONER"].includes(membership.role)) {
      return NextResponse.json({ error: "Only commissioners can import data" }, { status: 403 });
    }

    // 3. Build payload for Python service
    const payload: Record<string, unknown> = {
      league_id: parseInt(league_id),
      year: parseInt(year),
    };
    if (espn_s2) payload.espn_s2 = espn_s2;
    if (swid) payload.swid = swid;

    // 4. Call Python ESPN service — 3-minute hard timeout
    let espnData: ESPNImportResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180_000);
      const response = await fetch(`${ESPN_SERVICE_URL}/api/espn/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "ESPN service error" }));
        return NextResponse.json(
          { error: error.detail || "ESPN import failed" },
          { status: response.status }
        );
      }
      espnData = await response.json();
    } catch (fetchErr: unknown) {
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "ESPN import timed out after 3 minutes. Try a shorter year range." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "Could not reach ESPN service. Is it running?" },
        { status: 503 }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SAVE TO DATABASE
    // ──────────────────────────────────────────────────────────────────────────

    // 5. Upsert Season
    const season = await prisma.season.upsert({
      where: { leagueId_year: { leagueId, year: parseInt(year) } },
      update: {
        platform: "ESPN",
        platformId: String(league_id),
        syncStatus: "SYNCING",
        numTeams: espnData.teams?.length ?? 0,
      },
      create: {
        leagueId,
        year: parseInt(year),
        platform: "ESPN",
        platformId: String(league_id),
        numTeams: espnData.teams?.length ?? 0,
        syncStatus: "SYNCING",
      },
    });

    // 6. Upsert Members + Teams
    //    espnTeamId (number) → our Team.id (string)
    const teamMap: Record<number, string> = {};

    if (espnData.teams && Array.isArray(espnData.teams)) {
      for (const espnTeam of espnData.teams) {
        const ownerName =
          espnTeam.owner_name ||
          espnTeam.team_name ||
          espnTeam.name ||
          `Team ${espnTeam.team_id}`;
        const ownerEmail = `espn-${league_id}-${espnTeam.team_id}@imported.theleague.app`;

        const member = await prisma.member.upsert({
          where: { leagueId_email: { leagueId, email: ownerEmail } },
          update: { displayName: ownerName },
          create: {
            leagueId,
            email: ownerEmail,
            displayName: ownerName,
            role: "MEMBER",
          },
        });

        const team = await prisma.team.upsert({
          where: { seasonId_memberId: { seasonId: season.id, memberId: member.id } },
          update: {
            name: espnTeam.team_name || espnTeam.name || ownerName,
            platformTeamId: String(espnTeam.team_id),
          },
          create: {
            seasonId: season.id,
            memberId: member.id,
            name: espnTeam.team_name || espnTeam.name || ownerName,
            platformTeamId: String(espnTeam.team_id),
          },
        });

        teamMap[espnTeam.team_id] = team.id;
      }
    }

    // 7. Upsert Weeks + Matchups
    let weekCount = 0;
    let matchupCount = 0;

    if (espnData.matchups && Array.isArray(espnData.matchups)) {
      // Group by week
      const weekGroups: Record<number, typeof espnData.matchups> = {};
      for (const m of espnData.matchups) {
        const wk = m.week ?? 0;
        if (!weekGroups[wk]) weekGroups[wk] = [];
        weekGroups[wk].push(m);
      }

      for (const [weekNumStr, matchups] of Object.entries(weekGroups)) {
        const weekNumber = parseInt(weekNumStr);
        const week = await prisma.week.upsert({
          where: { seasonId_weekNumber: { seasonId: season.id, weekNumber } },
          update: {},
          create: { seasonId: season.id, weekNumber },
        });
        weekCount++;

        for (const m of matchups) {
          const homeTeamId = teamMap[m.home_team_id];
          const awayTeamId = teamMap[m.away_team_id];
          if (!homeTeamId || !awayTeamId) continue;

          try {
            await prisma.matchup.upsert({
              where: { weekId_homeTeamId: { weekId: week.id, homeTeamId } },
              update: {
                homeScore: m.home_score ?? null,
                awayScore: m.away_score ?? null,
                status: m.home_score != null ? "COMPLETED" : "SCHEDULED",
              },
              create: {
                weekId: week.id,
                homeTeamId,
                awayTeamId,
                homeScore: m.home_score ?? null,
                awayScore: m.away_score ?? null,
                status: m.home_score != null ? "COMPLETED" : "SCHEDULED",
              },
            });
            matchupCount++;
          } catch {
            // skip duplicate/constraint errors silently
          }
        }
      }
    }

    // 8. Save Rosters + Players
    let rosterWeekCount = 0;
    let playerCount = 0;

    if (espnData.rosters && Array.isArray(espnData.rosters)) {
      for (const rosterWeek of espnData.rosters) {
        const ourTeamId = teamMap[rosterWeek.team_id];
        if (!ourTeamId || !rosterWeek.players?.length) continue;

        // Create a Roster record for this team + week
        const roster = await prisma.roster.create({
          data: {
            teamId: ourTeamId,
            weekNumber: rosterWeek.week,
          },
        });
        rosterWeekCount++;

        for (const p of rosterWeek.players) {
          try {
            // Upsert Player by ESPN ID
            const player = await prisma.player.upsert({
              where: { espnId: p.player_id },
              update: {
                name: p.name,
                position: p.position,
                team: p.pro_team || null,
              },
              create: {
                name: p.name,
                position: p.position,
                team: p.pro_team || null,
                espnId: p.player_id,
              },
            });

            // Create RosterSpot
            await prisma.rosterSpot.create({
              data: {
                rosterId: roster.id,
                playerId: player.id,
                position: p.slot_position,
                isStarter: p.is_starter,
                points: p.points ?? null,
              },
            });
            playerCount++;
          } catch {
            // skip constraint/duplicate errors per player
          }
        }
      }
    }

    // 9. Transaction history — every draft pick, add, drop and trade.
    //    Non-fatal: a failure here still leaves the season's scores imported.
    let transactionStats: SaveResult | null = null;
    let transactionWarning: string | null = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 170_000);
      const txResponse = await fetch(`${ESPN_SERVICE_URL}/api/espn/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!txResponse.ok) {
        const error = await txResponse.json().catch(() => ({ detail: "ESPN service error" }));
        transactionWarning = `Transactions not imported: ${error.detail || txResponse.status}`;
      } else {
        const txData: ImportedSeasonTransactions = await txResponse.json();
        transactionStats = await saveSeasonTransactions(prisma, season.id, teamMap, txData);
      }
    } catch (txErr) {
      console.error("ESPN transaction import error:", txErr);
      transactionWarning = "Transactions not imported: the ESPN service didn't respond in time";
    }

    // 10. Mark sync completed
    await prisma.season.update({
      where: { id: season.id },
      data: { syncStatus: "COMPLETED", lastSyncedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      seasonId: season.id,
      leagueId,
      stats: {
        teams: Object.keys(teamMap).length,
        weeks: weekCount,
        matchups: matchupCount,
        rosterWeeks: rosterWeekCount,
        players: playerCount,
        transactions: transactionStats?.saved ?? 0,
        trades: transactionStats?.trades ?? 0,
      },
      warning: transactionWarning,
      message:
        `Imported ${Object.keys(teamMap).length} teams, ${weekCount} weeks, ${matchupCount} matchups, ${playerCount} roster spots across ${rosterWeekCount} team-weeks` +
        (transactionStats ? `, ${transactionStats.saved} transactions (${transactionStats.trades} trades)` : ""),
    });
  } catch (error) {
    console.error("ESPN import error:", error);
    return NextResponse.json(
      { error: "Failed to import ESPN league data" },
      { status: 500 }
    );
  }
}
