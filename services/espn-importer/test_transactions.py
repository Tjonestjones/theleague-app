"""
Tests for the ESPN transaction builder.

    cd services/espn-importer && python3 -m unittest test_transactions
"""

import unittest

from transactions import build_season_moves

# Two teams, three roster weeks. Times are epoch ms.
DRAFT_TS, ADD_TS, TRADE_TS, WAIVER_TS = 1_000, 2_000, 3_000, 4_000


def _roster(*teams):
    """teams: (team_id, [player ids]) pairs -> mRoster page"""
    return {"teams": [{"id": tid, "roster": {"entries": [
        {"playerId": p, "playerPoolEntry": {"player": {"id": p, "fullName": f"Player {p}", "defaultPositionId": 2}}}
        for p in pids]}} for tid, pids in teams]}


RAW = {
    "settings": {
        "members": [{"id": "m1", "displayName": "alice"}, {"id": "m2", "displayName": "bob"}],
        "teams": [{"id": 1, "name": "Aces", "owners": ["m1"]}, {"id": 2, "name": "Bees", "owners": ["m2"]}],
        "status": {"finalScoringPeriod": 3},
    },
    "transactions": {
        "1": {"transactions": [
            {"id": "d", "type": "DRAFT", "status": "EXECUTED", "scoringPeriodId": 1, "processDate": DRAFT_TS, "items": [
                {"type": "DRAFT", "playerId": 10, "toTeamId": 1, "overallPickNumber": 1},
                {"type": "DRAFT", "playerId": 20, "toTeamId": 2, "overallPickNumber": 2},
                {"type": "DRAFT", "playerId": 11, "toTeamId": 1, "overallPickNumber": 3},
                {"type": "DRAFT", "playerId": 21, "toTeamId": 2, "overallPickNumber": 4},
            ]},
            # free-agent add + drop
            {"id": "fa", "type": "FREEAGENT", "status": "EXECUTED", "scoringPeriodId": 1, "processDate": ADD_TS, "items": [
                {"type": "ADD", "playerId": 30, "fromTeamId": 0, "toTeamId": 1},
                {"type": "DROP", "playerId": 11, "fromTeamId": 1, "toTeamId": 0},
            ]},
            # a failed waiver claim must be ignored
            {"id": "wf", "type": "WAIVER", "status": "FAILED_INVALIDPLAYERSOURCE", "scoringPeriodId": 1, "items": [
                {"type": "ADD", "playerId": 99, "toTeamId": 2}]},
        ]},
        "2": {"transactions": [
            # trade whose players ESPN no longer itemises: only accept/uphold events remain
            {"id": "acc", "type": "TRADE_ACCEPT", "scoringPeriodId": 2, "teamId": 2, "relatedTransactionId": "prop1",
             "proposedDate": TRADE_TS - 10},
            {"id": "up", "type": "TRADE_UPHOLD", "status": "EXECUTED", "scoringPeriodId": 2, "teamId": 1,
             "relatedTransactionId": "prop1", "processDate": TRADE_TS},
            # a vetoed trade between the same teams, which must not lend its date
            {"id": "acc2", "type": "TRADE_ACCEPT", "scoringPeriodId": 2, "teamId": 1, "relatedTransactionId": "prop2",
             "proposedDate": TRADE_TS + 50},
            {"id": "veto", "type": "TRADE_VETO", "status": "EXECUTED", "scoringPeriodId": 2, "teamId": 2,
             "relatedTransactionId": "prop2", "processDate": TRADE_TS + 60},
            {"id": "w", "type": "WAIVER", "status": "EXECUTED", "scoringPeriodId": 2, "processDate": WAIVER_TS,
             "bidAmount": 0, "items": [{"type": "ADD", "playerId": 40, "fromTeamId": 0, "toTeamId": 2}]},
        ]},
        "3": {"transactions": []},
    },
    "rosters": {
        "1": _roster((1, [10, 30]), (2, [20, 21])),
        # week 2: 10 <-> 20 traded; 40 claimed
        "2": _roster((1, [20, 30]), (2, [10, 21, 40])),
        # week 3: 21 vanished from team 2 with nothing in the log
        "3": _roster((1, [20, 30]), (2, [10, 40])),
    },
    "players": [{"id": 99, "fullName": "Never Rostered", "defaultPositionId": 3}],
}


class BuildSeasonMoves(unittest.TestCase):
    def setUp(self):
        self.res = build_season_moves(RAW, 2024)
        self.moves = self.res["moves"]

    def of(self, type_, player):
        return [m for m in self.moves if m["type"] == type_ and m["player_id"] == player]

    def test_counts(self):
        types = [m["type"] for m in self.moves]
        self.assertEqual(types.count("DRAFT"), 4)
        self.assertEqual(types.count("ADD"), 1)
        self.assertEqual(types.count("WAIVER"), 1)
        self.assertEqual(types.count("DROP"), 2)
        self.assertEqual(types.count("TRADE"), 2)

    def test_draft_round(self):
        (m,) = self.of("DRAFT", 21)
        self.assertEqual((m["draft_pick"], m["draft_round"], m["to_team_id"]), (4, 2, 2))

    def test_trade_found_from_rosters_and_dated_from_log(self):
        a, = self.of("TRADE", 10)
        b, = self.of("TRADE", 20)
        self.assertEqual((a["from_team_id"], a["to_team_id"]), (1, 2))
        self.assertEqual((b["from_team_id"], b["to_team_id"]), (2, 1))
        self.assertEqual(a["trade_group"], b["trade_group"])
        self.assertEqual(a["trade_group"], "T2024-01")
        self.assertEqual(a["ts"], TRADE_TS)          # not the vetoed trade's time
        self.assertEqual(a["source"], "ROSTER")
        self.assertIsNone(a["note"])

    def test_unlogged_drop(self):
        (m,) = self.of("DROP", 21)
        self.assertEqual((m["week"], m["from_team_id"], m["source"]), (3, 2, "ROSTER"))
        self.assertIsNone(m["ts"])

    def test_failed_claim_ignored(self):
        self.assertFalse(self.of("ADD", 99) + self.of("WAIVER", 99))
        self.assertNotIn("99", self.res["players"])

    def test_vetoed_count(self):
        self.assertEqual(self.res["vetoed_trades"], 1)

    def test_chronological_sequence(self):
        self.assertEqual([m["seq"] for m in self.moves], list(range(1, len(self.moves) + 1)))
        keys = [(m["week"], m["ts"] or 0) for m in self.moves]
        self.assertEqual(keys, sorted(keys))

    def test_waiver_bid_only_for_faab_leagues(self):
        (m,) = self.of("WAIVER", 40)
        self.assertNotIn("waiver_bid", m)
        import copy
        raw = copy.deepcopy(RAW)
        raw["settings"]["settings"] = {"acquisitionSettings": {"isUsingAcquisitionBudget": True}}
        raw["transactions"]["2"]["transactions"][-1]["bidAmount"] = 17
        (m,) = [x for x in build_season_moves(raw, 2024)["moves"] if x["type"] == "WAIVER"]
        self.assertEqual(m["waiver_bid"], 17)

    def test_teams(self):
        self.assertEqual(self.res["teams"][0], {"team_id": 1, "name": "Aces", "owner": "alice"})


if __name__ == "__main__":
    unittest.main()
