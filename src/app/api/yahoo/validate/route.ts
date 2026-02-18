import { NextRequest, NextResponse } from "next/server";
import { yahooFetch, getLeagueKey } from "@/lib/yahoo";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("yahoo_access_token")?.value;
    const refreshToken = req.cookies.get("yahoo_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Not connected to Yahoo. Please authorize first." },
        { status: 401 }
      );
    }

    const { league_id, year } = await req.json();

    if (!league_id) {
      return NextResponse.json({ error: "Yahoo league ID is required" }, { status: 400 });
    }

    const season = year || new Date().getFullYear();
    const leagueKey = getLeagueKey(season, league_id);
    if (!leagueKey) {
      return NextResponse.json({ error: `Unsupported season year: ${season}` }, { status: 400 });
    }

    const result = await yahooFetch(`/league/${leagueKey}`, accessToken, refreshToken);
    if (!result) {
      return NextResponse.json({ error: "Failed to fetch Yahoo league" }, { status: 404 });
    }

    const league = (result.data as Record<string, unknown>).fantasy_content as Record<string, unknown>;
    const leagueData = league?.league as Record<string, unknown>[] | undefined;
    const info = Array.isArray(leagueData) ? leagueData[0] : leagueData;

    const response = NextResponse.json({
      name: (info as Record<string, unknown>)?.name ?? `League ${league_id}`,
      season,
      size: (info as Record<string, unknown>)?.num_teams ?? 0,
      league_key: leagueKey,
    });

    // Update access token cookie if it was refreshed
    if (result.newAccessToken) {
      response.cookies.set("yahoo_access_token", result.newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Yahoo validation error:", error);
    return NextResponse.json({ error: "Failed to validate Yahoo league" }, { status: 500 });
  }
}
