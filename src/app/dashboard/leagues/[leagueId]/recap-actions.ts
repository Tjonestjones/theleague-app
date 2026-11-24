"use server";

import type { RecapKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { writeRecap } from "@/lib/recaps";

const KINDS: RecapKind[] = ["WEEKLY", "MANAGER_WEEKLY", "SEASON_STORY", "SEASON_WRAPPED"];

/** Commissioners can write any recap; a manager can write his own weekly recap and Wrapped. */
export async function writeRecapAction(leagueId: string, kind: RecapKind, year: number, week: number, memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first" };
  if (!KINDS.includes(kind)) return { ok: false, error: "Unknown recap type" };
  const membership = await prisma.member.findFirst({ where: { leagueId, userId: user.id }, select: { id: true, role: true } });
  if (!membership) return { ok: false, error: "You're not in this league" };
  const isCommish = membership.role === "COMMISSIONER" || membership.role === "CO_COMMISSIONER";
  const ownRecap = (kind === "MANAGER_WEEKLY" || kind === "SEASON_WRAPPED") && memberId === membership.id;
  if (!isCommish && !ownRecap) return { ok: false, error: "Only the commissioner can write this recap" };
  try {
    await writeRecap(leagueId, kind, year, week, memberId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath(`/dashboard/leagues/${leagueId}`, "layout");
  return { ok: true };
}
