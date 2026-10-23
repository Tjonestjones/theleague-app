import { prisma } from "./db";
import type { Prisma, TransactionType } from "@prisma/client";

// ============================================
// TRANSACTION HISTORY — queries for the league
// transactions page, player journeys and member pages
// ============================================

export const TRANSACTION_TYPES: TransactionType[] = ["DRAFT", "WAIVER", "ADD", "DROP", "TRADE"];

export const TYPE_LABEL: Record<TransactionType, string> = {
  DRAFT: "Draft",
  WAIVER: "Waiver claim",
  ADD: "Free agent",
  DROP: "Drop",
  TRADE: "Trade",
};

export const PAGE_SIZE = 100;

// ESPN and most platforms run on US time; render dates there so a 10pm move
// doesn't show up as the next day.
const DISPLAY_TZ = "America/New_York";

export function formatMoveDate(d: Date | null, withYear = true): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    timeZone: DISPLAY_TZ,
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatMoveTime(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { timeZone: DISPLAY_TZ, hour: "numeric", minute: "2-digit" });
}

export interface TransactionFilters {
  season?: number;
  type?: TransactionType;
  memberId?: string;
  q?: string;
}

const teamSelect = {
  select: { id: true, name: true, member: { select: { id: true, displayName: true } } },
} as const;

const moveInclude = {
  season: { select: { year: true } },
  player: { select: { id: true, name: true, position: true } },
  fromTeam: teamSelect,
  toTeam: teamSelect,
} satisfies Prisma.TransactionInclude;

export type MoveRow = Prisma.TransactionGetPayload<{ include: typeof moveInclude }>;

function buildWhere(leagueId: string, f: TransactionFilters): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [{ season: { leagueId } }];
  if (f.season) and.push({ season: { year: f.season } });
  if (f.type) and.push({ type: f.type });
  if (f.memberId) and.push({ OR: [{ fromTeam: { memberId: f.memberId } }, { toTeam: { memberId: f.memberId } }] });
  if (f.q) and.push({ player: { name: { contains: f.q, mode: "insensitive" } } });
  return { AND: and };
}

