// Saves ESPN season projections and actual totals (league scoring) for the
// players rostered in one of our seasons. Free of "@/" imports so scripts can
// use it directly.

import type { PrismaClient } from "@prisma/client";

export interface ImportedPlayerSeason {
  player_id: number; // ESPN id
  projected: number | null;
  actual: number | null;
}

/** ESPN ids of every player rostered or drafted in the season. */
export async function seasonEspnPlayerIds(db: PrismaClient, seasonId: string): Promise<number[]> {
  const players = await db.player.findMany({
    where: {
      espnId: { not: null },
      OR: [
        { rosterSpots: { some: { roster: { team: { seasonId } } } } },
        { transactions: { some: { seasonId, type: "DRAFT" } } },
      ],
    },
    select: { espnId: true },
  });
  return players.map((p) => p.espnId!).filter((id) => id > 0);
}

export async function saveFantasySeasons(db: PrismaClient, seasonId: string, rows: ImportedPlayerSeason[]) {
  const ours = await db.player.findMany({
    where: { espnId: { in: rows.map((r) => r.player_id) } },
    select: { id: true, espnId: true },
  });
  const byEspn = new Map(ours.map((p) => [p.espnId!, p.id]));
  const data = rows
    .filter((r) => byEspn.has(r.player_id) && (r.projected != null || r.actual != null))
    .map((r) => ({ playerId: byEspn.get(r.player_id)!, seasonId, projectedPoints: r.projected, actualPoints: r.actual }));
  await db.$transaction([
    db.playerFantasySeason.deleteMany({ where: { seasonId, playerId: { in: data.map((d) => d.playerId) } } }),
    db.playerFantasySeason.createMany({ data }),
  ]);
  return data.length;
}

/** Ask the ESPN service for one season's projections and save them. */
export async function syncSeasonProjections(
  db: PrismaClient,
  serviceUrl: string,
  season: { id: string; year: number; platformId: string | null },
  auth: { espn_s2?: string; swid?: string } = {},
) {
  if (!season.platformId) return 0;
  const ids = await seasonEspnPlayerIds(db, season.id);
  if (!ids.length) return 0;
  const res = await fetch(`${serviceUrl}/api/espn/player-seasons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ league_id: Number(season.platformId), year: season.year, player_ids: ids, ...auth }),
    signal: AbortSignal.timeout(130_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.status }));
    throw new Error(`ESPN projections: ${err.detail ?? res.status}`);
  }
  return saveFantasySeasons(db, season.id, (await res.json()) as ImportedPlayerSeason[]);
}
