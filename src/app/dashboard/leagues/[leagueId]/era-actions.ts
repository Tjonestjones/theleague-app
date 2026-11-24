"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eraCookieName } from "@/lib/era";

export async function setEra(leagueId: string, from: number | null, to: number | null) {
  const store = await cookies();
  const name = eraCookieName(leagueId);
  if (from == null || to == null) {
    store.delete(name);
  } else {
    store.set(name, `${Math.min(from, to)}-${Math.max(from, to)}`, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  revalidatePath(`/dashboard/leagues/${leagueId}`, "layout");
}
