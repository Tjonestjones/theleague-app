import { prisma } from "./db";
import type { EraScope } from "./records";

export interface DraftPickRow {
  seasonId: string;
  year: number;
  round: number;
  overall: number;
  playerId: string;
  name: string;
  position: string;
  teamId: string;
  memberId: string;
  memberName: string;
  projected: number | null;
  actual: number | null;
  /** actual ÷ projected, when both exist */
  ret: number | null;
}

async function loadPicks(leagueId: string, scope: EraScope): Promise<DraftPickRow[]> {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const [txs, fantasy] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: "DRAFT", season: seasonWhere, toTeamId: { not: null } },
      select: {
        seasonId: true, draftPick: true, draftRound: true, sequence: true,
        season: { select: { year: true } },
        player: { select: { id: true, name: true, position: true } },
        toTeam: { select: { id: true, member: { select: { id: true, displayName: true } } } },
      },
      orderBy: [{ season: { year: "asc" } }, { sequence: "asc" }],
    }),
    prisma.playerFantasySeason.findMany({
      where: { season: seasonWhere },
      select: { playerId: true, seasonId: true, projectedPoints: true, actualPoints: true },
    }),
  ]);
  const fs = new Map(fantasy.map((f) => [`${f.seasonId}|${f.playerId}`, f]));
  const perSeason = new Map<string, number>();
  return txs.map((t) => {
    const n = (perSeason.get(t.seasonId) ?? 0) + 1;
    perSeason.set(t.seasonId, n);
    const f = fs.get(`${t.seasonId}|${t.player.id}`);
    const projected = f?.projectedPoints ?? null;
    const actual = f?.actualPoints ?? null;
    return {
      seasonId: t.seasonId,
      year: t.season.year,
      round: t.draftRound ?? 0,
      overall: t.draftPick ?? n,
      playerId: t.player.id,
      name: t.player.name,
      position: t.player.position,
      teamId: t.toTeam!.id,
      memberId: t.toTeam!.member.id,
      memberName: t.toTeam!.member.displayName,
      projected,
      actual,
      ret: projected && projected > 0 && actual != null ? actual / projected : null,
    };
  });
}

const ratio = (rows: DraftPickRow[]) => {
  const ok = rows.filter((r) => r.ret != null);
  const p = ok.reduce((s, r) => s + r.projected!, 0);
  const a = ok.reduce((s, r) => s + r.actual!, 0);
  return { ret: p > 0 ? a / p : null, projected: p, actual: a, n: ok.length };
};

// ─────────────────────────────────────────────────────────────────────────────
// Draft report
// ─────────────────────────────────────────────────────────────────────────────

