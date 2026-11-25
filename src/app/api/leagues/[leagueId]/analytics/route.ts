import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSeasonAnalytics } from "@/lib/analytics";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leagueId } = await params;
  const seasonId = req.nextUrl.searchParams.get("seasonId");

  // Verify membership
  const member = await prisma.member.findFirst({
    where: { leagueId, userId: user.id },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Get seasons
  const seasons = await prisma.season.findMany({
    where: { leagueId },
    select: { id: true, year: true },
    orderBy: { year: "desc" },
  });

  if (seasons.length === 0) {
    return NextResponse.json({ seasons: [], analytics: [] });
  }

  // Only seasons from this league; never trust a seasonId from the query string
  if (seasonId && !seasons.some((s) => s.id === seasonId)) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }
  const targetSeasonId = seasonId || seasons[0].id;
  const analytics = await getSeasonAnalytics(leagueId, targetSeasonId);

  return NextResponse.json({
    seasons: seasons.map((s) => ({ id: s.id, year: s.year })),
    selectedSeasonId: targetSeasonId,
    analytics,
  });
}
