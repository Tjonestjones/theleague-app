import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

// ─────────────────────────────────────────────────────────────────────────────
// Landing Page
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/6 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-base font-black tracking-tight text-white hover:text-emerald-400 transition-colors">
            TheLeague
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {["Features", "Platforms", "Pricing"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm font-bold text-slate-400 hover:text-white transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors"
              >
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-14 overflow-hidden">
        {/* ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-700/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2.5 border border-white/10 bg-white/4 rounded-full px-4 py-1.5 mb-10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Fantasy Football History Platform
            </span>
          </div>

          {/* headline */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.92] mb-8">
            Your league&apos;s history,{" "}
            <span className="bg-gradient-to-br from-emerald-400 to-green-500 bg-clip-text text-transparent">
              preserved forever.
            </span>
          </h1>

          {/* sub */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Import every season from ESPN, Sleeper, Yahoo, or Fleaflicker. Unlock 50+ all-time records,
            career stats, head-to-head history, and a public league page — all in one permanent archive.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <SignedOut>
              <Link href="/sign-up">
                <button className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-base transition-all shadow-lg shadow-emerald-950/60">
                  Start free trial
                </button>
              </Link>
              <Link href="/sign-in">
                <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/8 border border-white/10 text-white rounded-xl font-bold text-base transition-all">
                  Sign in
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-base transition-all shadow-lg shadow-emerald-950/60">
                  Open dashboard
                </button>
              </Link>
            </SignedIn>
          </div>

          {/* trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-600 uppercase tracking-widest">
            <TrustItem label="7-day free trial" />
            <span className="w-px h-3 bg-white/10" />
            <TrustItem label="$36 per year" />
            <span className="w-px h-3 bg-white/10" />
            <TrustItem label="No credit card required" />
            <span className="w-px h-3 bg-white/10" />
            <TrustItem label="Cancel anytime" />
          </div>
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ── TICKER STRIP ─────────────────────────────────────────────────── */}
      <div className="border-y border-white/6 bg-slate-950 py-4 overflow-hidden">
        <div className="flex gap-12 items-center text-xs font-black uppercase tracking-widest text-slate-600 whitespace-nowrap px-6">
          {[
            "One-click import",
            "50+ automated records",
            "Career head-to-head",
            "All-time standings",
            "Performance analytics",
            "League finances",
            "Weekly newsletters",
            "Public league page",
            "Unlimited history",
            "Permanent archive",
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-12">
              {item}
              <span className="w-1 h-1 rounded-full bg-emerald-700 inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 bg-gradient-to-b from-slate-950 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4">Features</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white max-w-xl leading-tight">
              Everything your league needs. Nothing it doesn&apos;t.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative bg-slate-900 border border-white/6 hover:border-emerald-500/30 rounded-2xl p-7 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-5">
                  <span className="text-xs font-black text-slate-700 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-black ${feature.accentBg} ${feature.accentBorder} ${feature.accentText}`}>
                    {feature.abbr}
                  </div>
                </div>
                <h3 className="font-black text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                <div className={`mt-6 h-px w-full bg-gradient-to-r ${feature.gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-28 bg-black border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-16 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4">Setup in minutes</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Three steps to your league archive.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

            {[
              {
                step: "01",
                title: "Create your league",
                body: "Sign up and create a league profile. Add a name, invite your members, and set your sport.",
              },
              {
                step: "02",
                title: "Import your history",
                body: "Connect ESPN, Sleeper, Yahoo, or Fleaflicker with your credentials. One click imports every season.",
              },
              {
                step: "03",
                title: "Explore the archive",
                body: "Records populate automatically. Browse career stats, head-to-head history, and all-time standings.",
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-sm font-black text-emerald-400">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-black text-white text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ────────────────────────────────────────────────────── */}
      <section id="platforms" className="py-28 bg-gradient-to-b from-black to-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4">Integrations</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white max-w-xl leading-tight">
              Import from any platform.
            </h2>
            <p className="text-slate-500 mt-4 max-w-md text-sm leading-relaxed font-medium">
              Seamless imports from all four major fantasy football platforms. If your history lives there, we can bring it here.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className={`group relative rounded-2xl border p-8 transition-all duration-200 ${p.bg} ${p.border}`}
              >
                <div className={`text-xs font-black uppercase tracking-widest mb-4 ${p.labelColor}`}>
                  {p.label}
                </div>
                <p className={`text-2xl font-black ${p.nameColor} mb-2`}>{p.name}</p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{p.desc}</p>
                <div className={`absolute bottom-0 inset-x-0 h-px rounded-b-2xl ${p.bottomLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 bg-slate-950 border-y border-white/5">
        <div className="max-w-xl mx-auto px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              One price. Unlimited history.
            </h2>
            <p className="text-slate-500 mt-4 text-sm leading-relaxed">
              The commissioner pays. The whole league benefits. Forever.
            </p>
          </div>

          {/* pricing card */}
          <div className="relative rounded-2xl border border-emerald-500/25 bg-slate-900 overflow-hidden">
            {/* top accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

            <div className="p-8">
              {/* plan label */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/25 rounded-full px-3 py-1">
                  Pro
                </span>
                <span className="text-xs font-bold text-slate-600">Per league · billed annually</span>
              </div>

              {/* price */}
              <div className="flex items-end gap-2 mb-2">
                <span className="text-lg font-black text-slate-400 leading-none mb-2">$</span>
                <span className="text-7xl font-black text-white leading-none">36</span>
                <span className="text-sm font-bold text-slate-500 leading-none mb-3">/year</span>
              </div>
              <p className="text-xs text-slate-600 font-medium mb-8">
                That&apos;s $3 per month, for your entire league.
              </p>

              {/* feature list */}
              <ul className="space-y-3 mb-8">
                {[
                  "7-day free trial included",
                  "Unlimited seasons and history",
                  "All 4 platform imports",
                  "50+ automated records",
                  "Career stats and head-to-head",
                  "Public league website",
                  "Finance and dues tracking",
                  "Weekly newsletter generator",
                  "Unlimited members",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 10 8">
                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <SignedOut>
                <Link href="/sign-up" className="block">
                  <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-base transition-all shadow-lg shadow-emerald-950/60">
                    Start your free trial
                  </button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="block">
                  <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-base transition-all shadow-lg shadow-emerald-950/60">
                    Go to dashboard
                  </button>
                </Link>
              </SignedIn>

              <p className="text-center text-xs text-slate-600 font-medium mt-4">
                No credit card required to start
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_60%)]" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5 leading-tight">
            Stop losing history to platform resets.{" "}
            <span className="text-emerald-400">Build the archive your league deserves.</span>
          </h2>
          <p className="text-slate-500 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Every week you wait is another week of history you can&apos;t get back. Import your full archive today.
          </p>
          <SignedOut>
            <Link href="/sign-up">
              <button className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-base transition-all shadow-lg shadow-emerald-950/60">
                Start your free trial
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <button className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-base transition-all shadow-lg shadow-emerald-950/60">
                Open dashboard
              </button>
            </Link>
          </SignedIn>
          <p className="mt-5 text-xs text-slate-700 font-bold uppercase tracking-widest">
            7-day free trial · $36/year · No credit card
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/6 bg-black py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-black text-slate-600 tracking-tight">TheLeague</span>
          <p className="text-xs text-slate-700 font-medium">
            &copy; 2026 TheLeague. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="text-xs font-bold text-slate-700 hover:text-slate-400 transition-colors">
              Sign in
            </Link>
            <Link href="/sign-up" className="text-xs font-bold text-slate-700 hover:text-slate-400 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

function TrustItem({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 10 8">
        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

const FEATURES = [
  {
    title: "One-Click Import",
    desc: "Pull every season from ESPN, Sleeper, Yahoo, or Fleaflicker in minutes. Historical seasons, rosters, scores — all of it.",
    abbr: "↓",
    accentBg: "bg-emerald-500/10", accentBorder: "border-emerald-500/20", accentText: "text-emerald-400",
    gradientLine: "from-transparent via-emerald-500/40 to-transparent",
  },
  {
    title: "50+ Automated Records",
    desc: "Highest single-week score, longest win streak, biggest blowout, worst loss — every record tracked from day one.",
    abbr: "★",
    accentBg: "bg-yellow-500/10", accentBorder: "border-yellow-500/20", accentText: "text-yellow-400",
    gradientLine: "from-transparent via-yellow-500/40 to-transparent",
  },
  {
    title: "All-Time Standings",
    desc: "Career win percentages, total points scored, season-by-season breakdowns. See who actually dominates.",
    abbr: "≡",
    accentBg: "bg-blue-500/10", accentBorder: "border-blue-500/20", accentText: "text-blue-400",
    gradientLine: "from-transparent via-blue-500/40 to-transparent",
  },
  {
    title: "Head-to-Head History",
    desc: "Every matchup between every pair of managers, going back as far as your data reaches.",
    abbr: "↔",
    accentBg: "bg-red-500/10", accentBorder: "border-red-500/20", accentText: "text-red-400",
    gradientLine: "from-transparent via-red-500/40 to-transparent",
  },
  {
    title: "Charts & Analytics",
    desc: "Scoring trends over time, season comparisons, and per-member performance visualizations.",
    abbr: "∿",
    accentBg: "bg-purple-500/10", accentBorder: "border-purple-500/20", accentText: "text-purple-400",
    gradientLine: "from-transparent via-purple-500/40 to-transparent",
  },
  {
    title: "Public League Page",
    desc: "A shareable URL for your league — standings, records, champions. No login required for members.",
    abbr: "↗",
    accentBg: "bg-cyan-500/10", accentBorder: "border-cyan-500/20", accentText: "text-cyan-400",
    gradientLine: "from-transparent via-cyan-500/40 to-transparent",
  },
  {
    title: "Finance Tracking",
    desc: "Track dues, payouts, and fines. Generate dues for all members in one click.",
    abbr: "$",
    accentBg: "bg-green-500/10", accentBorder: "border-green-500/20", accentText: "text-green-400",
    gradientLine: "from-transparent via-green-500/40 to-transparent",
  },
  {
    title: "Weekly Newsletters",
    desc: "Auto-generated weekly recap emails with scores, standings, and highlights — ready to send.",
    abbr: "✉",
    accentBg: "bg-orange-500/10", accentBorder: "border-orange-500/20", accentText: "text-orange-400",
    gradientLine: "from-transparent via-orange-500/40 to-transparent",
  },
  {
    title: "Permanent Archive",
    desc: "Your data is stored regardless of what happens to the original platform. Import once, access forever.",
    abbr: "∞",
    accentBg: "bg-slate-600/20", accentBorder: "border-slate-500/20", accentText: "text-slate-400",
    gradientLine: "from-transparent via-slate-500/40 to-transparent",
  },
];

const PLATFORMS = [
  {
    name: "ESPN",
    label: "Official API",
    desc: "Full season history, rosters, scores, and matchups via ESPN's fantasy API.",
    bg: "bg-red-950/20",
    border: "border-red-900/30 hover:border-red-500/30",
    labelColor: "text-red-500",
    nameColor: "text-white",
    bottomLine: "bg-red-500/50",
  },
  {
    name: "Sleeper",
    label: "REST API",
    desc: "Deep Sleeper integration including rosters, transactions, and draft history.",
    bg: "bg-blue-950/20",
    border: "border-blue-900/30 hover:border-blue-500/30",
    labelColor: "text-blue-500",
    nameColor: "text-white",
    bottomLine: "bg-blue-500/50",
  },
  {
    name: "Yahoo",
    label: "OAuth2",
    desc: "Secure Yahoo OAuth import for private and public leagues going back years.",
    bg: "bg-purple-950/20",
    border: "border-purple-900/30 hover:border-purple-500/30",
    labelColor: "text-purple-500",
    nameColor: "text-white",
    bottomLine: "bg-purple-500/50",
  },
  {
    name: "Fleaflicker",
    label: "Public API",
    desc: "Fleaflicker's public API gives us full access to your league's complete history.",
    bg: "bg-amber-950/20",
    border: "border-amber-900/30 hover:border-amber-500/30",
    labelColor: "text-amber-500",
    nameColor: "text-white",
    bottomLine: "bg-amber-500/50",
  },
];
