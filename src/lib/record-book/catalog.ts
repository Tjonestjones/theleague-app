// Record book catalog: every record page, grouped into categories, sections
// and divider groups for the sidebar. Pure data, no database access.
//
// `needs` says which league data a record is built from. Records whose data
// TheLeague doesn't store yet ("keepers", "playerStats") still get a page,
// which shows an empty state explaining what's missing.

export type RecordNeed =
  | "scores"        // completed matchups
  | "playoffs"      // matchups in weeks flagged as playoffs
  | "lineups"       // weekly rosters with starters and player points
  | "draft"         // draft picks + weekly lineups (to value each pick)
  | "transactions"  // adds, waiver claims and trades
  | "keepers"       // not tracked yet
  | "playerStats";  // weekly NFL stat lines per player: not tracked yet

export interface RecordDef {
  /** URL slug, unique within its category */
  id: string;
  label: string;
  /** Label of the flipped view, e.g. "Worst". Omitted when there is none. */
  inverseLabel?: string;
  needs: RecordNeed;
  description: string;
}

export interface RecordSection {
  /** Sub-heading in the sidebar; the first section of a category has none */
  title?: string;
  /** Records split into groups; the sidebar draws a divider between groups */
  groups: RecordDef[][];
}

export interface RecordCategory {
  id: string;
  label: string;
  description: string;
  sections: RecordSection[];
}

/** Needs TheLeague has no data source for yet */
export const UNTRACKED_NEEDS: ReadonlySet<RecordNeed> = new Set(["keepers", "playerStats"]);

const r = (id: string, label: string, needs: RecordNeed, description: string, inverseLabel?: string): RecordDef =>
  ({ id, label, needs, description, ...(inverseLabel ? { inverseLabel } : {}) });

// ── Position lists ───────────────────────────────────────────────────────────

const DRAFT_VALUE_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DL", "LB", "DB"];
const DRAFT_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF", "DL", "LB", "DB"];
const LINEUP_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

const STATS: Array<[id: string, label: string]> = [
  ["passing-yards", "Passing Yards"],
  ["passing-tds", "Passing TDs"],
  ["interceptions", "Interceptions"],
  ["rushing-yards", "Rushing Yards"],
  ["rushing-tds", "Rushing TDs"],
  ["receptions", "Receptions"],
  ["receiving-yards", "Receiving Yards"],
  ["receiving-tds", "Receiving TDs"],
  ["def-tds", "DEF TDs"],
  ["field-goals", "Field Goals"],
  ["fumbles", "Fumbles"],
];

const slug = (s: string) => s.toLowerCase();

// ── Categories ───────────────────────────────────────────────────────────────

