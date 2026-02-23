# Pre-Deployment Checklist

**Status**: 🟡 In Progress  
**Target**: Production-ready deployment on Vercel

---

## 1. Configuration ⚙️

### Environment Variables
- [x] **Database URL** — Supabase connected ✅
- [x] **Clerk Auth** — Test keys configured ✅
- [ ] **Stripe Keys** — Need test keys (payment testing)
  - `STRIPE_SECRET_KEY` (backend)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (frontend)
  - `STRIPE_WEBHOOK_SECRET` (for subscription webhooks)
- [ ] **Yahoo OAuth** — Need dev app registration
  - `YAHOO_CLIENT_ID`
  - `YAHOO_CLIENT_SECRET`
  - Callback URL: `{APP_URL}/api/yahoo/callback`
  - Register at: https://developer.yahoo.com/apps

### Admin Access
- [ ] **Update admin email** in `src/app/dashboard/admin/page.tsx`
  - Current: `thomasjones@theleague.app` (fake)
  - Need: Dr. Swiss's actual email

### Security Audit
- [ ] Review all API routes for auth checks
- [ ] Check CORS configuration on ESPN service
- [ ] Verify no hardcoded secrets in codebase
- [ ] Check middleware public route exceptions

---

## 2. Testing 🧪

### E2E Tests (Playwright)
- [ ] Install Playwright
- [ ] Configure `playwright.config.ts`
- [ ] Critical path tests:
  - [ ] User signup/signin flow
  - [ ] League creation
  - [ ] ESPN import (with test league)
  - [ ] Sleeper import
  - [ ] Record book generation
  - [ ] Public league page access

### Real-World Importer Testing
- [x] **ESPN** — Tested with "Stab league 🤤🤤🤤" ✅
- [ ] **Sleeper** — Need test with public league
- [ ] **Yahoo** — Requires OAuth setup first
- [ ] **Fleaflicker** — Need test with public league

### Manual QA Checklist
- [ ] Test all import error states (invalid IDs, private leagues)
- [ ] Verify record book calculations with known data
- [ ] Test Stripe checkout flow (test mode)
- [ ] Test subscription status checks
- [ ] Verify weekly newsletter generation
- [ ] Test member invite flow
- [ ] Check finances CRUD operations

---

## 3. Design & UX 🎨

### Landing Page
- [ ] Review hero section copy
- [ ] Check feature cards clarity
- [ ] Verify CTA prominence
- [ ] Test mobile responsive layout
- [ ] Add screenshots/demo visuals?

### Dashboard
- [ ] Review empty states (new user experience)
- [ ] Check navigation clarity
- [ ] Verify loading states on all pages
- [ ] Test error messages (user-friendly?)

### Import Flows
- [ ] Simplify ESPN cookie instructions
- [ ] Add progress indicators for imports
- [ ] Show validation errors clearly
- [ ] Add success confirmations with next steps

### Record Book & History
- [ ] Check readability of stats tables
- [ ] Verify chart colors/accessibility
- [ ] Test with empty/minimal data

### Mobile Responsiveness
- [ ] Landing page on mobile
- [ ] Dashboard navigation (hamburger menu?)
- [ ] Tables overflow handling
- [ ] Forms on small screens

---

## 4. Performance ⚡

- [ ] Lighthouse audit (Performance, SEO, Accessibility)
- [ ] Check bundle size (`npm run build` analysis)
- [ ] Verify image optimization
- [ ] Test import speed (large leagues 10+ years)
- [ ] Check database query performance (indexes?)

---

## 5. SEO & Metadata 🔍

- [ ] Add OpenGraph tags to landing page
- [ ] Public league pages have proper meta descriptions
- [ ] Sitemap generation for `/league/[slug]` routes
- [ ] robots.txt configuration
- [ ] Structured data for league pages

---

## 6. Documentation 📚

- [ ] Update README with deployment instructions
- [ ] Document environment variable setup
- [ ] Add Yahoo OAuth setup guide
- [ ] Document ESPN cookie extraction (user-facing)
- [ ] Create troubleshooting guide for imports

---

## 7. Pre-Launch Technical Debt 🔧

- [ ] Remove console.logs from production code
- [ ] Add error logging service (Sentry?)
- [ ] Set up monitoring (Vercel Analytics? PostHog?)
- [ ] Configure email notifications for failed imports
- [ ] Add rate limiting on import endpoints

---

## 8. Legal & Compliance ⚖️

- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Cookie consent (if EU traffic expected)
- [ ] Stripe T&C link in checkout
- [ ] Data deletion policy (GDPR compliance)

---

## 9. Deployment Prep 🚀

### Vercel Setup
- [ ] Create Vercel project
- [ ] Link GitHub repo
- [ ] Configure environment variables in Vercel
- [ ] Set up custom domain DNS
- [ ] Configure Stripe webhook endpoint (Vercel URL)

### Database
- [ ] Run production migrations
- [ ] Seed initial data (if any)
- [ ] Set up automated backups

### CI/CD
- [ ] GitHub Actions for type checks
- [ ] Automated Playwright tests on PR
- [ ] Lint checks before deploy

---

## 10. Post-Deployment Monitoring 👀

- [ ] Test production deploy works
- [ ] Verify Stripe webhooks fire correctly
- [ ] Test email delivery (welcome, invites)
- [ ] Monitor error logs for 24h
- [ ] Test all import platforms on production

---

**Notes:**
- Prioritize: Configuration → Testing → Design Polish → Deployment
- Yahoo OAuth can be skipped for initial launch (mark as "Coming Soon")
- Focus on ESPN + Sleeper for MVP (most users)
