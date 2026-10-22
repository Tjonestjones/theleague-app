// Backfill a league's transaction history from a file built by
// services/espn-importer/transactions.py.
//
//   node scripts/load-espn-transactions.mts <league id or slug> <seasons.json>
//
// Seasons and teams that haven't been imported yet are created (same member
// convention as /api/espn/import), so this also works on a fresh league.
// Re-running replaces each season's transactions.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  saveSeasonTransactions,
  type ImportedSeasonTransactions,
} from "../src/lib/transactions-import.ts";

interface SeasonsFile {
  platform: "ESPN";
  league_id: number;
  seasons: ImportedSeasonTransactions[];
}

const [leagueArg, file] = process.argv.slice(2);
if (!leagueArg || !file) {
  console.error("Usage: node scripts/load-espn-transactions.mts <league id or slug> <seasons.json>");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })) });

try {
  const data: SeasonsFile = JSON.parse(readFileSync(file, "utf8"));
  const league = await db.league.findFirst({ where: { OR: [{ id: leagueArg }, { slug: leagueArg }] } });
  if (!league) throw new Error(`No league with id or slug "${leagueArg}"`);
  console.log(`Loading ${data.seasons.length} seasons into "${league.name}"`);

  for (const s of [...data.seasons].sort((a, b) => a.year - b.year)) {
    const season = await db.season.upsert({
      where: { leagueId_year: { leagueId: league.id, year: s.year } },
      update: {},
      create: {
        leagueId: league.id,
        year: s.year,
        platform: "ESPN",
        platformId: String(data.league_id),
        numTeams: s.teams.length,
        syncStatus: "COMPLETED",
        lastSyncedAt: new Date(),
      },
      include: { teams: true },
    });

    const teamByPlatformId: Record<number, string> = {};
    for (const t of season.teams) {
      if (t.platformTeamId) teamByPlatformId[Number(t.platformTeamId)] = t.id;
    }
    for (const t of s.teams) {
      if (teamByPlatformId[t.team_id]) continue;
      const email = `espn-${data.league_id}-${t.team_id}@imported.theleague.app`;
      // Same convention as /api/espn/import: one member per ESPN team slot,
      // named after the slot's most recent owner (seasons load oldest first).
      const member = await db.member.upsert({
        where: { leagueId_email: { leagueId: league.id, email } },
        update: { displayName: t.owner || t.name },
        create: { leagueId: league.id, email, displayName: t.owner || t.name, role: "MEMBER" },
      });
      const team = await db.team.upsert({
        where: { seasonId_memberId: { seasonId: season.id, memberId: member.id } },
        update: { platformTeamId: String(t.team_id) },
        create: { seasonId: season.id, memberId: member.id, name: t.name, platformTeamId: String(t.team_id) },
      });
      teamByPlatformId[t.team_id] = team.id;
    }

    const res = await saveSeasonTransactions(db, season.id, teamByPlatformId, s);
    console.log(
      `  ${s.year}: ${res.saved} moves, ${res.trades} trades` +
        (res.skipped ? `, ${res.skipped} skipped (team not found)` : "") +
        (s.vetoed_trades ? `, ${s.vetoed_trades} vetoed trades not stored` : ""),
    );
  }
} finally {
  await db.$disconnect();
}