export async function getDraftReport(leagueId: string, scope: EraScope = {}, boardYear?: number) {
  const picks = await loadPicks(leagueId, scope);
  const hasProjections = picks.some((p) => p.ret != null);
  const early = (p: DraftPickRow) => p.round >= 1 && p.round <= 5;

  const byMember = new Map<string, DraftPickRow[]>();
  for (const p of picks) {
    if (!byMember.has(p.memberId)) byMember.set(p.memberId, []);
    byMember.get(p.memberId)!.push(p);
  }
  const managers = [...byMember.values()].map((rows) => {
    const e = rows.filter(early);
    const er = ratio(e);
    const withRet = e.filter((r) => r.ret != null);
    return {
      memberId: rows[0].memberId,
      memberName: rows[0].memberName,
      picks: rows.length,
      earlyReturn: er.ret,
      earlyShortfall: er.projected - er.actual,
      allReturn: ratio(rows).ret,
      bustRate: withRet.length ? withRet.filter((r) => r.ret! < 0.6).length / withRet.length : null,
      hitRate: withRet.length ? withRet.filter((r) => r.ret! > 1.2).length / withRet.length : null,
      earlyN: withRet.length,
    };
  }).sort((a, b) => (b.earlyReturn ?? -1) - (a.earlyReturn ?? -1));

  const leagueEarly = ratio(picks.filter(early)).ret;

  // Rounds 1–5 return by season × manager
  const years = [...new Set(picks.map((p) => p.year))].sort((a, b) => a - b);
  const matrix = managers.map((m) => ({
    memberId: m.memberId,
    memberName: m.memberName,
    byYear: years.map((y) => ratio(picks.filter((p) => p.memberId === m.memberId && p.year === y && early(p))).ret),
  }));

  const withRet = picks.filter((p) => p.ret != null);
  const busts = withRet.filter((p) => p.round >= 1 && p.round <= 4 && (p.projected ?? 0) >= 100).sort((a, b) => a.ret! - b.ret!).slice(0, 12);
  const steals = withRet.filter((p) => p.round >= 6).sort((a, b) => (b.actual ?? 0) - (a.actual ?? 0)).slice(0, 12);

  // Draft board for one season
  const year = boardYear && years.includes(boardYear) ? boardYear : years.at(-1);
  const boardPicks = picks.filter((p) => p.year === year).sort((a, b) => a.overall - b.overall);
  const order: { teamId: string; memberId: string; memberName: string }[] = [];
  for (const p of boardPicks.filter((x) => x.round === 1)) {
    if (!order.some((o) => o.teamId === p.teamId)) order.push({ teamId: p.teamId, memberId: p.memberId, memberName: p.memberName });
  }
  for (const p of boardPicks) {
    if (!order.some((o) => o.teamId === p.teamId)) order.push({ teamId: p.teamId, memberId: p.memberId, memberName: p.memberName });
  }
  const rounds = Math.max(0, ...boardPicks.map((p) => p.round));
  const board = Array.from({ length: rounds }, (_, i) =>
    order.map((o) => boardPicks.find((p) => p.round === i + 1 && p.teamId === o.teamId) ?? null),
  );

  return { hasProjections, managers, leagueEarly, years, matrix, busts, steals, board: { year, order, rows: board }, pickCount: picks.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Availability: games the drafted core actually played
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailPick extends DraftPickRow {
  played: number;
  available: number;
  missed: number;
}

const SKIP = new Set(["K", "D/ST", "DST", "DEF"]);

export async function getAvailabilityReport(leagueId: string, scope: EraScope = {}) {
  const seasonWhere = scope.years ? { leagueId, year: { in: scope.years } } : { leagueId };
  const [picksAll, seasons] = await Promise.all([
    loadPicks(leagueId, scope),
    prisma.season.findMany({
      where: seasonWhere,
      select: { id: true, year: true, playoffStartWeek: true, weeks: { select: { weekNumber: true, isPlayoff: true } } },
    }),
  ]);
  const picks = picksAll.filter((p) => !SKIP.has(p.position));
  const regWeeks = new Map(
    seasons.map((s) => [
      s.year,
      s.playoffStartWeek ? s.playoffStartWeek - 1 : s.weeks.filter((w) => !w.isPlayoff).length,
    ]),
  );
  const logs = await prisma.playerGameLog.findMany({
    where: { season: { in: [...regWeeks.keys()] }, playerId: { in: [...new Set(picks.map((p) => p.playerId))] } },
    select: { playerId: true, season: true, week: true },
  });
  const hasLogs = logs.length > 0;
  const played = new Map<string, number>();
  for (const l of logs) {
    const W = regWeeks.get(l.season) ?? 0;
    if (l.week > W) continue;
    const k = `${l.season}|${l.playerId}`;
    played.set(k, (played.get(k) ?? 0) + 1);
  }

  // Every team's bye falls inside the fantasy regular season, so available = W − 1.
  const rows: AvailPick[] = picks.map((p) => {
    const W = regWeeks.get(p.year) ?? 0;
    const available = Math.max(0, W - 1);
    const pl = Math.min(available, played.get(`${p.year}|${p.playerId}`) ?? 0);
    return { ...p, played: pl, available, missed: available - pl };
  });

  const pct = (rs: AvailPick[]) => {
    const a = rs.reduce((s, r) => s + r.available, 0);
    return a ? rs.reduce((s, r) => s + r.missed, 0) / a : null;
  };
  const slices: { label: string; max: number }[] = [
    { label: "Rounds 1–2", max: 2 },
    { label: "Rounds 1–3", max: 3 },
    { label: "Rounds 1–5", max: 5 },
    { label: "Rounds 1–8", max: 8 },
    { label: "All picks", max: 99 },
  ];
  const early = (r: AvailPick) => r.round >= 1 && r.round <= 5;

  const byMember = new Map<string, AvailPick[]>();
  for (const r of rows) {
    if (!byMember.has(r.memberId)) byMember.set(r.memberId, []);
    byMember.get(r.memberId)!.push(r);
  }
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const managers = [...byMember.values()]
    .map((rs) => {
      const e = rs.filter(early);
      return {
        memberId: rs[0].memberId,
        memberName: rs[0].memberName,
        seasons: new Set(rs.map((r) => r.year)).size,
        earlyPicks: e.length,
        earlyMissed: e.reduce((s, r) => s + r.missed, 0),
        earlyAvailable: e.reduce((s, r) => s + r.available, 0),
        earlyPct: pct(e),
        slices: slices.map((sl) => pct(rs.filter((r) => r.round >= 1 && r.round <= sl.max))),
        incidence: [1, 3, 5, 8].map((n) => (e.length ? e.filter((r) => r.missed >= n).length / e.length : null)),
        byYear: years.map((y) => pct(e.filter((r) => r.year === y))),
      };
    })
    .sort((a, b) => (b.earlyPct ?? -1) - (a.earlyPct ?? -1));

  const leagueEarly = pct(rows.filter(early));
  const mostMissed = rows.filter(early).sort((a, b) => b.missed - a.missed || a.overall - b.overall).slice(0, 15);

  return { hasLogs, managers, leagueEarly, slices: slices.map((s) => s.label), years, mostMissed, regWeeks: Object.fromEntries(regWeeks) };
}
