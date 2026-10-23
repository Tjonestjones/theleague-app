// Saves per-player transaction history produced by the ESPN importer service
// (services/espn-importer/transactions.py) into the Transaction table.
//
// Kept free of "@/" imports and Prisma enum values so the backfill script in
// scripts/ can run it directly with Node's TypeScript support.

import type { PrismaClient } from "@prisma/client";

export interface ImportedMove {
  seq: number;
  week: number;
  ts: number | null; // epoch ms; null when only the week is known
  type: "DRAFT" | "ADD" | "WAIVER" | "DROP" | "TRADE";
  player_id: number;
  from_team_id: number | null; // null = free agency / waivers
  to_team_id: number | null;
  source: "LOG" | "ROSTER";
  note?: string | null;
  draft_pick?: number | null;
  draft_round?: number | null;
  waiver_bid?: number | null;
  trade_group?: string | null;
}

export interface ImportedSeasonTransactions {
  year: number;
  teams: { team_id: number; name: string; owner: string }[];
  players: Record<string, { name: string | null; pos: string }>;
  moves: ImportedMove[];
  vetoed_trades: number;
  failed_pages?: string[];
}

export interface SaveResult {
  saved: number;
  trades: number;
  skipped: number;
}

/**
 * Replace a season's transactions with `data`.
 * `teamByPlatformId` maps the platform's team id to our Team.id.
 */
export async function saveSeasonTransactions(
  db: PrismaClient,
  seasonId: string,
  teamByPlatformId: Record<number, string>,
  data: ImportedSeasonTransactions,
): Promise<SaveResult> {
  // 1. Make sure every player exists, keyed by ESPN id
  const espnIds = [...new Set(data.moves.map((m) => m.player_id))];
  const existing = await db.player.findMany({
    where: { espnId: { in: espnIds } },
    select: { id: true, espnId: true },
  });
  const known = new Set(existing.map((p) => p.espnId));
  const missing = espnIds.filter((id) => !known.has(id));
  if (missing.length) {
    await db.player.createMany({
      data: missing.map((id) => ({
        espnId: id,
        name: data.players[String(id)]?.name ?? `Player ${id}`,
        position: data.players[String(id)]?.pos || "UNK",
      })),
      skipDuplicates: true,
    });
  }
  const players = await db.player.findMany({
    where: { espnId: { in: espnIds } },
    select: { id: true, espnId: true },
  });
  const playerByEspnId = new Map(players.map((p) => [p.espnId as number, p.id]));

  // 2. Build rows; a move whose team we can't resolve is skipped, not guessed
  let skipped = 0;
  const rows = [];
  for (const m of data.moves) {
    const playerId = playerByEspnId.get(m.player_id);
    const fromTeamId = m.from_team_id ? teamByPlatformId[m.from_team_id] : null;
    const toTeamId = m.to_team_id ? teamByPlatformId[m.to_team_id] : null;
    if (!playerId || fromTeamId === undefined || toTeamId === undefined) {
      skipped++;
      continue;
    }
    rows.push({
      seasonId,
      type: m.type,
      sequence: m.seq,
      weekNumber: m.week,
      playerId,
      fromTeamId,
      toTeamId,
      tradeGroup: m.trade_group ?? null,
      draftPick: m.draft_pick ?? null,
      draftRound: m.draft_round ?? null,
      waiverBid: m.waiver_bid ?? null,
      source: m.source === "ROSTER" ? ("ROSTER_SNAPSHOT" as const) : ("PLATFORM_LOG" as const),
      note: m.note ?? null,
      processedAt: m.ts ? new Date(m.ts) : null,
    });
  }

  // 3. Replace the season's history in one go so re-imports stay idempotent
  await db.$transaction([
    db.transaction.deleteMany({ where: { seasonId } }),
    db.transaction.createMany({ data: rows }),
  ]);

  return {
    saved: rows.length,
    trades: new Set(rows.map((r) => r.tradeGroup).filter(Boolean)).size,
    skipped,
  };
}
