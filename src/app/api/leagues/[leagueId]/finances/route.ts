import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

// GET — list all finance entries for a league
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leagueId } = await params;

    const yearParam = req.nextUrl.searchParams.get("year");
    const typeParam = req.nextUrl.searchParams.get("type");
    const memberParam = req.nextUrl.searchParams.get("memberId");

    const where: Record<string, unknown> = { leagueId };
    if (yearParam) where.year = parseInt(yearParam);
    if (typeParam) where.type = typeParam;
    if (memberParam) where.memberId = memberParam;

    const finances = await prisma.finance.findMany({
      where,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });

    // Get members for display names
    const members = await prisma.member.findMany({
      where: { leagueId },
      select: { id: true, displayName: true },
    });
    const memberMap: Record<string, string> = {};
    for (const m of members) memberMap[m.id] = m.displayName;

    // Compute summary
    const summary = {
      totalDues: 0,
      totalCollected: 0,
      totalOwed: 0,
      totalPayouts: 0,
      totalFines: 0,
    };

    for (const f of finances) {
      if (f.type === "DUES") {
        summary.totalDues += f.amount;
        if (f.status === "PAID") summary.totalCollected += f.amount;
        else if (f.status === "UNPAID") summary.totalOwed += f.amount;
      } else if (f.type === "PAYOUT") {
        summary.totalPayouts += f.amount;
      } else if (f.type === "FINE") {
        summary.totalFines += f.amount;
        if (f.status === "PAID") summary.totalCollected += f.amount;
        else if (f.status === "UNPAID") summary.totalOwed += f.amount;
      }
    }

    return NextResponse.json({
      finances: finances.map((f) => ({
        ...f,
        memberName: f.memberId ? memberMap[f.memberId] ?? "Unknown" : "League-wide",
      })),
      summary,
      members: members.map((m) => ({ id: m.id, name: m.displayName })),
    });
  } catch (error) {
    console.error("Error fetching finances:", error);
    return NextResponse.json({ error: "Failed to fetch finances" }, { status: 500 });
  }
}

// POST — create a finance entry (commissioner only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leagueId } = await params;
    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    const body = await req.json();
    const { type, amount, year, memberId, description, dueDate, status } = body;

    if (!type || amount == null || !year) {
      return NextResponse.json({ error: "type, amount, and year are required" }, { status: 400 });
    }

    const finance = await prisma.finance.create({
      data: {
        leagueId,
        type,
        amount: parseFloat(amount),
        year: parseInt(year),
        memberId: memberId || null,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || "UNPAID",
      },
    });

    return NextResponse.json({ finance }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Error creating finance entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
