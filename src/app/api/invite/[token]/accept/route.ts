import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to accept this invite" }, { status: 401 });
    }

    const { token } = await params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { league: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    }

    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    // Check if already a member
    const existingMember = await prisma.member.findFirst({
      where: { leagueId: invite.leagueId, userId: user.id },
    });

    if (existingMember) {
      // Mark invite as accepted anyway
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), recipientId: user.id },
      });
      return NextResponse.json({ leagueId: invite.leagueId, message: "Already a member" });
    }

    // Create member + mark invite accepted in a transaction
    await prisma.$transaction([
      prisma.member.create({
        data: {
          leagueId: invite.leagueId,
          userId: user.id,
          email: user.email,
          displayName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
          role: "MEMBER",
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), recipientId: user.id },
      }),
    ]);

    return NextResponse.json({ leagueId: invite.leagueId, message: "Welcome to the league!" });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
