# TheLeague

**The ultimate fantasy football legacy platform.**

Import every season from ESPN, Sleeper, Yahoo, or Fleaflicker into a permanent archive. Unlock 50+ all-time records, career stats, head-to-head history, finances, and a public league page — with a $36/year commissioner subscription.

---

## Status

**Active development — Phases 1–3 complete, Phase 4–5 in progress.**

| Phase | Description | Status |
|---|---|---|
| 0 | Setup & research | ✅ Complete |
| 1 | Core platform | ✅ Complete |
| 2 | Import engine | ✅ Mostly complete |
| 3 | History & record book | ✅ Mostly complete |
| 4 | Finances, league website, newsletters | 🔄 In progress |
| 5 | Polish, payments & launch | 🔄 In progress |
| 6 | Post-MVP (mobile, AI, multi-sport) | ⏳ Not started |

**Last updated:** May 10, 2026

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL via Prisma ORM |
| Auth | Clerk |
| Payments | Stripe (subscriptions + webhooks) |
| Charts | Recharts |
| ESPN service | Python 3 + FastAPI + `espn_api` library |
| Testing | Playwright |
| Hosting (target) | Vercel + Supabase/Neon |

---

## Running Locally

```bash
# 1. Install JS dependencies
npm install

# 2. Install Python dependencies (ESPN service)
pip3 install fastapi uvicorn espn_api --break-system-packages

# 3. Configure environment
cp .env.example .env.local
# Fill in: DATABASE_URL, CLERK_*, STRIPE_*, ESPN_SERVICE_URL

# 4. Run both services concurrently
npm run dev
```

- Next.js: `http://localhost:3000`
- ESPN FastAPI service: `http://localhost:8001`

> **Preview without a database:** The dashboard currently has mock data enabled for UI development. See the `MOCK_USER` / `MOCK_LEAGUES` block at the top of `src/app/dashboard/page.tsx` — comment it out and uncomment the Prisma calls once `DATABASE_URL` is set.

### Individual scripts

```bash
npm run dev:next      # Next.js only
npm run espn-service  # Python ESPN service only
npm run build         # Production build
npm run test          # Playwright e2e tests
```

---

## Project Structure

```
theleague-app/
├── src/app/
│   ├── page.tsx                          # Landing page
│   ├── dashboard/
│   │   ├── layout.tsx                    # Sidebar + mobile nav
│   │   ├── page.tsx                      # Dashboard home
│   │   └── leagues/[leagueId]/
│   │       ├── page.tsx                  # League overview
│   │       ├── members/[memberId]/       # Member detail + roster
│   │       ├── records/                  # Record book
│   │       ├── transactions/             # Every add, drop, claim, trade
│   │       ├── players/[playerId]/       # One player's path through the league
│   │       ├── history/                  # Season timeline
│   │       ├── analytics/                # Charts
│   │       ├── finances/                 # Dues + payouts
│   │       ├── newsletter/               # Newsletter generator
│   │       └── settings/                 # League settings
│   └── api/
│       ├── espn/                         # ESPN import + validate
│       ├── sleeper/                      # Sleeper import + validate
│       ├── yahoo/                        # Yahoo OAuth + import
│       ├── fleaflicker/                  # Fleaflicker import + validate
│       ├── leagues/                      # League CRUD + analytics
│       ├── invite/                       # Member invite flow
│       └── stripe/                       # Checkout + webhooks
├── services/
│   └── espn-importer/
│       ├── main.py                       # FastAPI ESPN service (v2)
│       └── transactions.py               # Transaction history builder
├── prisma/
│   └── schema.prisma                     # Full DB schema
└── src/lib/
    ├── db.ts                             # Prisma client
    ├── auth.ts                           # getCurrentUser helper
    ├── records.ts                        # Record book + career stats engine
    ├── transactions.ts                   # Transaction queries for pages
    └── transactions-import.ts            # Saves imported transaction history
```

---

## Transaction History

ESPN imports now include every player movement for the season: draft picks, waiver claims, free-agent adds, drops and trades, one `Transaction` row per player moved.

ESPN keeps a week-by-week transaction log for past seasons but no longer records which players moved in most historical trades. `services/espn-importer/transactions.py` combines that log with weekly roster snapshots: logged moves come straight from the log with exact timestamps, and replaying them against each week's rosters recovers trades and anything the log missed. A roster-found trade is dated by matching it to the log's accept/uphold events (same or adjacent week, accepted by one of the two teams). Rows recovered from rosters are marked `source = ROSTER_SNAPSHOT`.

```bash
# Apply the schema change
npx prisma migrate deploy

# Tests for the builder
cd services/espn-importer && python3 -m unittest test_transactions

# Backfill from saved raw ESPN JSON (year -> fetch_season_raw output) without re-importing
python3 services/espn-importer/transactions.py raw.json --league-id 6911200 > seasons.json
npm run load:espn-transactions -- <league id or slug> seasons.json
```

---

## Player Milestones

Player pages show two groups of milestones, each with the round number last reached and how far off the next one is:

