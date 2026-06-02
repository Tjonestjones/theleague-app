import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { MemberRole } from "@prisma/client";

// ── Subscription helpers ──────────────────────────────────────────────────────

export type LeagueAccess =
  | { ok: true; daysLeft: number | null }           // active or trial with days remaining
  | { ok: false; reason: "expired" | "canceled" };  // needs upgrade

export async function getLeagueAccess(leagueId: string): Promise<LeagueAccess> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });

  if (!league) return { ok: false, reason: "expired" };

  const { subscriptionStatus, trialEndsAt } = league;

  if (subscriptionStatus === "ACTIVE") {
    return { ok: true, daysLeft: null };
  }

  if (subscriptionStatus === "TRIAL") {
    if (!trialEndsAt) return { ok: true, daysLeft: 7 };
    const msLeft = trialEndsAt.getTime() - Date.now();
    if (msLeft > 0) {
      return { ok: true, daysLeft: Math.ceil(msLeft / (1000 * 60 * 60 * 24)) };
    }
    return { ok: false, reason: "expired" };
  }

  if (subscriptionStatus === "CANCELED") return { ok: false, reason: "canceled" };
  return { ok: false, reason: "expired" };
}

// ── End subscription helpers ──────────────────────────────────────────────────

export async function getCurrentUser() {
  const user = await currentUser();
  if (!user) return null;

  return prisma.user.upsert({
    where: { clerkId: user.id },
    update: {
      email: user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    },
    create: {
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    },
  });
}

export async function getMemberRole(leagueId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { leagueId, userId },
  });
  return member?.role ?? null;
}

export async function requireRole(
  leagueId: string,
  userId: string,
  roles: MemberRole[]
) {
  const role = await getMemberRole(leagueId, userId);
  if (!role || !roles.includes(role)) {
    throw new Error("Unauthorized");
  }
  return role;
}
