import { prisma } from "./db";
import { getCurrentUser } from "./auth";

/** The signed-in user's membership in a league (null if not a member). */
export async function getViewer(leagueId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const m = await prisma.member.findFirst({ where: { leagueId, userId: user.id }, select: { id: true, role: true, displayName: true } });
  return {
    userId: user.id,
    memberId: m?.id ?? null,
    memberName: m?.displayName ?? null,
    isCommissioner: m?.role === "COMMISSIONER" || m?.role === "CO_COMMISSIONER",
  };
}

/** Weeks with at least one completed game, ascending. */
export async function completedWeeks(leagueId: string, year: number) {
  const weeks = await prisma.week.findMany({
    where: { season: { leagueId, year }, matchups: { some: { status: "COMPLETED" } } },
    select: { weekNumber: true, isPlayoff: true },
    orderBy: { weekNumber: "asc" },
  });
  return weeks;
}
