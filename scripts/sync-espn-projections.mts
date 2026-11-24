// Backfill ESPN season projections + actual totals (league scoring) for every
// imported ESPN season. Needed for draft returns on the Draft page. Safe to
// re-run. Private leagues need ESPN_S2 and ESPN_SWID in the environment.
//
//   ESPN_SERVICE_URL=http://127.0.0.1:8001 node scripts/sync-espn-projections.mts [leagueId]

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { syncSeasonProjections } from "../src/lib/fantasy-seasons.ts";

const [leagueId] = process.argv.slice(2);
const db = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })) });
const serviceUrl = process.env.ESPN_SERVICE_URL || "http://127.0.0.1:8001";
const auth = process.env.ESPN_S2 && process.env.ESPN_SWID ? { espn_s2: process.env.ESPN_S2, swid: process.env.ESPN_SWID } : {};

try {
  const seasons = await db.season.findMany({
    where: { platform: "ESPN", ...(leagueId ? { leagueId } : {}) },
    select: { id: true, year: true, platformId: true },
    orderBy: { year: "asc" },
  });
  for (const s of seasons) {
    try {
      const n = await syncSeasonProjections(db, serviceUrl, s, auth);
      console.log(`${s.year}: ${n} players`);
    } catch (e) {
      console.error(`${s.year}: ${(e as Error).message}`);
    }
  }
} finally {
  await db.$disconnect();
}
