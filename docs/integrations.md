# Platform Integration Guide

This document contains research, authentication flows, API endpoints, rate limits, and implementation notes for all supported fantasy football platforms.

## 🎯 Integration Priority

1. **Sleeper** (Easiest — official REST API)
2. **ESPN** (Moderate — unofficial API, cookie auth)
3. **Yahoo** (Complex — OAuth2 required)
4. **Fleaflicker** (Easy — public REST API)

---

## 1. Sleeper

### Overview
- **Official API**: ✅ Yes
- **Documentation**: https://docs.sleeper.com
- **Authentication**: None required for read-only league data
- **Rate Limits**: 1000 requests/minute

### Key Endpoints

#### Get League
```
GET https://api.sleeper.app/v1/league/<league_id>
```
Returns: League settings, roster settings, scoring, season

#### Get Rosters
```
GET https://api.sleeper.app/v1/league/<league_id>/rosters
```
Returns: All team rosters for a season

#### Get Users (Members)
```
GET https://api.sleeper.app/v1/league/<league_id>/users
```
Returns: League member information

#### Get Matchups (by Week)
```
GET https://api.sleeper.app/v1/league/<league_id>/matchups/<week>
```
Returns: Weekly matchup results, scores, rosters

#### Get Transactions
```
GET https://api.sleeper.app/v1/league/<league_id>/transactions/<week>
```
Returns: Trades, adds, drops, waivers

#### Get Drafted Players
```
GET https://api.sleeper.app/v1/league/<league_id>/drafts
GET https://api.sleeper.app/v1/draft/<draft_id>/picks
```
Returns: Draft results and picks

#### Get All Players (Master List)
```
GET https://api.sleeper.app/v1/players/nfl
```
Returns: Complete NFL player database with IDs (use for normalization)

### Implementation Notes
- No authentication needed for public leagues
- Private leagues may require user login (OAuth flow available)
- Player IDs are Sleeper-specific; use player database endpoint to map names
- Supports historical data for past seasons (need prior season league IDs)

### Data Model
```typescript
interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  settings: {
    playoff_week_start: number;
    num_teams: number;
    // ... many more settings
  };
  scoring_settings: Record<string, number>;
  roster_positions: string[];
}

interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[]; // Sleeper player IDs
  starters: string[];
  reserve: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
  };
}

interface SleeperMatchup {
  matchup_id: number;
  roster_id: number;
  points: number;
  players_points: Record<string, number>;
}
```

---

## 2. ESPN

### Overview
- **Official API**: ❌ No (unofficial/undocumented)
- **Documentation**: Community-maintained (e.g., `espn-api-py`)
- **Authentication**: Cookie-based (requires ESPN login for private leagues)
- **Rate Limits**: Unknown (be conservative: ~10 req/sec)

### Authentication Flow
For **private leagues**, need two cookies:
- `espn_s2` (session token)
- `SWID` (user ID)

**How to get**:
1. User logs into ESPN Fantasy
2. Open browser DevTools → Application → Cookies → espn.com
3. Copy `espn_s2` and `SWID` values
4. Store securely (encrypted in database)

### Key Endpoints

Base URL: `https://fantasy.espn.com/apis/v3/games/ffl/seasons/<YEAR>/segments/0/leagues/<LEAGUE_ID>`

#### Get League Settings
```
GET ?view=mSettings
```
Returns: League name, size, scoring settings

#### Get Teams/Rosters
```
GET ?view=mTeam
```
Returns: Team info, owners, rosters

#### Get Matchups (Scoreboard)
```
GET ?view=mScoreboard&scoringPeriodId=<WEEK>
```
Returns: Weekly matchups and scores

#### Get Standings
```
GET ?view=mStandings
```
Returns: Season standings, wins/losses/points

#### Get Transactions
```
GET ?view=mTransactions2
```
Returns: Trades, waivers, adds/drops

#### Get Draft Results
```
GET ?view=mDraftDetail
```
Returns: Draft picks by round

### Implementation Notes
- Public leagues: no auth needed
- Private leagues: must include `espn_s2` and `SWID` as cookies in headers
- Season parameter in URL (e.g., `/seasons/2023/`)
- Historical data accessible by changing `YEAR` in URL
- Response is massive JSON (100KB+); parse carefully
- Player IDs are ESPN-specific; no official player mapping API

