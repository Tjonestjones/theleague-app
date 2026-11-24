import { cookies } from "next/headers";
import { prisma } from "./db";
import type { EraScope } from "./records";

/**
 * The era selector: a per-league span of seasons, stored in a cookie so every
 * page in the league reads the same window without threading query params.
 */

export const eraCookieName = (leagueId: string) => `era_${leagueId}`;

export interface Era {
  /** Every imported season year for the league, newest first. */
  allYears: number[];
  from: number;
  to: number;
  /** True when the window covers every imported season. */
  isAll: boolean;
  /** Years inside the window, newest first. */
  years: number[];
  /** Pass to the records helpers. Empty when the window is "all seasons". */
  scope: EraScope;
  label: string;
}

export function parseEra(value: string | undefined): { from: number; to: number } | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{4})$/.exec(value);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

export function resolveEra(allYears: number[], saved: { from: number; to: number } | null): Era {
  const sorted = [...allYears].sort((a, b) => b - a);
  const min = sorted.at(-1) ?? 0;
  const max = sorted[0] ?? 0;
  let from = saved ? Math.max(saved.from, min) : min;
  let to = saved ? Math.min(saved.to, max) : max;
  if (from > to) { from = min; to = max; }
  const years = sorted.filter((y) => y >= from && y <= to);
  const isAll = from === min && to === max;
  return {
    allYears: sorted,
    from,
    to,
    isAll,
    years,
    scope: isAll ? {} : { years },
    label: sorted.length === 0 ? "No seasons" : from === to ? String(from) : `${from}–${to}`,
  };
}

export async function getEra(leagueId: string): Promise<Era> {
  const [store, seasons] = await Promise.all([
    cookies(),
    prisma.season.findMany({ where: { leagueId }, select: { year: true } }),
  ]);
  return resolveEra(
    seasons.map((s) => s.year),
    parseEra(store.get(eraCookieName(leagueId))?.value),
  );
}
