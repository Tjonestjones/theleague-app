import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { yahooFetch, getLeagueKey } from "@/lib/yahoo";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = req.cookies.get("yahoo_access_token")?.value;
    const refreshToken = req.cookies.get("yahoo_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not connected to Yahoo" }, { status: 401 });
    }

    const { league_id, year, leagueId } = await req.json();

    if (!league_id || !leagueId) {
      return NextResponse.json({ error: "Missing league_id or leagueId" }, { status: 400 });
    }

    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    const season_year = year || new Date().getFullYear();
    const leagueKey = getLeagueKey(season_year, league_id);
    if (!leagueKey) {
      return NextResponse.json({ error: `Unsupported season: ${season_year}` }, { status: 400 });
    }

    // 1. Fetch standings (includes teams)
    const standingsResult = await yahooFetch(
      `/league/${leagueKey}/standings`,
      accessToken,
      refreshToken
    );
    if (!standingsResult) {
      return NextResponse.json({ error: "Failed to fetch Yahoo standings" }, { status: 500 });
    }

    // Parse Yahoo's nested JSON structure
    const fantasyContent = standingsResult.data.fantasy_content as Record<string, unknown>;
    const leagueArr = (fantasyContent?.league as unknown[]) ?? [];
    const standingsObj = leagueArr[1] as Record<string, unknown> | undefined;
    const teamsObj = (standingsObj?.standings as Record<string, unknown>[])?.[0]?.teams as Record<string, unknown> | undefined;

    const yahooTeams: Array<{
      team_key: string;
      name: string;
      manager: string;
    }> = [];

    if (teamsObj) {
      const teamCount = (teamsObj.count as number) ?? 0;
      for (let i = 0; i < teamCount; i++) {
        const teamEntry = teamsObj[String(i)] as Record<string, unknown> | undefined;
        if (!teamEntry) continue;
        const teamInfo = (teamEntry.team as unknown[])?.[0] as unknown[] | undefined;
        if (!teamInfo) continue;

        let teamKey = "";
        let teamName = "";
        let managerName = "";

        for (const item of teamInfo) {
          if (Array.isArray(item)) continue;
          const obj = item as Record<string, unknown>;
          if (obj.team_key) teamKey = obj.team_key as string;
          if (obj.name) teamName = obj.name as string;
          if (obj.managers) {
            const managers = (obj.managers as unknown[]) ?? [];
            const mgr = (managers[0] as Record<string, unknown>)?.manager as Record<string, unknown> | undefined;
            managerName = (mgr?.nickname as string) ?? "";
          }
        }

        if (teamKey) {
          yahooTeams.push({
            team_key: teamKey,
            name: teamName || `Team ${i + 1}`,
            manager: managerName || teamName || `Manager ${i + 1}`,
          });
        }
      }
    }

    // 2. Create Season
    const season = await prisma.season.upsert({
      where: { leagueId_year: { leagueId, year: season_year } },
      update: {
        platform: "YAHOO",
        platformId: leagueKey,
        syncStatus: "SYNCING",
        numTeams: yahooTeams.length,
      },
      create: {
        leagueId,
        year: season_year,
        platform: "YAHOO",
        platformId: leagueKey,
        numTeams: yahooTeams.length,
        syncStatus: "SYNCING",
      },
    });

    // 3. Create Members + Teams
    const teamMap: Record<string, string> = {}; // yahoo team_key → our Team id

    for (const yt of yahooTeams) {
      const ownerEmail = `yahoo-${league_id}-${yt.team_key}@imported.theleague.app`;

      const member = await prisma.member.upsert({
        where: { leagueId_email: { leagueId, email: ownerEmail } },
        update: { displayName: yt.manager },
        create: {
          leagueId,
          email: ownerEmail,
          displayName: yt.manager,
          role: "MEMBER",
        },
      });

      const team = await prisma.team.upsert({
        where: { seasonId_memberId: { seasonId: season.id, memberId: member.id } },
        update: { name: yt.name, platformTeamId: yt.team_key },
        create: {
          seasonId: season.id,
          memberId: member.id,
          name: yt.name,
          platformTeamId: yt.team_key,
        },
      });

      teamMap[yt.team_key] = team.id;
    }

    // 4. Fetch matchups week by week
    let weekCount = 0;
    let matchupCount = 0;

    for (let weekNum = 1; weekNum <= 17; weekNum++) {
      const scoreResult = await yahooFetch(
        `/league/${leagueKey}/scoreboard;week=${weekNum}`,
        accessToken,
        refreshToken
      );
      if (!scoreResult) continue;

      const fc = scoreResult.data.fantasy_content as Record<string, unknown>;
      const la = (fc?.league as unknown[]) ?? [];
      const scoreboardObj = la[1] as Record<string, unknown> | undefined;
      const matchupsObj = (scoreboardObj?.scoreboard as Record<string, unknown>)?.[
        "0"
      ] as Record<string, unknown> | undefined;
      const matchupsData = matchupsObj?.matchups as Record<string, unknown> | undefined;

      if (!matchupsData) continue;

      const week = await prisma.week.upsert({
        where: { seasonId_weekNumber: { seasonId: season.id, weekNumber: weekNum } },
        update: {},
        create: { seasonId: season.id, weekNumber: weekNum },
      });
      weekCount++;

      const matchCount = (matchupsData.count as number) ?? 0;
      for (let mi = 0; mi < matchCount; mi++) {
        const matchEntry = matchupsData[String(mi)] as Record<string, unknown> | undefined;
        const matchup = matchEntry?.matchup as Record<string, unknown> | undefined;
        if (!matchup) continue;

        const teamsInMatchup = (matchup["0"] as Record<string, unknown>)?.teams as Record<string, unknown> | undefined;
        if (!teamsInMatchup) continue;

        const teamEntries: Array<{ team_key: string; points: number }> = [];

        for (let ti = 0; ti < 2; ti++) {
          const te = teamsInMatchup[String(ti)] as Record<string, unknown> | undefined;
          const teamArr = (te?.team as unknown[]) ?? [];
          const teamInfoArr = teamArr[0] as unknown[] | undefined;
          const teamPoints = teamArr[1] as Record<string, unknown> | undefined;

          let tk = "";
          if (Array.isArray(teamInfoArr)) {
            for (const item of teamInfoArr) {
              if (item && typeof item === "object" && !Array.isArray(item) && (item as Record<string, unknown>).team_key) {
                tk = (item as Record<string, unknown>).team_key as string;
                break;
              }
            }
          }

          const pts = parseFloat(
            ((teamPoints?.team_points as Record<string, unknown>)?.total as string) ?? "0"
          );

          if (tk) teamEntries.push({ team_key: tk, points: pts });
        }

        if (teamEntries.length === 2) {
          const homeTeamId = teamMap[teamEntries[0].team_key];
          const awayTeamId = teamMap[teamEntries[1].team_key];
          if (!homeTeamId || !awayTeamId) continue;

          try {
            await prisma.matchup.upsert({
              where: { weekId_homeTeamId: { weekId: week.id, homeTeamId } },
              update: {
                homeScore: teamEntries[0].points,
                awayScore: teamEntries[1].points,
                status: "COMPLETED",
              },
              create: {
                weekId: week.id,
                homeTeamId,
                awayTeamId,
                homeScore: teamEntries[0].points,
                awayScore: teamEntries[1].points,
                status: "COMPLETED",
              },
            });
            matchupCount++;
          } catch (err) {
            console.warn("Skipping Yahoo matchup:", err);
          }
        }
      }

      // Rate limit: Yahoo allows 20k/day, but be polite
      await new Promise((r) => setTimeout(r, 300));
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
      message: `Imported ${Object.keys(teamMap).length} teams, ${weekCount} weeks, ${matchupCount} matchups from Yahoo`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Yahoo import error:", error);
    return NextResponse.json({ error: "Failed to import Yahoo league" }, { status: 500 });
  }
}