export const RECORD_CATEGORIES: RecordCategory[] = [
  {
    id: "league",
    label: "League Records",
    description: "All-time totals for every manager across the regular season, plus playoff history.",
    sections: [
      {
        groups: [
          [
            r("total-wins", "Total Wins", "scores", "Regular-season wins across every season."),
            r("total-losses", "Total Losses", "scores", "Regular-season losses across every season."),
            r("win-percent", "Win Percent", "scores", "Regular-season win percentage, with ties counted as half a win."),
            r("all-play-wins", "All-Play Wins", "scores", "Wins if every manager played every other manager every week."),
            r("all-play-losses", "All-Play Losses", "scores", "Losses if every manager played every other manager every week."),
            r("all-play-win-percent", "All-Play Win Percent", "scores", "Win percentage if every manager played every other manager every week."),
          ],
          [
            r("total-points", "Total Points", "scores", "Regular-season points scored."),
            r("total-opponent-points", "Total Opponent Points", "scores", "Regular-season points scored against each manager."),
            r("points-share-average", "Points Share Average", "scores", "Average share of the league's total points each week."),
            r("opponent-points-share-average", "Opponent Points Share Average", "scores", "Average share of the league's weekly points scored by each manager's opponent."),
          ],
          [
            r("luckiest", "Luckiest", "scores", "Actual wins minus the wins expected from all-play record. Positive means more wins than the scores deserved.", "Least Lucky"),
            r("strength-of-schedule", "Strength of Schedule", "scores", "Average points share of the opponents each manager faced. Higher is a tougher schedule.", "Easiest"),
          ],
          [
            r("high-scores-count", "High Scores (#)", "scores", "Weeks as the league's highest scorer. The flipped view counts weeks as the lowest scorer.", "Worst"),
            r("high-scores-percent", "High Scores (%)", "scores", "Share of weeks as the league's highest scorer. The flipped view uses the lowest scorer.", "Worst"),
            r("top-scores-count", "Top Scores (#)", "scores", "Weeks finishing among the top three scores. The flipped view counts the bottom three.", "Bottom"),
            r("top-scores-percent", "Top Scores (%)", "scores", "Share of weeks finishing among the top three scores. The flipped view uses the bottom three.", "Bottom"),
            r("top-half-scores-count", "Top Half Scores (#)", "scores", "Weeks finishing in the top half of the league. The flipped view counts the bottom half.", "Bottom"),
            r("top-half-scores-percent", "Top Half Scores (%)", "scores", "Share of weeks finishing in the top half of the league. The flipped view uses the bottom half.", "Bottom"),
            r("blowout-wins", "Blowout Wins", "scores", "Regular-season wins by more than 30 points."),
            r("blowout-losses", "Blowout Losses", "scores", "Regular-season losses by more than 30 points."),
            r("narrow-wins", "Narrow Wins", "scores", "Regular-season wins by less than 5 points."),
            r("narrow-losses", "Narrow Losses", "scores", "Regular-season losses by less than 5 points."),
          ],
          [
            r("regular-season-titles", "Regular Season Titles", "scores", "Seasons finishing with the best regular-season record (points as the tiebreak)."),
            r("season-points-titles", "Season Points Titles", "scores", "Seasons leading the league in regular-season points."),
            r("season-all-play-titles", "Season All-Play Titles", "scores", "Seasons finishing with the best all-play record."),
            r("seasons-winning-record", "Seasons Winning Record", "scores", "Seasons finishing the regular season with more wins than losses."),
            r("seasons-losing-record", "Seasons Losing Record", "scores", "Seasons finishing the regular season with more losses than wins."),
          ],
        ],
      },
      {
        title: "Playoff Records",
        groups: [
          [
            r("championships", "Championships", "playoffs", "League titles won."),
            r("medal-score", "Medal Score", "playoffs", "3 points for a title, 2 for runner-up, 1 for third place."),
            r("total-medals", "Total Medals", "playoffs", "Top-three finishes."),
            r("playoff-appearances", "Playoff Appearances", "playoffs", "Seasons making the playoff bracket."),
            r("playoff-appearances-percent", "Playoff Appearances %", "playoffs", "Share of seasons played that ended in the playoff bracket."),
          ],
          [
            r("playoff-wins", "Playoff Wins", "playoffs", "Wins in playoff games."),
            r("playoff-losses", "Playoff Losses", "playoffs", "Losses in playoff games."),
            r("total-playoff-points", "Total Playoff Points", "playoffs", "Points scored in playoff games."),
            r("total-opponent-playoff-points", "Total Opponent Playoff Points", "playoffs", "Points scored against each manager in playoff games."),
          ],
        ],
      },
    ],
  },
  {
    id: "season",
    label: "Season Records",
    description: "The best and worst single regular seasons in league history.",
    sections: [
      {
        groups: [
          [
            r("season-score", "Season Score", "scores", "A 0 to 100 rating of a season: the average of actual win percentage and all-play win percentage.", "Lowest"),
            r("season-luckiest", "Season Luckiest", "scores", "Actual wins minus all-play expected wins in one season.", "Least Lucky"),
            r("strength-of-schedule", "Strength of Schedule", "scores", "Average points share of the opponents faced in one season. Higher is tougher.", "Easiest"),
          ],
          [
            r("most-wins", "Most Wins", "scores", "Regular-season wins in one season."),
            r("most-losses", "Most Losses", "scores", "Regular-season losses in one season."),
            r("most-all-play-wins", "Most All-Play Wins", "scores", "All-play wins in one season."),
            r("most-all-play-losses", "Most All-Play Losses", "scores", "All-play losses in one season."),
            r("best-all-play-win-percent", "Best All-Play Win Percent", "scores", "All-play win percentage in one season."),
          ],
          [
            r("most-points", "Most Points", "scores", "Regular-season points in one season. The flipped view shows points scored against.", "Opponent"),
            r("fewest-points", "Fewest Points", "scores", "Fewest regular-season points in one season. The flipped view shows points scored against.", "Opponent"),
            r("highest-points-share", "Highest Points Share", "scores", "Highest average weekly share of league points in one season."),
            r("lowest-points-share", "Lowest Points Share", "scores", "Lowest average weekly share of league points in one season."),
            r("highest-opponents-points-share", "Highest Opponents Points Share", "scores", "Highest average weekly points share of the opponents faced in one season."),
            r("lowest-opponents-points-share", "Lowest Opponents Points Share", "scores", "Lowest average weekly points share of the opponents faced in one season."),
          ],
          [
            r("high-scores", "High Scores (#)", "scores", "Weeks as the league's highest scorer in one season. The flipped view counts lowest scores.", "Worst"),
            r("top-scores", "Top Scores (#)", "scores", "Weeks among the top three scores in one season. The flipped view counts the bottom three.", "Bottom"),
            r("top-half-scores", "Top Half Scores (#)", "scores", "Weeks in the top half of the league in one season. The flipped view counts the bottom half.", "Bottom"),
            r("most-blowout-wins", "Most Blowout Wins", "scores", "Wins by more than 30 points in one season."),
            r("most-blowout-losses", "Most Blowout Losses", "scores", "Losses by more than 30 points in one season."),
            r("most-narrow-wins", "Most Narrow Wins", "scores", "Wins by less than 5 points in one season."),
            r("most-narrow-losses", "Most Narrow Losses", "scores", "Losses by less than 5 points in one season."),
          ],
        ],
      },
    ],
  },
  {
    id: "matchup",
    label: "Matchup Records",
    description: "Single-game records from every regular-season and playoff matchup.",
    sections: [
      {
        groups: [
          [
            r("most-matchup-points", "Most Matchup Points", "scores", "Highest score in a regular-season game."),
            r("fewest-matchup-points", "Fewest Matchup Points", "scores", "Lowest score in a regular-season game."),
            r("highest-combined-score", "Highest Combined Score", "scores", "Most points scored by both teams in a regular-season game."),
            r("lowest-combined-score", "Lowest Combined Score", "scores", "Fewest points scored by both teams in a regular-season game."),
            r("biggest-blowout", "Biggest Blowout", "scores", "Largest winning margin in a regular-season game."),
            r("narrowest-win", "Narrowest Win", "scores", "Smallest winning margin in a regular-season game."),
            r("highest-points-share", "Highest Points Share", "scores", "Largest share of the league's points in one week."),
            r("lowest-points-share", "Lowest Points Share", "scores", "Smallest share of the league's points in one week."),
          ],
        ],
      },
      {
        title: "Playoff Matchup Records",
        groups: [
          [
            r("most-playoff-matchup-points", "Most Playoff Matchup Points", "playoffs", "Highest score in a playoff game."),
            r("fewest-playoff-matchup-points", "Fewest Playoff Matchup Points", "playoffs", "Lowest score in a playoff game."),
            r("highest-playoff-combined-score", "Highest Playoff Combined Score", "playoffs", "Most points scored by both teams in a playoff game."),
            r("lowest-playoff-combined-score", "Lowest Playoff Combined Score", "playoffs", "Fewest points scored by both teams in a playoff game."),
            r("biggest-playoff-win", "Biggest Playoff Win", "playoffs", "Largest winning margin in a playoff game."),
            r("narrowest-playoff-win", "Narrowest Playoff Win", "playoffs", "Smallest winning margin in a playoff game."),
          ],
        ],
      },
    ],
  },
  {
    id: "draft-transactions",
    label: "Draft & Transactions",
    description: "How much value managers found at the draft, on waivers and in trades.",
    sections: [
      {
        groups: [
          [
            r("draft-value", "Overall Draft Value", "draft", "All-time draft value. A pick's value is the points the player scored in the drafting team's starting lineup that season, minus the average for picks in the same round."),
            ...DRAFT_VALUE_POSITIONS.map((p) =>
              r(`${slug(p)}-draft-value`, `${p} Draft Value`, "draft", `All-time draft value from ${p} picks.`)),
          ],
          [
            r("keeper-draft-value", "Keeper Draft Value", "keepers", "All-time value from kept players."),
          ],
          [
            r("top-draft-season", "Overall Top Draft Season", "draft", "Best single-season draft class by total pick value.", "Worst"),
            ...DRAFT_POSITIONS.map((p) =>
              r(`${slug(p)}-top-draft-season`, `${p} Top Draft Season`, "draft", `Best single-season draft value from ${p} picks.`, "Worst")),
          ],
          [
            r("best-draft-pick", "Overall Best Draft Pick", "draft", "Single picks with the most value over their round's average.", "Worst"),
            ...DRAFT_POSITIONS.map((p) =>
              r(`${slug(p)}-best-draft-pick`, `${p} Best Draft Pick`, "draft", `Single ${p} picks with the most value over their round's average.`, "Worst")),
          ],
          [
            r("keeper-best-pick", "Keeper Best Pick", "keepers", "Single kept players with the most value.", "Worst"),
          ],
        ],
      },
      {
        title: "Transaction Records",
        groups: [
          [
            r("manager-value", "Overall Manager Value", "transactions", "All-time draft value plus waiver value plus trade value."),
            r("waiver-value", "Top Waiver Value", "transactions", "All-time points scored in the starting lineup by players picked up off waivers or free agency, after the pickup."),
            r("trade-value", "Top Trade Value", "transactions", "All-time starting-lineup points gained from players received in trades, minus the points the players sent away scored for their new team."),
            r("most-transactions", "Most Transactions", "transactions", "Free-agent adds, waiver claims and trades made."),
            r("most-trades", "Most Trades", "transactions", "Trades completed."),
          ],
          [
            r("best-manager-season", "Best Manager Season", "transactions", "Draft, waiver and trade value combined, in one season.", "Worst"),
            r("best-waiver-season", "Best Waiver Season", "transactions", "Waiver and free-agent value in one season.", "Worst"),
            r("best-trade-season", "Best Trade Season", "transactions", "Trade value in one season.", "Worst"),
          ],
          [
            r("top-trades", "Top Trades", "transactions", "Single trades ranked by the value one side gained.", "Worst"),
            r("top-waivers", "Top Waivers", "transactions", "Single pickups ranked by the points the player scored as a starter afterwards.", "Worst"),
          ],
        ],
      },
    ],
  },
  {
    id: "roster",
    label: "Roster Records",
    description: "Lineup decisions and position production, built from weekly lineups.",
    sections: [
      {
        groups: [
          [
            r("coach-score", "Coach Score", "lineups", "All-time share of the best possible lineup points each manager actually started.", "Lowest"),
            r("optimal-points-missed", "Optimal Points Missed", "lineups", "All-time points left on the bench compared with the best possible lineup."),
          ],
          LINEUP_POSITIONS.map((p) =>
            r(`${slug(p)}-avg-points`, `${p} Avg Points`, "lineups", `All-time average points per week from starting ${p}s.`, "Lowest")),
        ],
      },
      {
        title: "Season Roster Records",
        groups: [
          [
            r("season-coach-score", "Coach Score", "lineups", "Share of the best possible lineup points started over one season.", "Lowest"),
            r("season-perfect-games", "Coach Score Perfect Games", "lineups", "Weeks in one season where the started lineup was the best possible lineup."),
            r("season-optimal-points-missed", "Optimal Points Missed", "lineups", "Points left on the bench over one season."),
          ],
          LINEUP_POSITIONS.map((p) =>
            r(`season-${slug(p)}-avg-points`, `${p} Avg Points`, "lineups", `Average points per week from starting ${p}s in one season.`, "Lowest")),
          [
            r("season-top-player", "Top Player", "lineups", "Most points a single player scored in one manager's starting lineup over a season."),
            ...LINEUP_POSITIONS.map((p) =>
              r(`season-${slug(p)}-top-player`, `${p} Top Player`, "lineups", `Most points a single ${p} scored in one manager's starting lineup over a season.`)),
          ],
        ],
      },
      {
        title: "Matchup Roster Records",
        groups: [
          [
            r("matchup-optimal-points-missed", "Optimal Points Missed", "lineups", "Points left on the bench in a single week."),
            r("matchup-top-player", "Top Player", "lineups", "Most points a single starter scored in one week."),
            ...LINEUP_POSITIONS.map((p) =>
              r(`matchup-${slug(p)}-top-player`, `${p} Top Player`, "lineups", `Most points a single starting ${p} scored in one week.`)),
          ],
        ],
      },
    ],
  },
  {
    id: "roster-stats",
    label: "Roster Stats",
    description: "Real NFL stats (yards, touchdowns, field goals) produced by the players in each manager's lineup.",
    sections: [
      {
        groups: [
          STATS.map(([id, label]) =>
            r(`${id}-all-time`, `${label} - All-Time`, "playerStats", `All-time ${label.toLowerCase()} from each manager's starters.`)),
          STATS.map(([id, label]) =>
            r(`player-${id}`, `Player ${label}`, "playerStats", `Most ${label.toLowerCase()} by one player for one manager, all-time.`)),
        ],
      },
      {
        title: "Season Roster Stat Records",
        groups: [
          STATS.map(([id, label]) =>
            r(`season-${id}`, label, "playerStats", `Most ${label.toLowerCase()} from a manager's starters in one season.`, "Lowest")),
          STATS.map(([id, label]) =>
            r(`player-season-${id}`, `Player Season ${label}`, "playerStats", `Most ${label.toLowerCase()} by one player for one manager in a season.`)),
        ],
      },
      {
        title: "Matchup Roster Stat Records",
        groups: [
          STATS.map(([id, label]) =>
            r(`matchup-${id}`, `Matchup ${label}`, "playerStats", `Most ${label.toLowerCase()} from a manager's starters in one week.`)),
          STATS.map(([id, label]) =>
            r(`player-matchup-${id}`, `Player Matchup ${label}`, "playerStats", `Most ${label.toLowerCase()} by one starter in one week.`)),
        ],
      },
    ],
  },
  {
    id: "streaks",
    label: "Streaks & Droughts",
    description: "The longest runs of success, and the longest waits for it.",
    sections: [
      {
        groups: [
          [
            r("win-streak", "Win Streak", "scores", "Consecutive regular-season wins, carrying over between seasons."),
            r("loss-streak", "Loss Streak", "scores", "Consecutive regular-season losses, carrying over between seasons."),
            r("high-score-streak", "High Score Streak", "scores", "Consecutive weeks as the league's highest scorer."),
            r("top-score-streak", "Top Score Streak", "scores", "Consecutive weeks among the top three scores."),
            r("top-half-streak", "Top Half Streak", "scores", "Consecutive weeks in the top half of the league."),
            r("winning-record-streak", "Winning Record Streak", "scores", "Consecutive seasons with a winning regular-season record."),
            r("coach-score-perfect-streak", "Coach Score Perfect Streak", "lineups", "Consecutive weeks starting the best possible lineup."),
          ],
        ],
      },
      {
        title: "Playoff Streak Records",
        groups: [
          [
            r("championship-streak", "Championship Streak", "playoffs", "Consecutive seasons winning the title."),
            r("title-game-streak", "Title Game Streak", "playoffs", "Consecutive seasons reaching the championship game."),
            r("medal-streak", "Medal Streak", "playoffs", "Consecutive seasons finishing in the top three."),
            r("playoff-appearance-streak", "Playoff Appearance Streak", "playoffs", "Consecutive seasons making the playoffs."),
          ],
        ],
      },
      {
        title: "Drought Records",
        groups: [
          [
            r("high-score-drought", "High Score Drought", "scores", "Longest run of weeks without the league's highest score."),
            r("top-score-drought", "Top Score Drought", "scores", "Longest run of weeks without a top-three score."),
            r("top-half-drought", "Top Half Drought", "scores", "Longest run of weeks without a top-half score."),
            r("winning-record-drought", "Winning Record Drought", "scores", "Longest run of seasons without a winning record."),
            r("coach-score-perfect-drought", "Coach Score Perfect Drought", "lineups", "Longest run of weeks without starting the best possible lineup."),
          ],
        ],
      },
      {
        title: "Playoff Drought Records",
        groups: [
          [
            r("championship-drought", "Championship Drought", "playoffs", "Longest run of seasons without a title."),
            r("title-game-drought", "Title Game Drought", "playoffs", "Longest run of seasons without reaching the championship game."),
            r("medal-drought", "Medal Drought", "playoffs", "Longest run of seasons without a top-three finish."),
            r("playoff-appearance-drought", "Playoff Appearance Drought", "playoffs", "Longest run of seasons missing the playoffs."),
          ],
        ],
      },
    ],
  },
  {
    id: "milestones",
    label: "Milestones",
    description: "Round-number milestones each manager has reached, and how close the next one is.",
    sections: [
      {
        groups: [
          [
            r("total-wins", "Total Wins", "scores", "Regular-season wins, in steps of 25."),
            r("total-losses", "Total Losses", "scores", "Regular-season losses, in steps of 25."),
            r("all-play-wins", "All-Play Wins", "scores", "All-play wins, in steps of 250."),
            r("all-play-losses", "All-Play Losses", "scores", "All-play losses, in steps of 250."),
          ],
          [
            r("total-points", "Total Points", "scores", "Regular-season points, in steps of 5,000."),
            r("total-opponent-points", "Total Opponent Points", "scores", "Regular-season points against, in steps of 5,000."),
          ],
          [
            r("high-scores", "High Scores", "scores", "Weeks as the highest scorer, in steps of 5. The flipped view counts lowest scores.", "Worst"),
            r("top-scores", "Top Scores", "scores", "Weeks among the top three scores, in steps of 10. The flipped view counts the bottom three.", "Bottom"),
            r("top-half-scores", "Top Half Scores", "scores", "Weeks in the top half, in steps of 25. The flipped view counts the bottom half.", "Bottom Half"),
          ],
        ],
      },
    ],
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

export function categoryRecords(category: RecordCategory): RecordDef[] {
  return category.sections.flatMap((s) => s.groups.flat());
}

/** Pages in a category, counting each flipped view as its own page */
export function categoryPageCount(category: RecordCategory): number {
  return categoryRecords(category).reduce((n, rec) => n + (rec.inverseLabel ? 2 : 1), 0);
}

export function findRecord(categoryId: string, recordId: string) {
  const category = RECORD_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return null;
  const record = categoryRecords(category).find((rec) => rec.id === recordId);
  return record ? { category, record } : null;
}
