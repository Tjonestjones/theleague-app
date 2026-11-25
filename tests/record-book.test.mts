// node --test tests/   (npm run test:unit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { RECORD_CATEGORIES, categoryRecords, categoryPageCount } from "../src/lib/record-book/catalog.ts";
import { computeRecord, hasComputer, optimalPoints, type BookData, type BookSpot } from "../src/lib/record-book/engine.ts";

// Four managers, one season: weeks 1-3 regular season, weeks 4-5 playoffs
// (2-team bracket would need 1 week; 2 playoff weeks → 4-team bracket).
function league(): BookData {
  const members = ["Ana", "Ben", "Cal", "Dee"].map((name, i) => ({ id: `m${i}`, name }));
  const teams = members.map((m, i) => ({ id: `t${i}`, memberId: m.id, year: 2024, name: `${m.name} FC` }));
  const g = (week: number, h: number, a: number, hs: number, as: number, isPlayoff = false) =>
    ({ year: 2024, week, isPlayoff, homeTeamId: `t${h}`, awayTeamId: `t${a}`, homeScore: hs, awayScore: as });
  const games = [
    g(1, 0, 1, 120, 100), g(1, 2, 3, 90, 80),   // Ana 120 high, Dee 80 low
    g(2, 0, 2, 110, 70), g(2, 1, 3, 104, 102),  // Ben narrow win
    g(3, 0, 3, 130, 60), g(3, 1, 2, 95, 99),    // Ana blowout (+70)
    // Playoffs: seeds Ana(3-0), Ben(2-1)... semis week 4, final + 3rd place week 5
    g(4, 0, 3, 100, 90, true), g(4, 1, 2, 80, 85, true),
    g(5, 0, 2, 105, 110, true), g(5, 1, 3, 95, 90, true),
  ];
  const spot = (playerId: string, position: string, slot: string, points: number): BookSpot =>
    ({ playerId, playerName: playerId.toUpperCase(), position, slot, isStarter: slot !== "BN", points });
  const lineups = [
    // Ana week 1: started a 5-pt RB over a 20-pt RB on the bench → missed 15
    { teamId: "t0", year: 2024, week: 1, spots: [spot("qb1", "QB", "QB", 25), spot("rb1", "RB", "RB", 5), spot("rb2", "RB", "BN", 20)] },
    // Ana week 2: perfect
    { teamId: "t0", year: 2024, week: 2, spots: [spot("qb1", "QB", "QB", 18), spot("rb2", "RB", "RB", 22), spot("rb1", "RB", "BN", 3)] },
  ];
  const moves = [
    { year: 2024, week: null, sequence: 1, type: "DRAFT" as const, playerId: "qb1", playerName: "QB1", playerPosition: "QB", fromTeamId: null, toTeamId: "t0", tradeGroup: null, draftRound: 1, draftPick: 1 },
    { year: 2024, week: 2, sequence: 2, type: "ADD" as const, playerId: "rb2", playerName: "RB2", playerPosition: "RB", fromTeamId: null, toTeamId: "t0", tradeGroup: null, draftRound: null, draftPick: null },
  ];
  return { members, teams, seasons: [{ year: 2024, numTeams: 4 }], games, lineups, moves };
}

const find = (cat: string, id: string) => {
  const c = RECORD_CATEGORIES.find((x) => x.id === cat)!;
  return categoryRecords(c).find((r) => r.id === id)!;
};
const top = (data: BookData, cat: string, id: string, inverse = false) => {
  const res = computeRecord(data, cat, find(cat, id), inverse);
  assert.equal(res.status, "ok", `${cat}/${id} should have rows`);
  return res.status === "ok" ? res.rows[0] : null!;
};

test("catalog: ids are unique within each category and every tracked record is calculated", () => {
  for (const c of RECORD_CATEGORIES) {
    const ids = categoryRecords(c).map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate id in ${c.id}`);
    for (const r of categoryRecords(c)) {
      if (r.needs === "keepers" || r.needs === "playerStats") continue;
      assert.ok(hasComputer(c.id, r.id), `${c.id}/${r.id} has no calculation`);
    }
  }
});

test("catalog: page counts match the grouped layout", () => {
  const counts = Object.fromEntries(RECORD_CATEGORIES.map((c) => [c.id, categoryPageCount(c)]));
  assert.equal(counts.league, 44);
  assert.equal(counts.season, 29);
  assert.equal(counts.matchup, 14);
  assert.equal(counts["roster-stats"], 77);
  assert.equal(counts.streaks, 20);
});

test("league records: wins, all-play and luck", () => {
  const d = league();
  assert.deepEqual([top(d, "league", "total-wins").holder, top(d, "league", "total-wins").value], ["Ana", "3"]);
  assert.equal(top(d, "league", "all-play-wins").value, "9"); // Ana outscored all 3 others every week
  assert.equal(top(d, "league", "high-scores-count").holder, "Ana");
  assert.equal(top(d, "league", "high-scores-count", true).holder, "Dee"); // lowest scorer twice
  assert.equal(top(d, "league", "narrow-wins").holder, "Ben");
});

test("playoffs: bracket, champion, runner-up and third place", () => {
  const d = league();
  assert.equal(top(d, "league", "championships").holder, "Cal");
  const medals = computeRecord(d, "league", find("league", "medal-score"), false);
  assert.equal(medals.status, "ok");
  if (medals.status === "ok") {
    const byName = Object.fromEntries(medals.rows.map((r) => [r.holder, r.value]));
    assert.deepEqual(byName, { Cal: "3", Ana: "2", Ben: "1", Dee: "0" });
  }
});

test("matchup records: blowout and narrowest win", () => {
  const d = league();
  assert.equal(top(d, "matchup", "biggest-blowout").value, "70.0");
  assert.equal(top(d, "matchup", "narrowest-win").holder, "Ben");
});

test("lineups: optimal points and coach score", () => {
  const spots: BookSpot[] = [
    { playerId: "a", playerName: "A", position: "RB", slot: "RB", isStarter: true, points: 5 },
    { playerId: "b", playerName: "B", position: "WR", slot: "RB/WR/TE", isStarter: true, points: 8 },
    { playerId: "c", playerName: "C", position: "RB", slot: "BN", isStarter: false, points: 20 },
    { playerId: "d", playerName: "D", position: "TE", slot: "IR", isStarter: false, points: 40 },
  ];
  // RB slot → C (20), FLEX → B (8); IR players can't play
  assert.equal(optimalPoints(spots), 28);
  const d = league();
  assert.equal(top(d, "roster", "matchup-optimal-points-missed").value, "15.0");
  assert.equal(top(d, "roster", "season-perfect-games").value, "1");
});

test("transactions: waiver value counts starter points from the pickup week", () => {
  assert.equal(top(league(), "draft-transactions", "top-waivers").value, "22.0");
});

test("untracked data shows an empty state", () => {
  const res = computeRecord(league(), "roster-stats", find("roster-stats", "passing-yards-all-time"), false);
  assert.equal(res.status, "empty");
});