/** Paged list of moves, newest first, plus counts by type for the same filters. */
export async function getTransactions(leagueId: string, filters: TransactionFilters, page = 1) {
  const where = buildWhere(leagueId, filters);
  const countsWhere = buildWhere(leagueId, { ...filters, type: undefined });

  const [rows, total, byType, tradeGroups] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: moveInclude,
      orderBy: [{ season: { year: "desc" } }, { sequence: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type"], where: countsWhere, _count: { _all: true } }),
    prisma.transaction.findMany({
      where: { ...countsWhere, type: "TRADE" },
      distinct: ["seasonId", "tradeGroup"],
      select: { id: true },
    }),
  ]);

  const counts = Object.fromEntries(TRANSACTION_TYPES.map((t) => [t, 0])) as Record<TransactionType, number>;
  for (const g of byType) counts[g.type] = g._count._all;

  return { rows, total, counts, tradeCount: tradeGroups.length, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export interface TradeSide {
  teamId: string;
  teamName: string;
  memberId: string;
  memberName: string;
  receives: { playerId: string; name: string; position: string }[];
}

export interface Trade {
  group: string;
  year: number;
  week: number | null;
  processedAt: Date | null;
  oneSided: boolean;
  sides: TradeSide[];
}

/** Every trade, newest first, with what each side received. */
export async function getTrades(leagueId: string, filters: Pick<TransactionFilters, "season" | "memberId" | "q">) {
  // Find matching trade groups first, then load every row of those trades so
  // a player filter still shows the whole trade.
  const hits = await prisma.transaction.findMany({
    where: { ...buildWhere(leagueId, filters), type: "TRADE" },
    distinct: ["seasonId", "tradeGroup"],
    select: { seasonId: true, tradeGroup: true },
  });
  if (!hits.length) return [];

  const rows = await prisma.transaction.findMany({
    where: {
      type: "TRADE",
      OR: hits.map((h) => ({ seasonId: h.seasonId, tradeGroup: h.tradeGroup })),
    },
    include: moveInclude,
    orderBy: [{ season: { year: "desc" } }, { sequence: "desc" }],
  });
  return groupTrades(rows);
}

export function groupTrades(rows: MoveRow[]): Trade[] {
  const byGroup = new Map<string, MoveRow[]>();
  for (const r of rows) {
    const key = `${r.seasonId}|${r.tradeGroup}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(r);
  }
  const trades: Trade[] = [];
  for (const ms of byGroup.values()) {
    const sides = new Map<string, TradeSide>();
    const side = (t: MoveRow["toTeam"]) => {
      if (!t) return null;
      if (!sides.has(t.id)) {
        sides.set(t.id, { teamId: t.id, teamName: t.name, memberId: t.member.id, memberName: t.member.displayName, receives: [] });
      }
      return sides.get(t.id)!;
    };
    for (const m of ms) {
      side(m.fromTeam);
      side(m.toTeam)?.receives.push({ playerId: m.player.id, name: m.player.name, position: m.player.position });
    }
    const first = ms[0];
    trades.push({
      group: first.tradeGroup ?? "",
      year: first.season.year,
      week: first.weekNumber,
      processedAt: first.processedAt,
      oneSided: new Set(ms.map((m) => `${m.fromTeamId}>${m.toTeamId}`)).size < 2,
      sides: [...sides.values()],
    });
  }
  return trades;
}

/** One player's full path through the league, oldest first. */
export async function getPlayerJourney(leagueId: string, playerId: string) {
  const [player, moves] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId }, select: { id: true, name: true, position: true, team: true } }),
    prisma.transaction.findMany({
      where: { playerId, season: { leagueId } },
      include: moveInclude,
      orderBy: [{ season: { year: "asc" } }, { sequence: "asc" }],
    }),
  ]);

  const managers = new Set<string>();
  for (const m of moves) {
    if (m.fromTeam) managers.add(m.fromTeam.member.id);
    if (m.toTeam) managers.add(m.toTeam.member.id);
  }
  const count = (t: TransactionType) => moves.filter((m) => m.type === t).length;
  return {
    player,
    moves,
    stats: {
      drafted: count("DRAFT"),
      claimed: count("WAIVER"),
      added: count("ADD"),
      dropped: count("DROP"),
      traded: count("TRADE"),
      managers: managers.size,
      seasons: new Set(moves.map((m) => m.season.year)).size,
    },
  };
}

/** Counts and recent moves for a member's page. */
export async function getMemberTransactionSummary(leagueId: string, memberId: string) {
  const mine: Prisma.TransactionWhereInput = {
    season: { leagueId },
    OR: [{ fromTeam: { memberId } }, { toTeam: { memberId } }],
  };
  const [byType, trades, recent] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { season: { leagueId }, toTeam: { memberId } },
      _count: { _all: true },
    }),
    prisma.transaction.findMany({ where: { ...mine, type: "TRADE" }, distinct: ["seasonId", "tradeGroup"], select: { id: true } }),
    prisma.transaction.findMany({ where: mine, include: moveInclude, orderBy: [{ season: { year: "desc" } }, { sequence: "desc" }], take: 8 }),
  ]);
  const drops = await prisma.transaction.count({ where: { season: { leagueId }, type: "DROP", fromTeam: { memberId } } });
  const got = (t: TransactionType) => byType.find((g) => g.type === t)?._count._all ?? 0;
  return {
    drafted: got("DRAFT"),
    claimed: got("WAIVER"),
    added: got("ADD"),
    dropped: drops,
    trades: trades.length,
    recent,
  };
}

/** Seasons and managers that appear in the league's history, for filters. */
export async function getTransactionFilterOptions(leagueId: string) {
  const [seasons, members] = await Promise.all([
    prisma.season.findMany({
      where: { leagueId, transactions: { some: {} } },
      select: { year: true },
      orderBy: { year: "desc" },
    }),
    prisma.member.findMany({
      where: { leagueId, teams: { some: { OR: [{ transactionsIn: { some: {} } }, { transactionsOut: { some: {} } }] } } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  return { seasons: seasons.map((s) => s.year), members };
}

/** Plain-English description of one move, used on the player page. */
export function describeMove(m: MoveRow): string {
  const to = m.toTeam?.member.displayName ?? "";
  const from = m.fromTeam?.member.displayName ?? "";
  switch (m.type) {
    case "DRAFT":
      return `Drafted by ${to}${m.draftRound ? ` — round ${m.draftRound}, pick ${m.draftPick}` : ""}`;
    case "WAIVER":
      return `Claimed off waivers by ${to}${m.waiverBid ? ` for $${m.waiverBid}` : ""}`;
    case "ADD":
      return `Picked up by ${to}`;
    case "DROP":
      return `Dropped by ${from}`;
    case "TRADE":
      return `Traded from ${from} to ${to}`;
  }
}
