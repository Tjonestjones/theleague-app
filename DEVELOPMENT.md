# Development Guide - TheLegue

## Prerequisites

- Node.js 18+ (for Next.js)
- Python 3.9+ (for ESPN importer service)
- PostgreSQL database (Supabase or Neon recommended)
- Clerk account (for authentication)

## Setup

### 1. Install Dependencies

**Node.js (Next.js frontend):**
```bash
npm install
```

**Python (ESPN importer service):**
```bash
cd services/espn-importer
pip3 install -r requirements.txt
cd ../..
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - from Clerk dashboard
- `CLERK_SECRET_KEY` - from Clerk dashboard
- `ESPN_SERVICE_URL` - `http://127.0.0.1:8001` (default)

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (when database is ready)
npx prisma migrate dev
```

## Running the Application

You need **TWO terminal windows**:

### Terminal 1: Next.js (Frontend + API)
```bash
npm run dev
```
Runs on: http://localhost:3000

### Terminal 2: ESPN Importer Service (Python)
```bash
cd services/espn-importer
python3 main.py
# OR
./start.sh
```
Runs on: http://127.0.0.1:8001

## Development Workflow

### Testing ESPN Import

1. Visit http://localhost:3000/dashboard/leagues/import-espn
2. Get your ESPN cookies:
   - Open ESPN Fantasy in incognito mode
   - Log in and navigate to your league
   - Open DevTools → Application → Cookies
   - Copy `espn_s2` and `SWID`
3. Enter league ID, year, and cookies
4. Click "Validate Connection"
5. Click "Import League Data"

### API Endpoints

**Next.js API Routes:**
- `POST /api/espn/validate` - Validate ESPN auth
- `POST /api/espn/import` - Import league data

**Python Service (direct):**
- `GET http://127.0.0.1:8001/` - Health check
- `POST http://127.0.0.1:8001/api/espn/validate` - Validate ESPN
- `POST http://127.0.0.1:8001/api/espn/import` - Import data

## Project Structure

```
theleague-app/
├── src/
│   ├── app/
│   │   ├── api/espn/              # Next.js API routes (proxy to Python)
│   │   ├── dashboard/             # Dashboard UI
│   │   │   └── leagues/
│   │   │       └── import-espn/   # ESPN import form
│   │   ├── layout.tsx             # Root layout (Clerk provider)
│   │   └── page.tsx               # Landing page
│   ├── components/ui/             # shadcn/ui components
│   ├── lib/
│   │   ├── db.ts                  # Prisma client
│   │   └── utils.ts               # Utilities
│   └── middleware.ts              # Clerk auth middleware
├── services/
│   └── espn-importer/             # Python FastAPI service
│       ├── main.py                # FastAPI app
│       ├── requirements.txt       # Python dependencies
│       └── start.sh               # Start script
├── prisma/
│   └── schema.prisma              # Database schema
├── docs/
│   └── integrations.md            # Platform API research
└── test-data/                     # ESPN API test responses
```

## Debugging

### ESPN Service Not Responding
```bash
# Check if running
curl http://127.0.0.1:8001/

# Restart
cd services/espn-importer
python3 main.py
```

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Reset database (DEV ONLY)
npx prisma migrate reset
```

### Clerk Auth Issues
- Verify `.env.local` has correct keys
- Check Clerk dashboard for allowed redirect URLs
- Ensure `http://localhost:3000` is whitelisted

## Next Steps

### Phase 2 (Current - In Progress):
- ✅ Python ESPN importer service
- ✅ Next.js API integration
- ✅ Import form UI
- ⏳ Save imported data to Prisma
- ⏳ Background sync jobs (Inngest)

### Phase 3 (Upcoming):
- Record book computation
- Analytics & visualizations
- League homepage builder

## Useful Commands

```bash
# Prisma
npx prisma studio              # Open Prisma Studio (DB GUI)
npx prisma migrate dev         # Create new migration
npx prisma generate            # Regenerate Prisma Client

# Next.js
npm run build                  # Production build
npm run lint                   # Run ESLint

# Git
git status                     # Check status
git add -A && git commit       # Commit all changes
git push                       # Push to GitHub
```

## Troubleshooting

### Python SSL Warnings
If you see `NotOpenSSLWarning`, it's safe to ignore (macOS LibreSSL vs OpenSSL).

### Port Already in Use
```bash
# Kill process on port 3000 (Next.js)
lsof -ti:3000 | xargs kill

# Kill process on port 8001 (Python)
lsof -ti:8001 | xargs kill
```

### ESPN Cookies Expired
ESPN cookies expire after ~24 hours. Get fresh ones from the browser.

---

**Happy coding! 🏈**
