import type { EraScope } from "./records";
import { loadTeamWeeks, type TeamWeek } from "./luck";

export interface TrendItem {
  id: string;
  tag: "Streak" | "Heater" | "Slump" | "Record" | "Luck" | "Rivalry" | "Trajectory" | "League";
  title: string;
  detail: string;
  /** 0–100, used to sort the feed */
  weight: number;
  href?: string;
  year?: number;
}

const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export async function getTrends(leagueId: string, scope: EraScope = {}): Promise<{ items: TrendItem[]; ppgBySeason: { year: number; ppg: number }[] }> {
  const tw = await loadTeamWeeks(leagueId, scope);
  const base = `/dashboard/leagues/${leagueId}`;
  const items: TrendItem[] = [];
  if (!tw.length) return { items, ppgBySeason: [] };

  const years = [...new Set(tw.map((t) => t.year))].sort((a, b) => a - b);
  const latest = years.at(-1)!;
  const byMember = new Map<string, TeamWeek[]>();
  for (const t of [...tw].sort((a, b) => a.year - b.year || a.week - b.week)) {
    if (!byMember.has(t.memberId)) byMember.set(t.memberId, []);
    byMember.get(t.memberId)!.push(t);
  }

  for (const [memberId, games] of byMember) {
    const name = games[0].memberName;
    const cur = games.filter((g) => g.year === latest);
    const mHref = `${base}/members/${memberId}`;

    // 1. Streak at the end of the latest season
    if (cur.length) {
      let s = 0;
      const last = cur.at(-1)!.result;
      for (let i = cur.length - 1; i >= 0 && cur[i].result === last && last !== "T"; i--) s++;
      if (s >= 3) {
        items.push({
          id: `streak-${memberId}`, tag: "Streak", year: latest, href: mHref,
          title: `${name} ${last === "W" ? "won" : "lost"} ${s} straight`,
          detail: `Through week ${cur.at(-1)!.week} of ${latest}.`,
          weight: 40 + s * 8,
        });
      }

      // 2. Heater / slump: last 3 weeks vs season average
      if (cur.length >= 6) {
        const avg = cur.reduce((x, g) => x + g.score, 0) / cur.length;
        const last3 = cur.slice(-3).reduce((x, g) => x + g.score, 0) / 3;
        const d = (last3 - avg) / avg;
        if (Math.abs(d) >= 0.12) {
          items.push({
            id: `form-${memberId}`, tag: d > 0 ? "Heater" : "Slump", year: latest, href: mHref,
            title: `${name} ${d > 0 ? "is on a heater" : "has gone cold"}: ${r1(last3)} a week over the last three`,
            detail: `Season average ${r1(avg)} (${d > 0 ? "+" : ""}${Math.round(d * 100)}%).`,
            weight: 30 + Math.abs(d) * 150,
          });
        }
      }

      // 3. Luck this season
      const exp = cur.reduce((x, g) => x + (g.n > 1 ? (g.n - g.rank) / (g.n - 1) : 0), 0);
      const wins = cur.filter((g) => g.result === "W").length;
      const luck = wins - exp;
      if (Math.abs(luck) >= 1.75) {
        items.push({
          id: `luck-${memberId}`, tag: "Luck", year: latest, href: `${base}/luck`,
          title: `${name} has ${luck > 0 ? `${r1(luck)} more` : `${r1(-luck)} fewer`} wins than his scores deserve`,
          detail: `${wins} wins against ${r1(exp)} expected in ${latest}.`,
          weight: 35 + Math.abs(luck) * 10,
        });
      }

      // 4. Top-half losses in a row
      let thl = 0;
      for (let i = cur.length - 1; i >= 0; i--) {
        if (cur[i].result === "L" && cur[i].rank <= cur[i].n / 2) thl++;
        else break;
      }
      if (thl >= 2) {
        items.push({
          id: `thl-${memberId}`, tag: "Luck", year: latest, href: mHref,
          title: `${name} has lost ${thl} straight while scoring in the top half`,
          detail: `Most recently ${r1(cur.at(-1)!.score)} in week ${cur.at(-1)!.week}, ${cur.at(-1)!.rank} of ${cur.at(-1)!.n}.`,
          weight: 30 + thl * 10,
        });
      }
    }

    // 5. Trajectory: PPG up or down three seasons running
    const ppg = years.map((y) => {
      const g = games.filter((x) => x.year === y);
      return g.length ? g.reduce((s, x) => s + x.score, 0) / g.length : null;
    });
    const tail = ppg.slice(-3);
    if (tail.length === 3 && tail.every((v) => v != null)) {
      const [a, b, c] = tail as number[];
      if (a < b && b < c && (c - a) / a > 0.06) {
        items.push({ id: `up-${memberId}`, tag: "Trajectory", href: mHref, title: `${name} has improved three seasons running`, detail: `${r1(a)} → ${r1(b)} → ${r1(c)} points per game.`, weight: 28 + ((c - a) / a) * 100 });
      } else if (a > b && b > c && (a - c) / a > 0.06) {
        items.push({ id: `down-${memberId}`, tag: "Trajectory", href: mHref, title: `${name} has declined three seasons running`, detail: `${r1(a)} → ${r1(b)} → ${r1(c)} points per game.`, weight: 26 + ((a - c) / a) * 100 });
      }
    }
  }

  // 6. All-time top scores set in the latest season
  const sorted = [...tw].sort((a, b) => b.score - a.score);
  sorted.slice(0, 10).forEach((g, i) => {
    if (g.year !== latest) return;
    items.push({
      id: `rec-${g.matchupId}-${g.memberId}`, tag: "Record", year: g.year, href: `${base}/matchups/${g.matchupId}`,
      title: `${g.memberName}'s ${r1(g.score)} in week ${g.week} is the ${i + 1}${["st", "nd", "rd"][i] ?? "th"}-highest score in league history`,
      detail: `${g.result === "W" ? "Beat" : "Lost to"} ${g.oppMemberName}${g.result === "L" ? ", somehow" : ""}.`,
      weight: 70 - i * 3,
    });
  });
  const lows = [...tw].sort((a, b) => a.score - b.score);
  lows.slice(0, 5).forEach((g, i) => {
    if (g.year !== latest) return;
    items.push({
      id: `low-${g.matchupId}-${g.memberId}`, tag: "Record", year: g.year, href: `${base}/matchups/${g.matchupId}`,
      title: `${g.memberName}'s ${r1(g.score)} in week ${g.week} is one of the ${i < 1 ? "lowest" : "five lowest"} scores ever`,
      detail: `Against ${g.oppMemberName}.`,
      weight: 55 - i * 3,
    });
  });

  // 7. Active head-to-head streaks
  const pairs = new Map<string, TeamWeek[]>();
  for (const t of tw) {
    if (t.memberId > t.oppMemberId) continue;
    const k = `${t.memberId}|${t.oppMemberId}`;
    if (!pairs.has(k)) pairs.set(k, []);
    pairs.get(k)!.push(t);
  }
  for (const games of pairs.values()) {
    games.sort((a, b) => a.year - b.year || a.week - b.week);
    const last = games.at(-1)!;
    const winner = last.result === "W" ? "a" : last.result === "L" ? "b" : null;
    if (!winner) continue;
    let s = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      const w = games[i].result === "W" ? "a" : games[i].result === "L" ? "b" : null;
      if (w !== winner) break;
      s++;
    }
    if (s >= 4) {
      const [wName, lName, wId, lId] = winner === "a" ? [last.memberName, last.oppMemberName, last.memberId, last.oppMemberId] : [last.oppMemberName, last.memberName, last.oppMemberId, last.memberId];
      items.push({
        id: `h2h-${wId}-${lId}`, tag: "Rivalry", href: `${base}/rivalries/${wId}/${lId}`,
        title: `${wName} has beaten ${lName} ${s} straight times`,
        detail: `Last meeting: ${last.year} week ${last.week}.`,
        weight: 30 + s * 6,
      });
    }
  }

  // 8. League scoring by season
  const ppgBySeason = years.map((y) => {
    const g = tw.filter((t) => t.year === y);
    return { year: y, ppg: g.reduce((s, t) => s + t.score, 0) / g.length };
  });
  if (ppgBySeason.length >= 3) {
    const cur = ppgBySeason.at(-1)!;
    const max = Math.max(...ppgBySeason.map((p) => p.ppg));
    const min = Math.min(...ppgBySeason.map((p) => p.ppg));
    if (cur.ppg === max || cur.ppg === min) {
      items.push({
        id: "league-ppg", tag: "League", year: cur.year,
        title: `${cur.year} is the ${cur.ppg === max ? "highest" : "lowest"}-scoring season in league history`,
        detail: `${r1(cur.ppg)} points per team per week.`,
        weight: 45,
      });
    }
  }

  items.sort((a, b) => b.weight - a.weight);
  return { items, ppgBySeason };
}
