import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        members: {
          include: { user: { select: { firstName: true, lastName: true, imageUrl: true } } },
          orderBy: { joinedAt: "asc" },
        },
        seasons: {
          include: {
            _count: { select: { teams: true, weeks: true } },
          },
          orderBy: { year: "desc" },
        },
        _count: { select: { members: true, seasons: true } },
      },
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Check membership
    const isMember = league.members.some((m) => m.userId === user.id);
    if (!isMember && league.visibility === "PRIVATE") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json({ league });
  } catch (error) {
    console.error("Error fetching league:", error);
    return NextResponse.json({ error: "Failed to fetch league" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;
    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    const body = await req.json();
    const { name, description, visibility } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (visibility !== undefined) updateData.visibility = visibility;

    const league = await prisma.league.update({
      where: { id: leagueId },
      data: updateData,
    });

    return NextResponse.json({ league });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Error updating league:", error);
    return NextResponse.json({ error: "Failed to update league" }, { status: 500 });
  }
}
