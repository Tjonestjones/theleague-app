import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

// POST — bulk generate dues for all members
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leagueId } = await params;
    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    const { amount, year, dueDate } = await req.json();

    if (!amount || !year) {
      return NextResponse.json({ error: "amount and year are required" }, { status: 400 });
    }

    // Get all members
    const members = await prisma.member.findMany({
      where: { leagueId },
      select: { id: true, displayName: true },
    });

    // Check for existing dues this year
    const existing = await prisma.finance.findMany({
      where: { leagueId, year: parseInt(year), type: "DUES" },
      select: { memberId: true },
    });
    const existingMemberIds = new Set(existing.map((e) => e.memberId));

    // Create dues for members who don't already have one
    let created = 0;
    for (const member of members) {
      if (existingMemberIds.has(member.id)) continue;

      await prisma.finance.create({
        data: {
          leagueId,
          type: "DUES",
          amount: parseFloat(amount),
          year: parseInt(year),
          memberId: member.id,
          description: `${year} League Dues`,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: "UNPAID",
        },
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      skipped: members.length - created,
      message: `Generated dues for ${created} members (${members.length - created} already had dues)`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Error generating dues:", error);
    return NextResponse.json({ error: "Failed to generate dues" }, { status: 500 });
  }
}
