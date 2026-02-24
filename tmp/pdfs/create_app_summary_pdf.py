from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem

out_path = "output/pdf/theleague-app-summary.pdf"

doc = SimpleDocTemplate(
    out_path,
    pagesize=letter,
    rightMargin=0.6 * inch,
    leftMargin=0.6 * inch,
    topMargin=0.55 * inch,
    bottomMargin=0.55 * inch,
)

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name="DocTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=19,
    leading=22,
    textColor=colors.HexColor("#0f172a"),
    spaceAfter=8,
))

styles.add(ParagraphStyle(
    name="Meta",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=8.5,
    leading=10.5,
    textColor=colors.HexColor("#475569"),
    spaceAfter=8,
))

styles.add(ParagraphStyle(
    name="Section",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=10.5,
    leading=12.5,
    textColor=colors.HexColor("#1e3a8a"),
    spaceBefore=4,
    spaceAfter=3,
))

styles.add(ParagraphStyle(
    name="Body",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9,
    leading=11,
    textColor=colors.HexColor("#111827"),
))

styles.add(ParagraphStyle(
    name="BulletBody",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=8.8,
    leading=10.6,
    textColor=colors.HexColor("#111827"),
))

story = []

story.append(Paragraph("TheLeague App Summary", styles["DocTitle"]))
story.append(Paragraph(
    "Source basis: repository files and code paths in /Users/thomasjones/Documents/theleague-app (README, DEVELOPMENT.md, Prisma schema, API routes, dashboard pages).",
    styles["Meta"],
))

story.append(Paragraph("What It Is", styles["Section"]))
story.append(Paragraph(
    "TheLeague is a web app for running and preserving fantasy league history with commissioner-focused tooling. "
    "It combines league data import, member/season management, finances, and recap content in one Next.js + Prisma application.",
    styles["Body"],
))

story.append(Spacer(1, 3))
story.append(Paragraph("Who It's For", styles["Section"]))
story.append(Paragraph(
    "Primary persona: fantasy league commissioners and co-commissioners who manage members, import historical data, track dues/payouts, and share league updates.",
    styles["Body"],
))

story.append(Spacer(1, 3))
story.append(Paragraph("What It Does", styles["Section"]))
feature_bullets = [
    "Creates and manages leagues with role-based access (commissioner, co-commissioner, member).",
    "Imports season data from ESPN, Sleeper, Yahoo, and Fleaflicker through dedicated validate/import API routes.",
    "Stores long-term league structure and stats entities (seasons, teams, weeks, matchups, transactions, records).",
    "Supports invites and acceptance flows for bringing members into leagues.",
    "Provides finances workflows: dues/payout/fine entries, summary totals, and per-member dues generation.",
    "Generates weekly league newsletter content from completed matchup results.",
    "Handles paid subscription checkout via Stripe with a 7-day trial path.",
]

story.append(ListFlowable(
    [ListItem(Paragraph(text, styles["BulletBody"])) for text in feature_bullets],
    bulletType="bullet",
    leftIndent=12,
    bulletFontName="Helvetica",
    bulletFontSize=8,
    bulletOffsetY=0,
    spaceBefore=1,
    spaceAfter=1,
))

story.append(Spacer(1, 2))
story.append(Paragraph("How It Works (Repo-Evidenced Architecture)", styles["Section"]))
arch_bullets = [
    "UI layer: Next.js App Router pages under src/app (dashboard, league detail, import pages, records/history/members/finances/newsletter).",
    "Auth layer: Clerk middleware and server helpers (src/middleware.ts, src/lib/auth.ts) gate access and upsert app users.",
    "API layer: Next.js route handlers under src/app/api/* enforce auth/roles and implement league, invite, finance, import, newsletter, and billing operations.",
    "Data layer: Prisma ORM + PostgreSQL schema in prisma/schema.prisma with core models (User, League, Member, Season, Team, Week, Matchup, Finance, Invite, etc.).",
    "Import service integration: ESPN import route proxies to a Python FastAPI service (services/espn-importer/main.py), then normalizes and upserts season/team/week/matchup data into Prisma.",
    "External integrations: Yahoo OAuth routes and Stripe checkout/webhook routes are implemented; scheduled jobs/background worker framework is Not found in repo.",
]
story.append(ListFlowable(
    [ListItem(Paragraph(text, styles["BulletBody"])) for text in arch_bullets],
    bulletType="bullet",
    leftIndent=12,
    bulletFontName="Helvetica",
    bulletFontSize=8,
    bulletOffsetY=0,
    spaceBefore=1,
    spaceAfter=1,
))

story.append(Spacer(1, 2))
story.append(Paragraph("How To Run (Minimal Getting Started)", styles["Section"]))
run_bullets = [
    "Install app deps: npm install",
    "Install ESPN service deps: pip3 install -r services/espn-importer/requirements.txt",
    "Create local env: cp .env.local.example .env.local, then set DATABASE_URL, Clerk keys, and ESPN_SERVICE_URL.",
    "Prepare DB: npx prisma generate && npx prisma migrate dev",
    "Start local dev: npm run dev (runs Next.js and ESPN importer service together).",
]
story.append(ListFlowable(
    [ListItem(Paragraph(text, styles["BulletBody"])) for text in run_bullets],
    bulletType="bullet",
    leftIndent=12,
    bulletFontName="Helvetica",
    bulletFontSize=8,
    bulletOffsetY=0,
))

doc.build(story)
print(out_path)
