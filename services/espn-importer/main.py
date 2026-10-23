"""
ESPN Fantasy Football Importer Service
FastAPI service for importing ESPN league data
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from espn_api.football import League
from typing import Optional, List, Dict, Any
from transactions import fetch_season_raw, build_season_moves
import logging
import signal
import asyncio
from concurrent.futures import ThreadPoolExecutor
import functools

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ESPN Importer Service", version="2.0.0")

# Thread pool for running blocking ESPN API calls
executor = ThreadPoolExecutor(max_workers=2)

# CORS middleware for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────

class ESPNAuthRequest(BaseModel):
    league_id: int
    year: int
    espn_s2: Optional[str] = None
    swid: Optional[str] = None


class LeagueInfoResponse(BaseModel):
    league_id: int
    name: str
    year: int
    size: int
    current_week: int


class TeamData(BaseModel):
    team_id: int
    name: str
    owner_name: str
    wins: int
    losses: int
    ties: int
    points_for: float
    points_against: float


class MatchupData(BaseModel):
    week: int
    home_team_id: int
    home_team_name: str
    home_score: float
    away_team_id: int
    away_team_name: str
    away_score: float


class PlayerData(BaseModel):
    player_id: int
    name: str
    position: str        # natural position: QB, RB, WR, TE, K, D/ST
    slot_position: str   # lineup slot: QB, RB, WR, BN, IR, etc.
    pro_team: str
    points: float
    is_starter: bool     # True when not on bench/IR


class TeamRosterWeek(BaseModel):
    team_id: int
    week: int
    players: List[PlayerData]


class FullLeagueData(BaseModel):
    league: LeagueInfoResponse
    teams: List[TeamData]
    matchups: List[MatchupData]
    rosters: List[TeamRosterWeek]


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _connect_to_espn_sync(league_id: int, year: int,
                           espn_s2: Optional[str], swid: Optional[str]) -> League:
    """Synchronous ESPN connect — runs inside thread pool."""
    kwargs = {"league_id": league_id, "year": year}
    if espn_s2 and swid:
        kwargs["espn_s2"] = espn_s2
        kwargs["swid"] = swid
    return League(**kwargs)


async def connect_to_espn(league_id: int, year: int,
                           espn_s2: Optional[str] = None,
                           swid: Optional[str] = None,
                           timeout: int = 30) -> League:
    """Async wrapper around ESPN connect with timeout."""
    loop = asyncio.get_event_loop()
    try:
        logger.info(f"Connecting to ESPN league {league_id} ({year})")
        league = await asyncio.wait_for(
            loop.run_in_executor(
                executor,
                functools.partial(_connect_to_espn_sync, league_id, year, espn_s2, swid)
            ),
            timeout=timeout
        )
        return league
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"ESPN connection timed out after {timeout}s"
        )
    except AttributeError as e:
        if "'NoneType' object has no attribute 'get'" in str(e):
            raise HTTPException(
                status_code=403,
                detail=f"League {league_id} ({year}) appears private. Please provide espn_s2 and SWID cookies."
            )
        raise HTTPException(status_code=400, detail=f"ESPN connection failed: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to connect to ESPN: {str(e)}")
        raise HTTPException(status_code=400, detail=f"ESPN connection failed: {str(e)}")


def _fetch_box_scores_sync(league: League, week: int):
    """Synchronous box_scores fetch — runs inside thread pool."""
    return league.box_scores(week=week)


async def fetch_box_scores(league: League, week: int, timeout: int = 20):
    """Async box_scores with per-week timeout."""
    loop = asyncio.get_event_loop()
    return await asyncio.wait_for(
        loop.run_in_executor(executor, functools.partial(_fetch_box_scores_sync, league, week)),
        timeout=timeout
    )


def _parse_lineup(team_id: int, week: int, lineup) -> TeamRosterWeek:
    """Parse a list of BoxPlayer objects into TeamRosterWeek."""
    players = []
    for p in (lineup or []):
        try:
            slot = getattr(p, 'slot_position', None) or 'BN'
            pos  = getattr(p, 'position', None) or 'UNK'
            pro  = getattr(p, 'proTeam', None) or ''
            pts  = round(float(getattr(p, 'points', 0) or 0), 2)
            pid  = getattr(p, 'playerId', None)
            nm   = getattr(p, 'name', None) or 'Unknown'
            if not pid:
                continue
            players.append(PlayerData(
                player_id=pid,
                name=nm,
                position=pos,
                slot_position=slot,
                pro_team=pro,
                points=pts,
                is_starter=(slot not in ('BN', 'IR'))
            ))
        except Exception as pe:
            logger.warning(f"Skipping player parse error: {pe}")
    return TeamRosterWeek(team_id=team_id, week=week, players=players)


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@app.get("/")
def root():
    return {"service": "ESPN Importer", "status": "running", "version": "2.0.0"}


@app.post("/api/espn/validate", response_model=LeagueInfoResponse)
async def validate_espn_auth(request: ESPNAuthRequest):
    """Validate ESPN authentication and return basic league info."""
    try:
        league = await connect_to_espn(
            request.league_id, request.year,
            request.espn_s2, request.swid,
            timeout=20
        )
        return LeagueInfoResponse(
            league_id=request.league_id,
            name=league.settings.name,
            year=league.year,
            size=len(league.teams),
            current_week=league.current_week
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/espn/import", response_model=FullLeagueData)
async def import_league_data(request: ESPNAuthRequest):
    """
    Import full league data: teams, matchups, and weekly rosters.
    Each week is fetched independently — failures are skipped, not fatal.
    """
    try:
        league = await connect_to_espn(
            request.league_id, request.year,
            request.espn_s2, request.swid,
            timeout=30
        )

        # ── Teams ────────────────────────────────────────────────────────────
        teams = []
        for team in league.teams:
            owner_name = "Unknown"
            if team.owners and len(team.owners) > 0:
                owner = team.owners[0]
                if owner and isinstance(owner, dict):
                    owner_name = f"{owner.get('firstName', '')} {owner.get('lastName', '')}".strip()
                elif owner and isinstance(owner, str):
                    owner_name = owner
            teams.append(TeamData(
                team_id=team.team_id,
                name=team.team_name,
                owner_name=owner_name,
                wins=team.wins,
                losses=team.losses,
                ties=team.ties,
                points_for=round(team.points_for, 2),
                points_against=round(team.points_against, 2)
            ))

        # ── Matchups + Rosters (per week) ────────────────────────────────────
        matchups: List[MatchupData] = []
        rosters:  List[TeamRosterWeek] = []

        for week in range(1, league.current_week + 1):
            try:
                week_matchups = await fetch_box_scores(league, week, timeout=25)
            except asyncio.TimeoutError:
                logger.warning(f"Week {week} timed out — skipping")
                continue
            except Exception as e:
                logger.warning(f"Week {week} failed — skipping: {e}")
                continue

            for matchup in week_matchups:
                if not matchup.home_team or not matchup.away_team:
                    continue

                # Matchup scores
                matchups.append(MatchupData(
                    week=week,
                    home_team_id=matchup.home_team.team_id,
                    home_team_name=matchup.home_team.team_name,
                    home_score=round(matchup.home_score or 0, 2),
                    away_team_id=matchup.away_team.team_id,
                    away_team_name=matchup.away_team.team_name,
                    away_score=round(matchup.away_score or 0, 2)
                ))

                # Roster / lineup data
                try:
                    home_roster = _parse_lineup(
                        matchup.home_team.team_id, week,
                        getattr(matchup, 'home_lineup', [])
                    )
                    if home_roster.players:
                        rosters.append(home_roster)

                    away_roster = _parse_lineup(
                        matchup.away_team.team_id, week,
                        getattr(matchup, 'away_lineup', [])
                    )
                    if away_roster.players:
                        rosters.append(away_roster)
                except Exception as re:
                    logger.warning(f"Roster parse error week {week}: {re}")

        logger.info(
            f"Import complete: {len(teams)} teams, "
            f"{len(matchups)} matchups, {len(rosters)} roster-weeks"
        )

        return FullLeagueData(
            league=LeagueInfoResponse(
                league_id=request.league_id,
                name=league.settings.name,
                year=league.year,
                size=len(league.teams),
                current_week=league.current_week
            ),
            teams=teams,
            matchups=matchups,
            rosters=rosters
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


class TransactionMove(BaseModel):
    seq: int
    week: int
    ts: Optional[int] = None          # epoch ms; None when only the week is known
    type: str                         # DRAFT | ADD | WAIVER | DROP | TRADE
    player_id: int
    from_team_id: Optional[int] = None  # None = free agency / waivers
    to_team_id: Optional[int] = None
    source: str                       # LOG | ROSTER
    note: Optional[str] = None
    draft_pick: Optional[int] = None
    draft_round: Optional[int] = None
    waiver_bid: Optional[int] = None    # FAAB leagues only
    trade_group: Optional[str] = None


class SeasonTransactions(BaseModel):
    year: int
    teams: List[Dict[str, Any]]
    players: Dict[str, Dict[str, Any]]
    moves: List[TransactionMove]
    vetoed_trades: int
    failed_pages: List[str]


@app.post("/api/espn/transactions", response_model=SeasonTransactions)
async def import_transactions(request: ESPNAuthRequest):
    """
    Every player movement in one season: draft picks, waiver claims,
    free-agent adds, drops and trades. Built from ESPN's transaction log plus
    weekly roster snapshots (see transactions.py).
    """
    loop = asyncio.get_event_loop()
    try:
        raw = await asyncio.wait_for(
            loop.run_in_executor(
                executor,
                functools.partial(fetch_season_raw, request.league_id, request.year,
                                  request.espn_s2, request.swid)
            ),
            timeout=150
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="ESPN transaction pull timed out")
    except Exception as e:
        logger.error(f"Transaction pull failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Transaction pull failed: {str(e)}")

    result = build_season_moves(raw, request.year)
    logger.info(
        f"Transactions {request.year}: {len(result['moves'])} moves, "
        f"{len({m.get('trade_group') for m in result['moves'] if m.get('trade_group')})} trades"
    )
    return result


@app.get("/api/espn/available-years/{league_id}")
def get_available_years(league_id: int):
    """Suggest available import years (heuristic — last 10)."""
    import datetime
    current_year = datetime.datetime.now().year
    years = list(range(current_year, current_year - 10, -1))
    return {
        "league_id": league_id,
        "available_years": years,
        "note": "Suggested years only. Not all may have data."
    }


if __name__ == "__main__":
    import uvicorn
    import os
    # Locally this stays on 127.0.0.1:8001. On Railway, set HOST=:: so the
    # Next.js service can reach it over the private network, and PORT=8001.
    uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1"),
                port=int(os.environ.get("PORT", "8001")), log_level="info",
                timeout_keep_alive=120)
