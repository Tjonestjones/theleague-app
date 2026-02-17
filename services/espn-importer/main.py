"""
ESPN Fantasy Football Importer Service
FastAPI service for importing ESPN league data
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from espn_api.football import League
from typing import Optional, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ESPN Importer Service", version="1.0.0")

# CORS middleware for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ESPNAuthRequest(BaseModel):
    league_id: int
    year: int
    espn_s2: str
    swid: str


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


class FullLeagueData(BaseModel):
    league: LeagueInfoResponse
    teams: List[TeamData]
    matchups: List[MatchupData]


# Helper function to connect to ESPN
def connect_to_espn(league_id: int, year: int, espn_s2: str, swid: str) -> League:
    """Connect to ESPN Fantasy League with authentication"""
    try:
        logger.info(f"Connecting to ESPN league {league_id} for year {year}")
        league = League(
            league_id=league_id,
            year=year,
            espn_s2=espn_s2,
            swid=swid
        )
        return league
    except Exception as e:
        logger.error(f"Failed to connect to ESPN: {str(e)}")
        raise HTTPException(status_code=400, detail=f"ESPN connection failed: {str(e)}")


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "service": "ESPN Importer",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/api/espn/validate", response_model=LeagueInfoResponse)
def validate_espn_auth(request: ESPNAuthRequest):
    """
    Validate ESPN authentication and return basic league info
    """
    try:
        league = connect_to_espn(
            request.league_id,
            request.year,
            request.espn_s2,
            request.swid
        )
        
        return LeagueInfoResponse(
            league_id=request.league_id,
            name=league.settings.name,
            year=league.year,
            size=len(league.teams),
            current_week=league.current_week
        )
    
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/espn/import", response_model=FullLeagueData)
def import_league_data(request: ESPNAuthRequest):
    """
    Import full league data for a season
    """
    try:
        league = connect_to_espn(
            request.league_id,
            request.year,
            request.espn_s2,
            request.swid
        )
        
        # Extract teams data
        teams = []
        for team in league.teams:
            owner_name = "Unknown"
            if team.owners and len(team.owners) > 0:
                owner = team.owners[0]
                owner_name = f"{owner.get('firstName', '')} {owner.get('lastName', '')}".strip()
            
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
        
        # Extract matchups for all weeks
        matchups = []
        for week in range(1, league.current_week + 1):
            try:
                week_matchups = league.box_scores(week=week)
                for matchup in week_matchups:
                    matchups.append(MatchupData(
                        week=week,
                        home_team_id=matchup.home_team.team_id,
                        home_team_name=matchup.home_team.team_name,
                        home_score=round(matchup.home_score, 2),
                        away_team_id=matchup.away_team.team_id,
                        away_team_name=matchup.away_team.team_name,
                        away_score=round(matchup.away_score, 2)
                    ))
            except Exception as e:
                logger.warning(f"Failed to fetch week {week}: {str(e)}")
                continue
        
        return FullLeagueData(
            league=LeagueInfoResponse(
                league_id=request.league_id,
                name=league.settings.name,
                year=league.year,
                size=len(league.teams),
                current_week=league.current_week
            ),
            teams=teams,
            matchups=matchups
        )
    
    except Exception as e:
        logger.error(f"Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@app.get("/api/espn/available-years/{league_id}")
def get_available_years(league_id: int):
    """
    Get list of available years for a league
    Note: This is a heuristic - ESPN leagues typically exist for 5-10 years
    """
    current_year = 2024
    # Return last 10 years as possibilities
    years = list(range(current_year, current_year - 10, -1))
    
    return {
        "league_id": league_id,
        "available_years": years,
        "note": "These are suggested years. Not all may be available."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
