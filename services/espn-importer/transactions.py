"""
ESPN transaction history builder.

ESPN keeps a week-by-week transaction log (view=mTransactions2) for past
seasons, but for most historical trades it no longer stores which players
moved. So we combine two sources:

  1. The transaction log  -> draft picks, waiver claims, free-agent adds and
     drops, with exact timestamps.
  2. Weekly roster snapshots (view=mRoster) -> replayed against the log to
     recover trades and any move the log missed.

The output is one record per player movement, in chronological order.
`build_season_moves` is a pure function over raw ESPN JSON so it can be
tested against saved fixtures; `fetch_season_raw` does the network calls.
"""

from __future__ import annotations

from collections import OrderedDict, defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional
import logging
import time

import requests

logger = logging.getLogger(__name__)

ESPN_BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
PLAYERS_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/players"

POSITIONS = {1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST"}

# Order of moves sharing a timestamp: draft, then drops/trades, then adds
_ORDER = {"DRAFT": 0, "DROP": 1, "TRADE": 1, "WAIVER": 2, "ADD": 2}


# ──────────────────────────────────────────────
# Network
# ──────────────────────────────────────────────

def _get(session: requests.Session, url: str, headers: Optional[dict] = None, tries: int = 4) -> Optional[Any]:
    for attempt in range(tries):
        try:
            r = session.get(url, headers=headers or {}, timeout=30)
            if r.ok:
                return r.json()
            logger.warning(f"ESPN {r.status_code} for {url}")
        except Exception as e:  # network blip, bad JSON
            logger.warning(f"ESPN request failed ({e}) for {url}")
        time.sleep(1.2 * (attempt + 1))
    return None


def fetch_season_raw(league_id: int, year: int,
                     espn_s2: Optional[str] = None, swid: Optional[str] = None,
                     workers: int = 6) -> Dict[str, Any]:
    """Fetch everything build_season_moves needs for one season."""
    session = requests.Session()
    if espn_s2 and swid:
        session.cookies.set("espn_s2", espn_s2)
        session.cookies.set("SWID", swid)
    base = ESPN_BASE.format(year=year, league_id=league_id)

    settings = _get(session, f"{base}?view=mTeam&view=mSettings")
    if not settings:
        raise RuntimeError(f"Could not load ESPN league {league_id} ({year})")
    final_week = (settings.get("status") or {}).get("finalScoringPeriod") or 17

    tx_weeks = list(range(0, final_week + 2))
    roster_weeks = list(range(1, final_week + 1))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        tx = dict(zip(tx_weeks, pool.map(
            lambda w: _get(session, f"{base}?view=mTransactions2&scoringPeriodId={w}"), tx_weeks)))
        rosters = dict(zip(roster_weeks, pool.map(
            lambda w: _get(session, f"{base}?view=mRoster&scoringPeriodId={w}"), roster_weeks)))

    players = _get(session, PLAYERS_URL.format(year=year) + "?scoringPeriodId=0&view=players_wl",
                   headers={"x-fantasy-filter": '{"filterActive":null}'}) or []

    missing = [w for w, v in {**{f"tx{w}": v for w, v in tx.items()},
                              **{f"roster{w}": v for w, v in rosters.items()}}.items() if v is None]
    if missing:
        logger.warning(f"{year}: {len(missing)} ESPN pages failed: {missing}")

    return {"settings": settings, "transactions": tx, "rosters": rosters,
            "players": players, "failed_pages": missing}


# ──────────────────────────────────────────────
# Reconstruction
# ──────────────────────────────────────────────

def _ts(t: dict) -> Optional[int]:
    return t.get("processDate") or t.get("proposedDate")


def build_season_moves(raw: Dict[str, Any], year: int) -> Dict[str, Any]:
    settings = raw["settings"]
    uses_faab = bool(((settings.get("settings") or {}).get("acquisitionSettings") or {}).get("isUsingAcquisitionBudget"))
    members = {m["id"]: m.get("displayName") or "" for m in settings.get("members") or []}
    teams = []
    for t in settings.get("teams") or []:
        name = (t.get("name") or f"{t.get('location', '')} {t.get('nickname', '')}").strip()
        owner = members.get((t.get("owners") or [None])[0]) or ""
        teams.append({"team_id": t["id"], "name": name, "owner": owner})

    # ── Transaction log, de-duplicated across week pages
    log: "OrderedDict[str, dict]" = OrderedDict()
    for w in sorted(raw["transactions"], key=int):
        page = raw["transactions"][w]
        for t in (page or {}).get("transactions") or []:
            log[t["id"]] = t

    # ── Weekly roster snapshots + player names
    players: Dict[int, dict] = {}
    snapshots: Dict[int, Dict[int, int]] = {}  # week -> playerId -> teamId
    for w in sorted(raw["rosters"], key=int):
        page = raw["rosters"][w]
        if not page:
            continue
        snap: Dict[int, int] = {}
        for tm in page.get("teams") or []:
            for e in (tm.get("roster") or {}).get("entries") or []:
                snap[e["playerId"]] = tm["id"]
                p = (e.get("playerPoolEntry") or {}).get("player")
                if p:
                    players[e["playerId"]] = {"name": p.get("fullName"),
                                              "pos": POSITIONS.get(p.get("defaultPositionId"), "")}
        snapshots[int(w)] = snap
    for p in raw.get("players") or []:
        if p["id"] not in players:
            players[p["id"]] = {"name": p.get("fullName"), "pos": POSITIONS.get(p.get("defaultPositionId"), "")}

    # ── Moves from the log
    events: List[dict] = []
    for t in log.values():
        if t.get("status") != "EXECUTED":
            continue
        ts, wk, ttype = _ts(t), t.get("scoringPeriodId") or 0, t.get("type")
        for i in t.get("items") or []:
            it = i.get("type")
            base = {"week": wk, "ts": ts, "player_id": i["playerId"], "source": "LOG"}
            if ttype == "DRAFT" and it == "DRAFT":
                events.append({**base, "type": "DRAFT", "from": 0, "to": i["toTeamId"],
                               "draft_pick": i.get("overallPickNumber")})
            elif it == "ADD" and ttype in ("FREEAGENT", "WAIVER"):
                events.append({**base, "type": "WAIVER" if ttype == "WAIVER" else "ADD",
                               "from": 0, "to": i["toTeamId"],
                               "bid": t.get("bidAmount") if ttype == "WAIVER" else None})
            elif it == "DROP":
                events.append({**base, "type": "DROP", "from": i["fromTeamId"], "to": 0,
                               "note": "Dropped as part of a trade" if ttype == "TRADE_ACCEPT" else None})
            elif it == "TRADE" and ttype == "TRADE_ACCEPT":
                events.append({**base, "type": "TRADE", "from": i["fromTeamId"], "to": i["toTeamId"],
                               "trade_key": "tx:" + (t.get("relatedTransactionId") or t["id"])})
    events.sort(key=lambda e: (e["week"], e["ts"] or 0, _ORDER[e["type"]]))

    # ── Replay against weekly rosters
    owner: Dict[int, int] = {}
    moves: List[dict] = []
    k = 0
    final_week = max(snapshots) if snapshots else 0
    for w in range(0, final_week + 1):
        while k < len(events) and events[k]["week"] <= w:
            e = events[k]; k += 1
            owner[e["player_id"]] = e["to"]
            moves.append(e)
        snap = snapshots.get(w)
        if snap is None:
            continue
        pids = set(snap) | {p for p, t in owner.items() if t}
        for p in pids:
            a, b = owner.get(p, 0), snap.get(p, 0)
            if a == b:
                continue
            if a and b:
                moves.append({"week": w, "ts": None, "player_id": p, "type": "TRADE", "from": a, "to": b,
                              "source": "ROSTER",
                              "trade_key": f"{w}|{min(a, b)}-{max(a, b)}"})
            elif b:
                moves.append({"week": w, "ts": None, "player_id": p, "type": "ADD", "from": 0, "to": b,
                              "source": "ROSTER", "note": "Appeared on roster without a logged add"})
            else:
                moves.append({"week": w, "ts": None, "player_id": p, "type": "DROP", "from": a, "to": 0,
                              "source": "ROSTER", "note": "Left roster without a logged drop"})
            owner[p] = b
    moves.extend(events[k:])

    # ── Trades: group, then date roster-found trades from the log's trade events
    trade_events: Dict[str, List[dict]] = defaultdict(list)
    for t in log.values():
        if t.get("type") in ("TRADE_UPHOLD", "TRADE_ACCEPT", "TRADE_VETO") and t.get("relatedTransactionId"):
            trade_events[t["relatedTransactionId"]].append(t)
    log_trades = []
    for rid, evs in trade_events.items():
        log_trades.append({
            "rid": rid,
            "veto": any(e["type"] == "TRADE_VETO" and e.get("status") == "EXECUTED" for e in evs),
            "week": max(e.get("scoringPeriodId") or 0 for e in evs),
            "ts": max(_ts(e) or 0 for e in evs),
            # the accepting team is one side of the trade (upholds/vetoes come from other managers)
            "accepted_by": {e.get("teamId") for e in evs if e["type"] == "TRADE_ACCEPT" and e.get("teamId")},
        })
    vetoed = sum(1 for t in log_trades if t["veto"])

    groups: "OrderedDict[str, List[dict]]" = OrderedDict()
    for m in moves:
        if m["type"] == "TRADE":
            groups.setdefault(m["trade_key"], []).append(m)
    by_rid = {t["rid"]: t for t in log_trades}
    trade_ts: Dict[str, Optional[int]] = {}
    used = set()
    # Trades the log still itemises carry their own id
    for key, ms in groups.items():
        if key.startswith("tx:"):
            match = by_rid.get(key[3:])
            ts = ms[0]["ts"]
            if match:
                used.add(match["rid"]); ts = max(ts or 0, match["ts"]) or None
            trade_ts[key] = ts
    # Roster-found trades: match each to a logged trade event in the same or an
    # adjacent week whose accepting team is one of the two sides. Bipartite
    # matching, so one ambiguous trade can't steal another's only candidate.
    cands: Dict[str, List[str]] = {}
    for key, ms in groups.items():
        if key.startswith("tx:"):
            continue
        wk, sides = ms[0]["week"], {ms[0]["from"], ms[0]["to"]}
        cs = [t for t in log_trades if not t["veto"] and t["rid"] not in used and abs(t["week"] - wk) <= 1
              and (not t["accepted_by"] or t["accepted_by"] & sides)]
        cs.sort(key=lambda t: (not (t["accepted_by"] & sides), abs(t["week"] - wk), t["ts"]))
        cands[key] = [t["rid"] for t in cs]
    match_of: Dict[str, str] = {}  # rid -> trade key

    def _augment(key: str, seen: set) -> bool:
        for rid in cands[key]:
            if rid in seen:
                continue
            seen.add(rid)
            if rid not in match_of or _augment(match_of[rid], seen):
                match_of[rid] = key
                return True
        return False

    for key in sorted(cands, key=lambda k: (len(cands[k]), groups[k][0]["week"])):
        _augment(key, set())
    for rid, key in match_of.items():
        trade_ts[key] = by_rid[rid]["ts"] or None

    for key, ms in groups.items():
        ts = trade_ts.get(key)
        one_sided = len({(m["from"], m["to"]) for m in ms}) < 2
        for m in ms:
            m["ts"] = ts
            if one_sided:
                m["note"] = "Only one side of this trade is visible in weekly rosters"

    # ── Final order + trade numbering
    moves.sort(key=lambda m: (m["week"], m["ts"] or 0, _ORDER[m["type"]]))
    trade_no: Dict[str, str] = {}
    num_teams = len(teams) or 1
    out = []
    for seq, m in enumerate(moves, 1):
        rec = {
            "seq": seq,
            "week": m["week"],
            "ts": m["ts"],
            "type": m["type"],
            "player_id": m["player_id"],
            "from_team_id": m["from"] or None,
            "to_team_id": m["to"] or None,
            "source": m["source"],
            "note": m.get("note"),
        }
        if m["type"] == "DRAFT" and m.get("draft_pick"):
            rec["draft_pick"] = m["draft_pick"]
            rec["draft_round"] = -(-m["draft_pick"] // num_teams)
        if m["type"] == "WAIVER" and uses_faab and m.get("bid") is not None:
            rec["waiver_bid"] = m["bid"]
        if m["type"] == "TRADE":
            key = m["trade_key"]
            if key not in trade_no:
                trade_no[key] = f"T{year}-{len(trade_no) + 1:02d}"
            rec["trade_group"] = trade_no[key]
        out.append(rec)

    used_players = {m["player_id"] for m in out}
    return {
        "year": year,
        "teams": teams,
        "players": {str(p): v for p, v in players.items() if p in used_players},
        "moves": out,
        "vetoed_trades": vetoed,
        "failed_pages": raw.get("failed_pages") or [],
    }


# ──────────────────────────────────────────────
# CLI: build from saved raw JSON (for backfills and tests)
#   python3 transactions.py raw.json [raw2.json ...] --league-id 123 > seasons.json
# Each raw file maps year -> output of fetch_season_raw.
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    import json
    import sys

    ap = argparse.ArgumentParser(description="Build per-player transaction history from raw ESPN JSON")
    ap.add_argument("raw", nargs="+")
    ap.add_argument("--league-id", type=int, required=True)
    args = ap.parse_args()
    raw: Dict[str, Any] = {}
    for path in args.raw:
        with open(path) as f:
            raw.update(json.load(f))
    seasons = [build_season_moves(raw[y], int(y)) for y in sorted(raw, key=int)]
    json.dump({"platform": "ESPN", "league_id": args.league_id, "seasons": seasons}, sys.stdout)
