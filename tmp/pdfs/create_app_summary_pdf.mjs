import { chromium } from 'playwright';
import fs from 'fs';

const outPdf = 'output/pdf/theleague-app-summary.pdf';
const outPng = 'tmp/pdfs/theleague-app-summary-preview.png';

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>TheLeague App Summary</title>
<style>
  @page { size: Letter; margin: 0.5in; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 0;
    color: #111827;
    background: #fff;
  }
  .page {
    width: 7.5in;
    min-height: 10in;
    box-sizing: border-box;
    border: 1px solid #e5e7eb;
    padding: 0.28in 0.32in;
  }
  h1 {
    margin: 0 0 4px 0;
    font-size: 22px;
    line-height: 1.15;
    color: #0f172a;
  }
  .meta {
    font-size: 10px;
    color: #475569;
    margin: 0 0 6px 0;
  }
  h2 {
    margin: 8px 0 3px 0;
    font-size: 14px;
    color: #1e3a8a;
    line-height: 1.2;
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.25;
  }
  ul {
    margin: 2px 0 0 0;
    padding-left: 16px;
  }
  li {
    margin: 0 0 2px 0;
    font-size: 11.2px;
    line-height: 1.24;
  }
</style>
</head>
<body>
  <div class="page">
    <h1>TheLeague App Summary</h1>
    <p class="meta">Source basis: repository files and code paths in /Users/thomasjones/Documents/theleague-app (README, DEVELOPMENT.md, Prisma schema, API routes, dashboard pages).</p>

    <h2>What It Is</h2>
    <p>TheLeague is a web app for running and preserving fantasy league history with commissioner-focused tooling. It combines league data import, member/season management, finances, and recap content in one Next.js plus Prisma application.</p>

    <h2>Who It's For</h2>
    <p>Primary persona: fantasy league commissioners and co-commissioners who manage members, import historical data, track dues and payouts, and share league updates.</p>

    <h2>What It Does</h2>
    <ul>
      <li>Creates and manages leagues with role-based access (commissioner, co-commissioner, member).</li>
      <li>Imports season data from ESPN, Sleeper, Yahoo, and Fleaflicker via dedicated validate/import API routes.</li>
      <li>Stores long-term league entities and stats data (seasons, teams, weeks, matchups, transactions, records).</li>
      <li>Supports invite and acceptance flows for adding members to leagues.</li>
      <li>Provides finances workflows: dues, payouts, fines, summary totals, and per-member dues generation.</li>
      <li>Generates weekly league newsletter content from completed matchups.</li>
      <li>Handles paid subscription checkout via Stripe with a 7-day trial path.</li>
    </ul>

    <h2>How It Works (Repo-Evidenced Architecture)</h2>
    <ul>
      <li>UI layer: Next.js App Router pages under src/app for dashboard, league detail, import pages, records/history, members, finances, and newsletter.</li>
      <li>Auth layer: Clerk middleware and server helpers (src/middleware.ts, src/lib/auth.ts) gate access and upsert app users.</li>
      <li>API layer: Next.js route handlers under src/app/api enforce auth/roles and implement league, invite, finance, import, newsletter, and billing operations.</li>
      <li>Data layer: Prisma ORM with PostgreSQL schema (prisma/schema.prisma) including User, League, Member, Season, Team, Week, Matchup, Finance, and Invite models.</li>
      <li>Import flow: ESPN route proxies to Python FastAPI service (services/espn-importer/main.py), then normalizes and upserts season/team/week/matchup data into Prisma.</li>
      <li>External integrations: Yahoo OAuth and Stripe checkout/webhook routes are implemented; scheduled background worker runtime is Not found in repo.</li>
    </ul>

    <h2>How To Run (Minimal Getting Started)</h2>
    <ul>
      <li>Install app deps: npm install</li>
      <li>Install ESPN service deps: pip3 install -r services/espn-importer/requirements.txt</li>
      <li>Create local env: cp .env.local.example .env.local, then set DATABASE_URL, Clerk keys, and ESPN_SERVICE_URL.</li>
      <li>Prepare DB: npx prisma generate and npx prisma migrate dev</li>
      <li>Start local dev: npm run dev (runs Next.js and ESPN importer service together).</li>
    </ul>
  </div>
</body>
</html>`;

fs.mkdirSync('output/pdf', { recursive: true });
fs.mkdirSync('tmp/pdfs', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: outPng, fullPage: true });
await page.pdf({
  path: outPdf,
  format: 'Letter',
  margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();

console.log(outPdf);
console.log(outPng);