### Data Model
```typescript
interface ESPNLeague {
  id: number;
  settings: {
    name: string;
    size: number;
    scoringSettings: {
      scoringItems: Array<{
        statId: number;
        points: number;
      }>;
    };
  };
}

interface ESPNTeam {
  id: number;
  name: string;
  abbrev: string;
  owners: string[];
  record: {
    overall: {
      wins: number;
      losses: number;
      ties: number;
    };
  };
  valuesByStat: Record<number, number>; // ESPN stat IDs
}

interface ESPNMatchup {
  matchupPeriodId: number;
  home: {
    teamId: number;
    totalPoints: number;
  };
  away: {
    teamId: number;
    totalPoints: number;
  };
}
```

---

## 3. Yahoo

### Overview
- **Official API**: ✅ Yes
- **Documentation**: https://developer.yahoo.com/fantasysports/
- **Authentication**: OAuth 2.0 (required for all requests)
- **Rate Limits**: 20,000 requests/day per app

### Authentication Flow
**OAuth 2.0 (3-legged)**:
1. Register app at https://developer.yahoo.com/apps/
2. Get `client_id` and `client_secret`
3. Redirect user to Yahoo authorization URL
4. User grants access
5. Exchange authorization code for access token
6. Use access token in API requests (expires in 1 hour; refresh token lasts 1 year)

**Required Scopes**: `fspt-r` (fantasy sports read)

### Key Endpoints

Base URL: `https://fantasysports.yahooapis.com/fantasy/v2`

#### Get League Settings
```
GET /league/<league_key>
```
Returns: League metadata, settings, scoring

#### Get Teams
```
GET /league/<league_key>/teams
```
Returns: All teams in league

#### Get Standings
```
GET /league/<league_key>/standings
```
Returns: Current standings

#### Get Scoreboard (Matchups)
```
GET /league/<league_key>/scoreboard
```
Returns: Weekly matchups

#### Get Transactions
```
GET /league/<league_key>/transactions
```
Returns: All trades, adds, drops

#### Get Draft Results
```
GET /league/<league_key>/draftresults
```
Returns: Draft picks

### Implementation Notes
- OAuth is **mandatory** (even for public leagues)
- `league_key` format: `<game_id>.l.<league_id>` (e.g., `449.l.123456`)
- Responses are XML by default (can request JSON with `format=json`)
- Historical data: change `game_id` (e.g., 449 = NFL 2024, 423 = NFL 2023)
- Refresh tokens required (access tokens expire hourly)

### Data Model
```typescript
interface YahooLeague {
  league_key: string;
  league_id: string;
  name: string;
  season: string;
  num_teams: number;
  scoring_type: string; // "head" (head-to-head) or "point" (points-based)
  settings: {
    playoff_start_week: number;
    uses_playoff: boolean;
    // ...
  };
}

interface YahooTeam {
  team_key: string;
  team_id: string;
  name: string;
  managers: Array<{
    nickname: string;
    email: string;
  }>;
  standings: {
    rank: number;
    wins: number;
    losses: number;
    ties: number;
    points_for: number;
  };
}

interface YahooMatchup {
  week: number;
  status: string; // "postevent" when complete
  teams: Array<{
    team_key: string;
    points: number;
  }>;
}
```

---

## 4. Fleaflicker

### Overview
- **Official API**: ✅ Yes (public)
- **Documentation**: https://www.fleaflicker.com/api-docs/index.html
- **Authentication**: None required
- **Rate Limits**: Not officially documented (be respectful: ~5 req/sec)

### Key Endpoints

Base URL: `https://www.fleaflicker.com/api`

#### Get League
```
GET /FetchLeagueStandings?sport=NFL&league_id=<LEAGUE_ID>&season=<YEAR>
```
Returns: League info + standings

#### Get League Scoreboard
```
GET /FetchLeagueScoreboard?sport=NFL&league_id=<LEAGUE_ID>&season=<YEAR>&scoring_period=<WEEK>
```
Returns: Matchups for a specific week

#### Get League Rosters
```
GET /FetchLeagueRosters?sport=NFL&league_id=<LEAGUE_ID>&season=<YEAR>
```
Returns: All team rosters

