// node --test tests/   (npm run test:unit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLeagueMilestones, computeNflMilestones, ordinal, type SeasonLine } from "../src/lib/milestone-rules.ts";

const line = (season: number, games: number, s: Partial<SeasonLine>): SeasonLine => ({
  season, games,
  passingYards: 0, passingTds: 0, rushingYards: 0, rushingTds: 0,
  receptions: 0, receivingYards: 0, receivingTds: 0, fgMade: 0,
  ...s,
});

// A receiver: 9,800 career yards going into 2026, 400 yards through 4 games
const wr = [
  line(2022, 17, { receptions: 100, receivingYards: 1500, receivingTds: 8 }),
  line(2023, 17, { receptions: 110, receivingYards: 1600, receivingTds: 10 }),
  line(2024, 17, { receptions: 105, receivingYards: 1300, receivingTds: 9 }),
  line(2025, 17, { receptions: 120, receivingYards: 1700, receivingTds: 12 }),
  line(2021, 17, { receptions: 90, receivingYards: 1300, receivingTds: 7 }),
  line(2020, 16, { receptions: 80, receivingYards: 2000, receivingTds: 6 }),
  line(2026, 4, { receptions: 24, receivingYards: 400, receivingTds: 2 }),
];

test("records the highest round number reached and the season it fell", () => {
  const m = computeNflMilestones("WR", wr, 2026).find((x) => x.key === "recYds")!;
  assert.equal(m.value, 9800);
  assert.deepEqual(m.reached, { threshold: 7500, season: 2024 });
  assert.equal(m.reachedThisSeason, false);
});

test("near: 200 yards from 10,000 at 100 yards a game is 2 games away", () => {
  const m = computeNflMilestones("WR", wr, 2026).find((x) => x.key === "recYds")!;
  assert.deepEqual(m.next, { threshold: 10000, remaining: 200, gamesAway: 2 });
  assert.equal(m.near, true);
});

test("a retired player is never near", () => {
  const retired = wr.filter((s) => s.season !== 2026);
  const m = computeNflMilestones("WR", retired, 2026).find((x) => x.key === "recYds")!;
  assert.equal(m.next?.gamesAway, null);
  assert.equal(m.near, false);
});

test("crossing a round number this season is flagged", () => {
  const m = computeNflMilestones("WR", wr, 2026).find((x) => x.key === "rec")!;
  assert.equal(m.value, 629);
  assert.deepEqual(m.reached, { threshold: 500, season: 2025 });
  const recTd = computeNflMilestones("WR", wr, 2026).find((x) => x.key === "recTd")!;
  assert.equal(recTd.value, 54);
  assert.equal(recTd.reached?.threshold, 50);
});

test("1,000-yard seasons count, with this season's pace", () => {
  const m = computeNflMilestones("WR", wr, 2026).find((x) => x.key === "rec1k")!;
  assert.equal(m.value, 6);
  assert.equal(m.reached?.season, 2025);
  // 600 to go at 100/game = 6 games: not near yet
  assert.equal(m.next?.gamesAway, 6);
  assert.equal(m.near, false);
});

test("stats outside a position's milestones are skipped", () => {
  const keys = computeNflMilestones("WR", wr, 2026).map((m) => m.key);
  assert.ok(!keys.includes("passYds"));
  assert.ok(!keys.includes("rushYds"));
});

test("league milestones: points near when rostered and scoring", () => {
  const ms = computeLeagueMilestones({
    starterPoints: 980, starts: 60, weeksRostered: 70, currentSeasonPointsPerStart: 15,
    rosteredNow: true, managers: 4, drafted: 3, moves: 9,
  });
  const pts = ms.find((m) => m.key === "starterPoints")!;
  assert.equal(pts.reached?.threshold, 750);
  assert.deepEqual(pts.next, { threshold: 1000, remaining: 20, gamesAway: 2 });
  assert.equal(pts.near, true);
  assert.equal(ms.find((m) => m.key === "managers")?.reached?.threshold, 3);
  assert.equal(ms.find((m) => m.key === "moves"), undefined); // 9 moves: nothing reached, not near
});

test("league milestones without roster data skip points and starts", () => {
  const ms = computeLeagueMilestones({
    starterPoints: null, starts: null, weeksRostered: null, currentSeasonPointsPerStart: null,
    rosteredNow: false, managers: 9, drafted: 7, moves: 15,
  });
  assert.deepEqual(ms.map((m) => m.key), ["managers", "drafted", "moves"]);
});

test("ordinal", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
});
