"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ImportPlatformSelect() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ImportPlatformContent />
    </Suspense>
  );
}

const PLATFORMS = [
  {
    name: "ESPN",
    slug: "import-espn",
    abbr: "ESPN",
    desc: "Requires cookies (espn_s2 + SWID) for private leagues. Public leagues work with just a league ID.",
    auth: "Cookie Auth",
    bar: "bg-red-500",
    hoverBorder: "hover:border-red-500/40",
    hoverShadow: "hover:shadow-red-950/60",
    nameHover: "group-hover:text-red-400",
    badge: "bg-red-500/10 text-red-400 border border-red-500/25",
    dot: "bg-red-500",
  },
  {
    name: "Sleeper",
    slug: "import-sleeper",
    abbr: "SLR",
    desc: "No authentication needed. Just your Sleeper league ID — public API.",
    auth: "Public API",
    bar: "bg-blue-500",
    hoverBorder: "hover:border-blue-500/40",
    hoverShadow: "hover:shadow-blue-950/60",
    nameHover: "group-hover:text-blue-400",
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/25",
    dot: "bg-blue-500",
  },
  {
    name: "Yahoo",
    slug: "import-yahoo",
    abbr: "YAH",
    desc: "Requires OAuth login. Connect your Yahoo account, then import any of your leagues.",
    auth: "OAuth 2.0",
    bar: "bg-purple-500",
    hoverBorder: "hover:border-purple-500/40",
    hoverShadow: "hover:shadow-purple-950/60",
    nameHover: "group-hover:text-purple-400",
    badge: "bg-purple-500/10 text-purple-400 border border-purple-500/25",
    dot: "bg-purple-500",
  },
  {
    name: "Fleaflicker",
    slug: "import-fleaflicker",
    abbr: "FLK",
    desc: "No authentication needed. Fleaflicker's API is fully public.",
    auth: "Public API",
    bar: "bg-amber-500",
    hoverBorder: "hover:border-amber-500/40",
    hoverShadow: "hover:shadow-amber-950/60",
    nameHover: "group-hover:text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
    dot: "bg-amber-500",
  },
];

function ImportPlatformContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("leagueId");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href={leagueId ? `/dashboard/leagues/${leagueId}` : "/dashboard"}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← {leagueId ? "Back to League" : "Back to Dashboard"}
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Import Data</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Choose your platform to pull your league history into TheLeague.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 max-w-3xl">

        {/* ── NO LEAGUE WARNING ───────────────────────────────────────── */}
        {!leagueId && (
          <div className="flex items-start gap-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl p-4 mb-8">
            <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-bold text-yellow-400">
              No league selected.{" "}
              <Link href="/dashboard/leagues/create" className="underline hover:text-yellow-300 transition-colors">
                Create a league first
              </Link>{" "}
              to link imported data.
            </p>
          </div>
        )}

        {/* ── PLATFORM CARDS ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {PLATFORMS.map((p) => (
            <Link
              key={p.slug}
              href={`/dashboard/leagues/${p.slug}${leagueId ? `?leagueId=${leagueId}` : ""}`}
            >
              <div
                className={`group relative flex items-stretch bg-slate-900 border border-white/8 ${p.hoverBorder} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${p.hoverShadow} cursor-pointer`}
              >
                {/* Left color bar */}
                <div className={`w-1 flex-shrink-0 ${p.bar}`} />

                <div className="flex items-center gap-5 px-6 py-5 flex-1">
                  {/* Abbr chip */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 border border-white/8 flex items-center justify-center">
                    <span className="text-xs font-black text-slate-400 tracking-wider">{p.abbr}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h3 className={`font-black text-white ${p.nameHover} transition-colors`}>{p.name}</h3>
                      <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 ${p.badge}`}>
                        {p.auth}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{p.desc}</p>
                  </div>

                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
