// Syncs real-life NFL regular-season stats from nflverse
// (https://github.com/nflverse/nflverse-data, free, updated through the
// season) for every player in our database that has an ESPN id.
//
// Free of "@/" imports so scripts/sync-nfl-stats.mts can run it directly.

import type { PrismaClient } from "@prisma/client";

const RELEASES = "https://github.com/nflverse/nflverse-data/releases/download";
const FIRST_SEASON = 1999; // earliest season nflverse publishes

// Minimal RFC 4180 CSV parser (nflverse quotes fields that contain commas)
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

async function fetchCsv(url: string): Promise<Record<string, string>[] | null> {
  const res = await fetch(url, { redirect: "follow" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`nflverse ${res.status} for ${url}`);
  return parseCsv(await res.text());
}

const int = (v: string | undefined) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
};

export interface SyncResult {
  matchedPlayers: number;
  seasons: number;
  rows: number;
}

export async function syncNflStats(
  db: PrismaClient,
  opts: { fromSeason?: number; toSeason?: number; log?: (msg: string) => void } = {},
): Promise<SyncResult> {
  const log = opts.log ?? (() => {});

  // 1. Match our players to nflverse ids through their ESPN id
  const ours = await db.player.findMany({ where: { espnId: { gt: 0 } }, select: { id: true, espnId: true, gsisId: true } });
  const byEspn = new Map(ours.map((p) => [String(p.espnId), p]));
  const directory = await fetchCsv(`${RELEASES}/players/players.csv`);
  if (!directory) throw new Error("nflverse players.csv not found");

  const playerByGsis = new Map<string, string>(); // gsis id -> our Player.id
  let earliest = Infinity;
  for (const r of directory) {
    const p = r.espn_id && byEspn.get(r.espn_id);
    if (!p || !r.gsis_id) continue;
    playerByGsis.set(r.gsis_id, p.id);
    if (p.gsisId !== r.gsis_id) {
      await db.player.update({ where: { id: p.id }, data: { gsisId: r.gsis_id } }).catch(() => {
        // another player already holds this gsis id; leave both alone
      });
    }
    if (int(r.rookie_season)) earliest = Math.min(earliest, int(r.rookie_season));
  }
  log(`Matched ${playerByGsis.size} of ${ours.length} players to nflverse`);
  if (!playerByGsis.size) return { matchedPlayers: 0, seasons: 0, rows: 0 };

  // 2. Pull each season's regular-season totals for those players
  const from = Math.max(FIRST_SEASON, opts.fromSeason ?? (Number.isFinite(earliest) ? earliest : FIRST_SEASON));
  const to = opts.toSeason ?? new Date().getFullYear();
  let seasons = 0;
  let total = 0;
  for (let season = from; season <= to; season++) {
    const stats = await fetchCsv(`${RELEASES}/stats_player/stats_player_reg_${season}.csv`);
    if (!stats) continue; // season not published (yet)
    seasons++;

    // A player traded mid-season can appear once per team; sum those rows
    const rows = new Map<string, ReturnType<typeof toRow>>();
    for (const r of stats) {
      const playerId = playerByGsis.get(r.player_id);
      if (!playerId) continue;
      const row = toRow(playerId, season, r);
      const prev = rows.get(playerId);
      rows.set(playerId, prev ? sumRows(prev, row) : row);
    }
    const data = [...rows.values()];
    await db.$transaction([
      db.playerSeasonStat.deleteMany({ where: { season, playerId: { in: data.map((d) => d.playerId) } } }),
      db.playerSeasonStat.createMany({ data }),
    ]);
    total += data.length;
    log(`  ${season}: ${data.length} players`);
  }
  return { matchedPlayers: playerByGsis.size, seasons, rows: total };
}

function toRow(playerId: string, season: number, r: Record<string, string>) {
  return {
    playerId,
    season,
    team: r.recent_team || null,
    games: int(r.games),
    completions: int(r.completions),
    attempts: int(r.attempts),
    passingYards: int(r.passing_yards),
    passingTds: int(r.passing_tds),
    interceptions: int(r.passing_interceptions ?? r.interceptions),
    carries: int(r.carries),
    rushingYards: int(r.rushing_yards),
    rushingTds: int(r.rushing_tds),
    targets: int(r.targets),
    receptions: int(r.receptions),
    receivingYards: int(r.receiving_yards),
    receivingTds: int(r.receiving_tds),
    fgMade: int(r.fg_made),
    fgAttempts: int(r.fg_att),
  };
}

function sumRows(a: ReturnType<typeof toRow>, b: ReturnType<typeof toRow>) {
  const out = { ...a, team: b.team ?? a.team };
  for (const k of Object.keys(a) as (keyof typeof a)[]) {
    if (typeof a[k] === "number" && k !== "season") (out as Record<string, unknown>)[k] = (a[k] as number) + (b[k] as number);
  }
  return out;
}
