import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { league: { select: { name: true } } },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json({ error: "This invite has already been used or expired" }, { status: 400 });
    }

    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    return NextResponse.json({ leagueName: invite.league.name, email: invite.email });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }
}
