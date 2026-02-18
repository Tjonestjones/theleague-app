import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

const SLEEPER_API = "https://api.sleeper.app/v1";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { league_id, leagueId } = await req.json();

    if (!league_id) {
      return NextResponse.json({ error: "Sleeper league ID is required" }, { status: 400 });
    }
    if (!leagueId) {
      return NextResponse.json({ error: "TheLeague leagueId is required" }, { status: 400 });
    }

    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    // 1. Fetch league info
    const leagueRes = await fetch(`${SLEEPER_API}/league/${league_id}`);
    if (!leagueRes.ok) {
      return NextResponse.json({ error: "Sleeper league not found" }, { status: 404 });
    }
    const sleeperLeague = await leagueRes.json();
    const year = parseInt(sleeperLeague.season);

    // 2. Fetch users + rosters
    const [usersRes, rostersRes] = await Promise.all([
      fetch(`${SLEEPER_API}/league/${league_id}/users`),
      fetch(`${SLEEPER_API}/league/${league_id}/rosters`),
    ]);

    const users = usersRes.ok ? await usersRes.json() : [];
    const rosters = rostersRes.ok ? await rostersRes.json() : [];

    // Map owner_id → user display name
    const userMap: Record<string, string> = {};
    for (const u of users) {
      userMap[u.user_id] = u.display_name || u.username || `User ${u.user_id}`;
    }

    // 3. Create Season
    const season = await prisma.season.upsert({
      where: { leagueId_year: { leagueId, year } },
      update: {
        platform: "SLEEPER",
        platformId: league_id,
        syncStatus: "SYNCING",
        numTeams: rosters.length,
      },
      create: {
        leagueId,
        year,
        platform: "SLEEPER",
        platformId: league_id,
        numTeams: rosters.length,
        syncStatus: "SYNCING",
      },
    });

    // 4. Create Members + Teams
    const teamMap: Record<number, string> = {}; // roster_id → Team id

    for (const roster of rosters) {
      const ownerName = userMap[roster.owner_id] || `Team ${roster.roster_id}`;
      const ownerEmail = `sleeper-${league_id}-${roster.roster_id}@imported.theleague.app`;

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

      const teamName = roster.metadata?.team_name || ownerName;
      const team = await prisma.team.upsert({
        where: { seasonId_memberId: { seasonId: season.id, memberId: member.id } },
        update: { name: teamName, platformTeamId: String(roster.roster_id) },
        create: {
          seasonId: season.id,
          memberId: member.id,
          name: teamName,
          platformTeamId: String(roster.roster_id),
        },
      });

      teamMap[roster.roster_id] = team.id;
    }

    // 5. Fetch matchups for each week
    // Sleeper typically has 17 regular season weeks + playoffs
    const totalWeeks = sleeperLeague.settings?.playoff_week_start
      ? sleeperLeague.settings.playoff_week_start + 2 // playoffs are usually 3 weeks
      : 17;

    let weekCount = 0;
    let matchupCount = 0;

    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const matchupsRes = await fetch(`${SLEEPER_API}/league/${league_id}/matchups/${weekNum}`);
      if (!matchupsRes.ok) continue;

      const matchups = await matchupsRes.json();
      if (!matchups || matchups.length === 0) continue;

      const isPlayoff = sleeperLeague.settings?.playoff_week_start
        ? weekNum >= sleeperLeague.settings.playoff_week_start
        : false;

      const week = await prisma.week.upsert({
        where: { seasonId_weekNumber: { seasonId: season.id, weekNumber: weekNum } },
        update: { isPlayoff },
        create: { seasonId: season.id, weekNumber: weekNum, isPlayoff },
      });
      weekCount++;

      // Sleeper matchups: each entry has matchup_id + roster_id + points
      // Group by matchup_id to pair opponents
      const matchupGroups: Record<number, Array<{ roster_id: number; points: number }>> = {};
      for (const m of matchups) {
        if (m.matchup_id == null) continue;
        if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
        matchupGroups[m.matchup_id].push({
          roster_id: m.roster_id,
          points: m.points ?? 0,
        });
      }

      for (const pair of Object.values(matchupGroups)) {
        if (pair.length !== 2) continue;

        const homeTeamId = teamMap[pair[0].roster_id];
        const awayTeamId = teamMap[pair[1].roster_id];
        if (!homeTeamId || !awayTeamId) continue;

        try {
          await prisma.matchup.upsert({
            where: { weekId_homeTeamId: { weekId: week.id, homeTeamId } },
            update: {
              homeScore: pair[0].points,
              awayScore: pair[1].points,
              status: pair[0].points > 0 || pair[1].points > 0 ? "COMPLETED" : "SCHEDULED",
            },
            create: {
              weekId: week.id,
              homeTeamId,
              awayTeamId,
              homeScore: pair[0].points,
              awayScore: pair[1].points,
              status: pair[0].points > 0 || pair[1].points > 0 ? "COMPLETED" : "SCHEDULED",
            },
          });
          matchupCount++;
        } catch (err) {
          console.warn("Skipping matchup:", err);
        }
      }
    }

    // 6. Mark complete
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
      message: `Imported ${Object.keys(teamMap).length} teams, ${weekCount} weeks, ${matchupCount} matchups from Sleeper`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Sleeper import error:", error);
    return NextResponse.json({ error: "Failed to import Sleeper league" }, { status: 500 });
  }
}
