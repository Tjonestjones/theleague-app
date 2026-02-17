import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function POST(
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
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Check if already a member
    const existingMember = await prisma.member.findUnique({
      where: { leagueId_email: { leagueId, email } },
    });
    if (existingMember) {
      return NextResponse.json({ error: "This email is already a member" }, { status: 400 });
    }

    // Check for existing pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: { leagueId, email, status: "PENDING" },
    });
    if (existingInvite) {
      const inviteUrl = `${req.nextUrl.origin}/invite/${existingInvite.token}`;
      return NextResponse.json({ invite: existingInvite, inviteUrl });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.invite.create({
      data: {
        leagueId,
        senderId: user.id,
        email,
        token,
        expiresAt,
      },
    });

    const inviteUrl = `${req.nextUrl.origin}/invite/${token}`;

    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