#### Get League Transactions
```
GET /FetchLeagueTransactions?sport=NFL&league_id=<LEAGUE_ID>&season=<YEAR>
```
Returns: Trades, adds, drops

#### Get League Draft
```
GET /FetchLeagueDraft?sport=NFL&league_id=<LEAGUE_ID>&season=<YEAR>
```
Returns: Draft results

### Implementation Notes
- Completely open API (no auth)
- Supports historical seasons via `season` param
- Player IDs are Fleaflicker-specific
- JSON responses
- Simpler data structure than ESPN/Yahoo

### Data Model
```typescript
interface FleaflickerLeague {
  id: number;
  name: string;
  season: number;
  divisions: Array<{
    id: number;
    name: string;
    teams: FleaflickerTeam[];
  }>;
}

interface FleaflickerTeam {
  id: number;
  name: string;
  owners: Array<{
    id: number;
    displayName: string;
  }>;
  recordOverall: {
    wins: number;
    losses: number;
    ties: number;
  };
  pointsFor: {
    value: number;
  };
}

interface FleaflickerMatchup {
  games: Array<{
    home: {
      team: { id: number };
      score: { value: number };
    };
    away: {
      team: { id: number };
      score: { value: number };
    };
  }>;
}
```

---

## Data Normalization Strategy

### Player ID Mapping
Each platform uses its own player IDs. To unify:

1. **Source of Truth**: Sleeper's player database (most complete, includes name + NFL ID)
2. **Mapping Table**: `PlayerMapping` in database
   ```sql
   CREATE TABLE player_mappings (
     id UUID PRIMARY KEY,
     canonical_name TEXT, -- normalized name
     sleeper_id TEXT,
     espn_id INT,
     yahoo_id TEXT,
     fleaflicker_id INT,
     nfl_id TEXT,
     position TEXT,
     team TEXT
   );
   ```
3. **Normalization Process**:
   - Import Sleeper player DB on first run
   - For each platform import, match players by name + position + team
   - Store mapping for future imports
   - Manual override UI for edge cases

### Data Flow
1. User provides league ID + platform
2. Background job fetches raw data via API
3. Parser extracts league/team/matchup/transaction data
4. Normalizer maps to unified schema (using player mappings)
5. Store in database
6. Compute records/stats
7. Display in UI

---

## Rate Limiting & Background Jobs

### Strategy
- **Inngest** for scheduling (cron-like, visual dashboard)
- **BullMQ + Redis** for job queue (if heavy processing needed)

### Job Types
1. **Initial Import** (user-triggered)
   - Run once per historical season
   - Can take 30s–2min depending on platform
2. **Weekly Sync** (automated cron)
   - Runs every Tuesday 3 AM (after MNF)
   - Only fetches current season + recent weeks
   - ~10s per league
3. **Manual Sync** (user-triggered)
   - "Sync Now" button
   - Rate-limited to 1x per 5 minutes per league

### Rate Limit Handling
- Exponential backoff on errors
- Store last request timestamp per platform
- Queue requests if approaching limits
- User-facing status: "Syncing...", "Completed", "Failed (retry in X min)"

---

## Security & Privacy

### API Credentials Storage
- **Sleeper**: No creds needed (public API)
- **ESPN**: Encrypt `espn_s2` + `SWID` cookies (AES-256)
- **Yahoo**: Store OAuth tokens encrypted, refresh automatically
- **Fleaflicker**: No creds needed

### User Permissions
- Commissioner owns league data
- Can revoke import access (delete tokens)
- Members have read-only access
- Export feature allows data portability

---

## Testing Strategy

### Unit Tests
- Mock API responses for each platform
- Test parsers independently
- Test normalization logic

### Integration Tests
- Use test leagues on each platform (with known data)
- Verify end-to-end import flow
- Check record book computation accuracy

### Manual QA
- Import real leagues from each platform
- Validate scores match platform UI
- Check edge cases (ties, playoff weeks, keeper leagues)

---

## Next Steps (Phase 0)

- [x] Document all 4 platforms
- [ ] Set up test accounts/leagues on each platform
- [ ] Build abstract `ImportService` class
- [ ] Implement Sleeper importer (easiest first win)
- [ ] Create initial database schema
- [ ] Build player mapping table

---

**Last Updated**: February 17, 2026  
**Status**: Phase 0 (Research & Planning)
