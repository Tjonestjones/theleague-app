from projections import _season_totals


def test_season_totals_picks_season_split_only():
    player = {"stats": [
        {"seasonId": 2024, "scoringPeriodId": 0, "statSplitTypeId": 0, "statSourceId": 1, "appliedTotal": 250.456},
        {"seasonId": 2024, "scoringPeriodId": 0, "statSplitTypeId": 0, "statSourceId": 0, "appliedTotal": 199.1},
        {"seasonId": 2024, "scoringPeriodId": 3, "statSplitTypeId": 1, "statSourceId": 0, "appliedTotal": 20.0},
        {"seasonId": 2023, "scoringPeriodId": 0, "statSplitTypeId": 0, "statSourceId": 0, "appliedTotal": 300.0},
    ]}
    assert _season_totals(player, 2024) == {"projected": 250.46, "actual": 199.1}


def test_season_totals_missing():
    assert _season_totals({"stats": []}, 2024) == {"projected": None, "actual": None}
