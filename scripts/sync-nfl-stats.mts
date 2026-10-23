// Pull real-life NFL regular-season stats from nflverse for every player in
// the database (matched by ESPN id). Safe to re-run; run weekly during the
// season to keep "near a milestone" current.
//
//   node scripts/sync-nfl-stats.mts [fromSeason] [toSeason]

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { syncNflStats } from "../src/lib/nfl-stats-sync.ts";

const [from, to] = process.argv.slice(2).map(Number);
const db = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })) });

try {
  const res = await syncNflStats(db, {
    fromSeason: from || undefined,
    toSeason: to || undefined,
    log: (m) => console.log(m),
  });
  console.log(`Done: ${res.rows} player-seasons across ${res.seasons} seasons for ${res.matchedPlayers} players`);
} finally {
  await db.$disconnect();
}
