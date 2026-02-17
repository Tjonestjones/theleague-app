import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { MemberRole } from "@prisma/client";

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
