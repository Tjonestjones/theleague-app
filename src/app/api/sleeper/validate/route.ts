import { NextRequest, NextResponse } from "next/server";

const SLEEPER_API = "https://api.sleeper.app/v1";

export async function POST(req: NextRequest) {
  try {
    const { league_id } = await req.json();

    if (!league_id) {
      return NextResponse.json({ error: "League ID is required" }, { status: 400 });
    }

    const res = await fetch(`${SLEEPER_API}/league/${league_id}`);
    if (!res.ok) {
      return NextResponse.json({ error: "League not found on Sleeper" }, { status: 404 });
    }

    const league = await res.json();

    // Fetch users/members
    const usersRes = await fetch(`${SLEEPER_API}/league/${league_id}/users`);
    const users = usersRes.ok ? await usersRes.json() : [];

    return NextResponse.json({
      name: league.name,
      season: league.season,
      size: league.total_rosters || league.settings?.num_teams || users.length,
      status: league.status,
      sport: league.sport,
      scoring: league.scoring_settings ? "custom" : "default",
      members: users.length,
    });
  } catch (error) {
    console.error("Sleeper validation error:", error);
    return NextResponse.json({ error: "Failed to validate Sleeper league" }, { status: 500 });
  }
}
