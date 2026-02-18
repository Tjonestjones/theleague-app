import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

// PATCH — update a finance entry (mark paid, edit, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string; financeId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leagueId, financeId } = await params;
    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "PAID") updateData.paidAt = new Date();
      if (body.status === "UNPAID") updateData.paidAt = null;
    }
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.memberId !== undefined) updateData.memberId = body.memberId || null;

    const finance = await prisma.finance.update({
      where: { id: financeId },
      data: updateData,
    });

    return NextResponse.json({ finance });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Error updating finance:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

// DELETE — remove a finance entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string; financeId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leagueId, financeId } = await params;
    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    await prisma.finance.delete({ where: { id: financeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Error deleting finance:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
