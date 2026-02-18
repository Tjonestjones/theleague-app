import { NextRequest, NextResponse } from "next/server";

const FF_API = "https://www.fleaflicker.com/api";

export async function POST(req: NextRequest) {
  try {
    const { league_id, year } = await req.json();

    if (!league_id) {
      return NextResponse.json({ error: "League ID is required" }, { status: 400 });
    }

    const season = year || new Date().getFullYear();
    const res = await fetch(
      `${FF_API}/FetchLeagueStandings?sport=NFL&league_id=${league_id}&season=${season}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "League not found on Fleaflicker" }, { status: 404 });
    }

    const data = await res.json();
    const league = data.league;

    // Count teams across divisions
    let teamCount = 0;
    if (data.divisions) {
      for (const div of data.divisions) {
        teamCount += div.teams?.length ?? 0;
      }
    }

    return NextResponse.json({
      name: league?.name ?? `League ${league_id}`,
      season,
      size: teamCount,
      id: league?.id,
    });
  } catch (error) {
    console.error("Fleaflicker validation error:", error);
    return NextResponse.json({ error: "Failed to validate Fleaflicker league" }, { status: 500 });
  }
}