- **NFL career** (regular season): passing/rushing/receiving yards and TDs, receptions, scrimmage yards, field goals, and counts of 1,000-yard / 4,000-yard seasons. Stats come from [nflverse](https://github.com/nflverse/nflverse-data) (free, every season since 1999, updated during the season) and are matched to our players by ESPN id.
- **In the league**: fantasy points in starting lineups, starts and weeks rostered (from imported weekly rosters), plus managers, times drafted and transactions.

A milestone is **close** when the player should reach it within 4 games at his current-season rate (3 starts for league milestones, which only count while the league's latest season is the one in progress). The league page's **Milestone Watch** lists rostered players who are close, or who passed one this season.

```bash
npx prisma migrate deploy   # adds player_season_stats
npm run sync:nfl-stats      # ~20s; re-run weekly in season to keep "close" current
npm run test:unit           # milestone rule tests
```

nflverse totals are built from play-by-play and can differ from official totals by a few yards.

---

## Roadmap

### Phase 0 — Setup ✅ Complete
- [x] Next.js 16 + TypeScript + Prisma + Tailwind + shadcn/ui initialised
- [x] PostgreSQL schema: League, Season, Team, Member, Week, Matchup, Roster, Player, RosterSpot, Draft, Transaction, Finance
- [x] Clerk auth + Stripe test mode configured
- [x] Playwright scaffolding

### Phase 1 — Core Platform ✅ Complete
- [x] User auth (Clerk — email/password + Google OAuth)
- [x] League creation and member invites (email-based)
- [x] Role system: Commissioner, Co-Commissioner, Member
- [x] Dashboard layout (fixed sidebar + mobile nav)
- [x] League settings page
- [x] Dark/premium UI across all pages (landing, dashboard, member, record book)

### Phase 2 — Import Engine ✅ Mostly Complete
- [x] ESPN — Python FastAPI service (`services/espn-importer/main.py`)
  - [x] League info, teams, final scores
  - [x] Weekly roster + player lineup data (starters vs bench, points per player)
  - [x] Private league support (espn_s2 + SWID cookies)
  - [x] Per-week async timeouts; server no longer crashes on large imports
  - [x] Transaction history: every draft pick, waiver claim, free-agent add, drop and trade (`services/espn-importer/transactions.py`)
- [x] Sleeper importer
- [x] Yahoo importer (OAuth2)
- [x] Fleaflicker importer
- [x] DB pipeline: Season → Team → Member → Week → Matchup → Roster → RosterSpot → Player
- [ ] Background weekly sync / cron job (Inngest or BullMQ — not yet wired up)
- [ ] Import progress UI ("Importing week X of Y…", resume on failure)

### Phase 3 — History & Record Book ✅ Mostly Complete
- [x] Record book engine (`src/lib/records.ts`) — auto-computed on import
- [x] Records across Scoring, Matchups, Season, Streaks, All-Time, Top/Bottom Scores, Luck
- [x] Member career stats: W-L-T, win %, PF, PA, best/worst week, avg/game
- [x] Head-to-head records (all-time, per opponent, win rate)
- [x] Season-by-season breakdown table with best-season highlight
- [x] Member charts (Recharts — weekly scores, season PF bar chart)
- [x] Season history / timeline page
- [x] Starters vs bench split on roster page with per-player points
- [x] Transactions page (filter by season, manager, type, player), trades view, player journey pages
- [x] Player milestones — NFL career (nflverse stats) and in-league (points, starts, managers), plus a Milestone Watch on the league page
- [ ] Expand record book to 50+ records (currently ~20)
- [ ] Streaks tracker (current win/loss streak)
- [ ] Filter records by season or member

### Phase 4 — Finances, League Website, Newsletters 🔄 In Progress
- [x] Finance module: dues, payouts, fines (DB schema + API routes)
- [x] Generate dues for all members in one click
- [x] Newsletter page scaffolded
- [x] Public league page (`/league/[slug]`)
- [ ] Newsletter: AI-powered weekly recap content
- [ ] Newsletter: email delivery via Resend
- [ ] League website builder (template editor)
- [ ] Custom league slug / public subdomain

### Phase 5 — Polish, Payments & Launch 🔄 In Progress
- [x] Stripe checkout + subscription webhook handler
- [x] Landing page (dark/premium redesign, fixed nav, no emojis)
- [x] Dashboard, member detail, and record book UI fully redesigned
- [x] Mobile-responsive layout + mobile nav
- [ ] 7-day free trial enforcement (Stripe + cron check)
- [ ] Feature gating for expired/canceled subscriptions
- [ ] SEO meta tags for public league pages
- [ ] Admin panel (owner-level view across all leagues)
- [ ] Vercel production deployment + custom domain
- [ ] Full E2E test coverage for import → view flow

### Phase 6 — Post-MVP ⏳ Not started
- [ ] Mobile PWA / React Native app
- [ ] Additional platforms: NFL.com, CBS Sports, MFL
- [ ] AI-powered weekly recap summaries and trash talk generator
- [ ] Multi-sport support (NBA, MLB, NHL)
- [ ] Live draft board tool

---

## Known Issues

| Issue | Status |
|---|---|
| ESPN import crashed dev server on large seasons | Fixed — async per-week timeouts; removed `--kill-others` from `concurrently` |
| Roster/lineup data not saving to DB | Fixed — `home_lineup` / `away_lineup` now extracted and saved via RosterSpot |
| Dashboard requires live DB to render | Temporary mock data in `dashboard/page.tsx` for UI preview |
| Background weekly sync not implemented | Pending — Inngest / BullMQ not yet wired up |
| Record book capped at ~20 records | Target is 50+; `lib/records.ts` is extensible |
| ESPN members are keyed by team slot, not owner | A slot that changed hands (e.g. a new manager taking over team 2) is treated as one member across seasons, which merges career stats, records and transactions. Fix: key members by ESPN owner id in `/api/espn/import` |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Services
ESPN_SERVICE_URL=http://127.0.0.1:8001
```

---

## Data Model (abbreviated)

```
User → Member → League
League → Season (one per platform per year)
Season → Team → Roster → RosterSpot → Player
Season → Week → Matchup
Season → Draft → DraftPick
League → Finance (dues / payouts / fines)
League → Invite
```

Full schema: [`prisma/schema.prisma`](./prisma/schema.prisma)

---

## Creator

**Thomas Jones** ([@Tjonestjones](https://github.com/Tjonestjones))

Private repository. All rights reserved.
