"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ImportPlatformSelect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-6xl animate-bounce">📥</div>
      </div>
    }>
      <ImportPlatformContent />
    </Suspense>
  );
}

function ImportPlatformContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("leagueId");

  const platforms = [
    {
      name: "ESPN",
      slug: "import-espn",
      icon: "🏈",
      desc: "Requires ESPN cookies (espn_s2 + SWID)",
      auth: "Cookie-based",
      color: "from-red-900/30 to-red-800/30",
      border: "border-red-500/20 hover:border-red-500/50",
      badge: "bg-red-500/20 text-red-400 border-red-500/30",
      textColor: "group-hover:text-red-400",
    },
    {
      name: "Sleeper",
      slug: "import-sleeper",
      icon: "😴",
      desc: "No authentication needed — just your league ID",
      auth: "Public API",
      color: "from-blue-900/30 to-blue-800/30",
      border: "border-blue-500/20 hover:border-blue-500/50",
      badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      textColor: "group-hover:text-blue-400",
    },
    {
      name: "Yahoo",
      slug: "import-yahoo",
      icon: "🟣",
      desc: "Requires Yahoo OAuth login",
      auth: "OAuth 2.0",
      color: "from-purple-900/30 to-purple-800/30",
      border: "border-purple-500/20 hover:border-purple-500/50",
      badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      textColor: "group-hover:text-purple-400",
    },
    {
      name: "Fleaflicker",
      slug: "import-fleaflicker",
      icon: "🪲",
      desc: "No authentication needed — just your league ID",
      auth: "Public API",
      color: "from-amber-900/30 to-amber-800/30",
      border: "border-amber-500/20 hover:border-amber-500/50",
      badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      textColor: "group-hover:text-amber-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-700/10 to-emerald-900/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/30 rounded-3xl p-10 shadow-2xl">
            <Link href={leagueId ? `/dashboard/leagues/${leagueId}` : "/dashboard"} className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold mb-4 transition-colors">
              <span className="text-2xl">←</span>
              <span>{leagueId ? "Back to League" : "Back to Dashboard"}</span>
            </Link>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">Import Data</h1>
            <p className="text-2xl text-slate-400 font-semibold">Choose your fantasy football platform to import from.</p>
          </div>
        </div>

        {!leagueId && (
          <div className="p-4 bg-yellow-500/20 border-2 border-yellow-500/30 rounded-2xl text-yellow-400 font-bold flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span>No league selected. <Link href="/dashboard/leagues/create" className="underline hover:text-yellow-300 transition-colors">Create a league first</Link>.</span>
          </div>
        )}

        {/* Platform Cards */}
        <div className="grid gap-6">
          {platforms.map((p) => (
            <Link
              key={p.slug}
              href={`/dashboard/leagues/${p.slug}${leagueId ? `?leagueId=${leagueId}` : ""}`}
            >
              <div className={`group relative bg-gradient-to-br ${p.color} backdrop-blur-xl rounded-3xl p-8 border-2 ${p.border} transition-all duration-500 transform hover:scale-[1.02] shadow-xl hover:shadow-2xl cursor-pointer`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10 flex items-center gap-6">
                  <span className="text-6xl group-hover:scale-125 transition-transform duration-500">{p.icon}</span>
                  <div className="flex-1">
                    <h3 className={`font-black text-2xl text-white ${p.textColor} transition-colors`}>{p.name}</h3>
                    <p className="text-slate-400 font-semibold mt-1">{p.desc}</p>
                  </div>
                  <span className={`text-xs px-4 py-2 rounded-full font-black uppercase tracking-wider border ${p.badge}`}>
                    {p.auth}
                  </span>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
