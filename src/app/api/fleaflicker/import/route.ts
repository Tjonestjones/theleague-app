import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

const FF_API = "https://www.fleaflicker.com/api";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { league_id, year, leagueId } = await req.json();

    if (!league_id) {
      return NextResponse.json({ error: "Fleaflicker league ID is required" }, { status: 400 });
    }
    if (!leagueId) {
      return NextResponse.json({ error: "TheLeague leagueId is required" }, { status: 400 });
    }

    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    const season_year = year || new Date().getFullYear();

    // 1. Fetch standings (includes teams)
    const standingsRes = await fetch(
      `${FF_API}/FetchLeagueStandings?sport=NFL&league_id=${league_id}&season=${season_year}`
    );
    if (!standingsRes.ok) {
      return NextResponse.json({ error: "Fleaflicker league not found" }, { status: 404 });
    }

    const standingsData = await standingsRes.json();

    // Collect all teams from divisions
    const allTeams: Array<{
      id: number;
      name: string;
      ownerName: string;
    }> = [];

    if (standingsData.divisions) {
      for (const div of standingsData.divisions) {
        for (const team of div.teams ?? []) {
          allTeams.push({
            id: team.id,
            name: team.name ?? `Team ${team.id}`,
            ownerName:
              team.owners?.[0]?.displayName ??
              team.owners?.[0]?.name ??
              team.name ??
              `Owner ${team.id}`,
          });
        }
      }
    }

    // 2. Create Season
    const season = await prisma.season.upsert({
      where: { leagueId_year: { leagueId, year: season_year } },
      update: {
        platform: "FLEAFLICKER",
        platformId: String(league_id),
        syncStatus: "SYNCING",
        numTeams: allTeams.length,
      },
      create: {
        leagueId,
        year: season_year,
        platform: "FLEAFLICKER",
        platformId: String(league_id),
        numTeams: allTeams.length,
        syncStatus: "SYNCING",
      },
    });

    // 3. Create Members + Teams
    const teamMap: Record<number, string> = {}; // FF team_id → our Team id

    for (const ffTeam of allTeams) {
      const ownerEmail = `fleaflicker-${league_id}-${ffTeam.id}@imported.theleague.app`;

      const member = await prisma.member.upsert({
        where: { leagueId_email: { leagueId, email: ownerEmail } },
        update: { displayName: ffTeam.ownerName },
        create: {
          leagueId,
          email: ownerEmail,
          displayName: ffTeam.ownerName,
          role: "MEMBER",
        },
      });

      const team = await prisma.team.upsert({
        where: { seasonId_memberId: { seasonId: season.id, memberId: member.id } },
        update: { name: ffTeam.name, platformTeamId: String(ffTeam.id) },
        create: {
          seasonId: season.id,
          memberId: member.id,
          name: ffTeam.name,
          platformTeamId: String(ffTeam.id),
        },
      });

      teamMap[ffTeam.id] = team.id;
    }

    // 4. Fetch matchups week by week
    let weekCount = 0;
    let matchupCount = 0;

    for (let weekNum = 1; weekNum <= 18; weekNum++) {
      const scoreRes = await fetch(
        `${FF_API}/FetchLeagueScoreboard?sport=NFL&league_id=${league_id}&season=${season_year}&scoring_period=${weekNum}`
      );
      if (!scoreRes.ok) continue;

      const scoreData = await scoreRes.json();
      const games = scoreData.games;
      if (!games || games.length === 0) continue;

      const week = await prisma.week.upsert({
        where: { seasonId_weekNumber: { seasonId: season.id, weekNumber: weekNum } },
        update: {},
        create: { seasonId: season.id, weekNumber: weekNum },
      });
      weekCount++;

      for (const game of games) {
        const homeFFId = game.home?.team?.id;
        const awayFFId = game.away?.team?.id;
        if (!homeFFId || !awayFFId) continue;

        const homeTeamId = teamMap[homeFFId];
        const awayTeamId = teamMap[awayFFId];
        if (!homeTeamId || !awayTeamId) continue;

        const homeScore = game.homeScore?.score?.value ?? game.home?.score?.value ?? null;
        const awayScore = game.awayScore?.score?.value ?? game.away?.score?.value ?? null;

        try {
          await prisma.matchup.upsert({
            where: { weekId_homeTeamId: { weekId: week.id, homeTeamId } },
            update: {
              homeScore,
              awayScore,
              status: homeScore != null ? "COMPLETED" : "SCHEDULED",
            },
            create: {
              weekId: week.id,
              homeTeamId,
              awayTeamId,
              homeScore,
              awayScore,
              status: homeScore != null ? "COMPLETED" : "SCHEDULED",
            },
          });
          matchupCount++;
        } catch (err) {
          console.warn("Skipping Fleaflicker matchup:", err);
        }
      }

      // Small delay to be respectful of rate limits
      await new Promise((r) => setTimeout(r, 200));
    }

    // 5. Mark complete
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
      message: `Imported ${Object.keys(teamMap).length} teams, ${weekCount} weeks, ${matchupCount} matchups from Fleaflicker`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Fleaflicker import error:", error);
    return NextResponse.json({ error: "Failed to import Fleaflicker league" }, { status: 500 });
  }
}
