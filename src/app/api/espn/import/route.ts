import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ESPN_SERVICE_URL = process.env.ESPN_SERVICE_URL || "http://127.0.0.1:8001";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { league_id, year, espn_s2, swid, leagueId } = body;

    if (!league_id || !year) {
      return NextResponse.json({ error: "Missing required ESPN fields: league_id, year" }, { status: 400 });
    }

    if (!leagueId) {
      return NextResponse.json(
        { error: "Missing leagueId — create a league first, then import into it" },
        { status: 400 }
      );
    }

    // Verify user is a commissioner of this league
    const membership = await prisma.member.findFirst({
      where: { leagueId, userId: user.id },
    });
    if (!membership || !["COMMISSIONER", "CO_COMMISSIONER"].includes(membership.role)) {
      return NextResponse.json({ error: "Only commissioners can import data" }, { status: 403 });
    }

    // Build payload — cookies are optional (only needed for private leagues)
    const payload: Record<string, unknown> = {
      league_id: parseInt(league_id),
      year: parseInt(year),
    };
    if (espn_s2) payload.espn_s2 = espn_s2;
    if (swid) payload.swid = swid;

    // Call Python ESPN service
    const response = await fetch(`${ESPN_SERVICE_URL}/api/espn/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || "ESPN import failed" },
        { status: response.status }
      );
    }

    const espnData = await response.json();

    // ========================================
    // SAVE TO DATABASE
    // ========================================

    // 1. Create or update Season
    const season = await prisma.season.upsert({
      where: {
        leagueId_year: { leagueId, year: parseInt(year) },
      },
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

    // 2. Create Members + Teams for each ESPN team
    const teamMap: Record<number, string> = {}; // ESPN team_id → our Team id

    if (espnData.teams && Array.isArray(espnData.teams)) {
      for (const espnTeam of espnData.teams) {
        const ownerName = espnTeam.owner_name || espnTeam.owner || espnTeam.team_name || `Team ${espnTeam.team_id}`;
        const ownerEmail = `espn-${league_id}-${espnTeam.team_id}@imported.theleague.app`;

        // Upsert member (by league + email combo)
        const member = await prisma.member.upsert({
          where: {
            leagueId_email: { leagueId, email: ownerEmail },
          },
          update: { displayName: ownerName },
          create: {
            leagueId,
            email: ownerEmail,
            displayName: ownerName,
            role: "MEMBER",
          },
        });

        // Upsert team
        const team = await prisma.team.upsert({
          where: {
            seasonId_memberId: { seasonId: season.id, memberId: member.id },
          },
          update: {
            name: espnTeam.team_name || ownerName,
            platformTeamId: String(espnTeam.team_id),
          },
          create: {
            seasonId: season.id,
            memberId: member.id,
            name: espnTeam.team_name || ownerName,
            platformTeamId: String(espnTeam.team_id),
          },
        });

        teamMap[espnTeam.team_id] = team.id;
      }
    }

    // 3. Create Weeks + Matchups
    let weekCount = 0;
    let matchupCount = 0;

    if (espnData.matchups && Array.isArray(espnData.matchups)) {
      // Group matchups by week
      const weekGroups: Record<number, typeof espnData.matchups> = {};
      for (const m of espnData.matchups) {
        const wk = m.week ?? m.matchup_period ?? 0;
        if (!weekGroups[wk]) weekGroups[wk] = [];
        weekGroups[wk].push(m);
      }

      for (const [weekNum, matchups] of Object.entries(weekGroups)) {
        const week = await prisma.week.upsert({
          where: {
            seasonId_weekNumber: { seasonId: season.id, weekNumber: parseInt(weekNum) },
          },
          update: {},
          create: {
            seasonId: season.id,
            weekNumber: parseInt(weekNum),
          },
        });
        weekCount++;

        for (const m of matchups) {
          const homeTeamId = teamMap[m.home_team_id ?? m.home_id];
          const awayTeamId = teamMap[m.away_team_id ?? m.away_id];

          if (!homeTeamId || !awayTeamId) continue;

          // Use upsert to avoid duplicates
          try {
            await prisma.matchup.upsert({
              where: {
                weekId_homeTeamId: { weekId: week.id, homeTeamId },
              },
              update: {
                homeScore: m.home_score ?? m.home_points ?? null,
                awayScore: m.away_score ?? m.away_points ?? null,
                status: m.home_score != null ? "COMPLETED" : "SCHEDULED",
              },
              create: {
                weekId: week.id,
                homeTeamId,
                awayTeamId,
                homeScore: m.home_score ?? m.home_points ?? null,
                awayScore: m.away_score ?? m.away_points ?? null,
                status: m.home_score != null ? "COMPLETED" : "SCHEDULED",
              },
            });
            matchupCount++;
          } catch (err) {
            // Skip duplicate matchup errors
            console.warn("Skipping matchup:", err);
          }
        }
      }
    }

    // 4. Mark sync as completed
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
      },
      message: `Imported ${Object.keys(teamMap).length} teams, ${weekCount} weeks, ${matchupCount} matchups`,
    });
  } catch (error) {
    console.error("ESPN import error:", error);
    return NextResponse.json(
      { error: "Failed to import ESPN league data" },
      { status: 500 }
    );
  }
}
