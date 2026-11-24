"""
Season projections and actual totals for players in an ESPN league-season.

ESPN keeps, for past seasons, each player's preseason projection
(statSourceId 1) and actual season total (statSourceId 0) for the whole
season (scoringPeriodId 0), already scored under the league's settings
(appliedTotal). Draft analysis divides one by the other.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import requests

from transactions import ESPN_BASE, _get

logger = logging.getLogger(__name__)

CHUNK = 250


def _season_totals(player: Dict[str, Any], year: int) -> Dict[str, Optional[float]]:
    out: Dict[str, Optional[float]] = {"projected": None, "actual": None}
    for s in player.get("stats") or []:
        if s.get("seasonId") != year or s.get("scoringPeriodId") != 0 or s.get("statSplitTypeId") != 0:
            continue
        total = s.get("appliedTotal")
        if total is None:
            continue
        if s.get("statSourceId") == 1:
            out["projected"] = round(float(total), 2)
        elif s.get("statSourceId") == 0:
            out["actual"] = round(float(total), 2)
    return out


def fetch_player_seasons(league_id: int, year: int, player_ids: List[int],
                         espn_s2: Optional[str] = None, swid: Optional[str] = None) -> List[Dict[str, Any]]:
    session = requests.Session()
    if espn_s2 and swid:
        session.cookies.set("espn_s2", espn_s2)
        session.cookies.set("SWID", swid)
    base = ESPN_BASE.format(year=year, league_id=league_id)

    results: List[Dict[str, Any]] = []
    ids = sorted({int(p) for p in player_ids if p})
    for i in range(0, len(ids), CHUNK):
        chunk = ids[i:i + CHUNK]
        flt = {"players": {"filterIds": {"value": chunk}, "limit": len(chunk),
                           "filterStatsForTopScoringPeriodIds": {"value": 1, "additionalValue": [f"00{year}", f"10{year}"]}}}
        data = _get(session, f"{base}?view=kona_player_info&scoringPeriodId=0",
                    headers={"x-fantasy-filter": json.dumps(flt)})
        if not data:
            logger.warning(f"{year}: projections chunk {i // CHUNK} failed")
            continue
        for entry in data.get("players") or []:
            player = entry.get("player") or {}
            pid = player.get("id") or entry.get("id")
            if pid is None:
                continue
            totals = _season_totals(player, year)
            results.append({"player_id": int(pid), "projected": totals["projected"], "actual": totals["actual"]})
    return results
