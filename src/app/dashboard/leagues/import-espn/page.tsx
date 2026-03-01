"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportESPNPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-6xl animate-spin">🏈</div>
      </div>
    }>
      <ImportESPNContent />
    </Suspense>
  );
}

function ImportESPNContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leagueId = searchParams.get("leagueId");

  const [formData, setFormData] = useState({
    league_id: "",
    year: "2024",
    espn_s2: "",
    swid: "",
  });

  const [status, setStatus] = useState<"idle" | "validating" | "importing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [leagueInfo, setLeagueInfo] = useState<Record<string, unknown> | null>(null);

  const handleValidate = async () => {
    setStatus("validating");
    setMessage("");

    try {
      const response = await fetch("/api/espn/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Validation failed");

      setLeagueInfo(data);
      setStatus("success");
      setMessage(`✓ Connected to "${data.name}" (${data.size} teams, ${data.year})`);
    } catch (error: unknown) {
      setStatus("error");
      setMessage(`✗ ${error instanceof Error ? error.message : "Unknown error"}`);
      setLeagueInfo(null);
    }
  };

  const handleImport = async () => {
    if (!leagueId) {
      setStatus("error");
      setMessage("No league selected. Please create a league first, then import from the league page.");
      return;
    }

    setStatus("importing");
    setMessage("Importing league data and saving to database...");

    try {
      const response = await fetch("/api/espn/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, leagueId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");

      setStatus("success");
      setMessage(`✓ ${data.message}`);

      setTimeout(() => {
        router.push(`/dashboard/leagues/${leagueId}`);
      }, 2000);
    } catch (error: unknown) {
      setStatus("error");
      setMessage(`✗ ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const isLoading = status === "validating" || status === "importing";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-red-700/10 to-red-900/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-red-500/30 rounded-3xl p-10 shadow-2xl">
            <Link
              href={leagueId ? `/dashboard/leagues/${leagueId}` : "/dashboard/leagues/import"}
              className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-bold mb-4 transition-colors"
            >
              <span className="text-2xl">←</span>
              <span>{leagueId ? "Back to League" : "Back to Platforms"}</span>
            </Link>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">🏈 Import ESPN</h1>
            <p className="text-2xl text-slate-400 font-semibold">Connect your ESPN Fantasy Football league to TheLeague</p>
            {!leagueId && (
              <div className="mt-4 p-4 bg-yellow-500/20 border-2 border-yellow-500/30 rounded-2xl text-yellow-400 font-bold flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span>No league selected. <Link href="/dashboard/leagues/create" className="underline hover:text-yellow-300">Create a league first</Link>.</span>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-red-500/20 rounded-3xl p-10 shadow-2xl space-y-8">
          <div className="space-y-3">
            <label className="block text-sm font-black text-red-400 uppercase tracking-wider">ESPN League ID *</label>
            <input
              type="text"
              value={formData.league_id}
              onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
              placeholder="Enter your ESPN league ID"
              disabled={isLoading}
              className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold placeholder-slate-600 focus:border-red-500/50 focus:outline-none transition-colors disabled:opacity-50"
            />
            <p className="text-sm text-slate-500 font-medium">
              Found in your league URL: fantasy.espn.com/football/league?leagueId=<span className="text-red-400 font-bold">YOUR_ID</span>
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-black text-red-400 uppercase tracking-wider">Season Year *</label>
            <select
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold focus:border-red-500/50 focus:outline-none transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Private League Cookies */}
          <details className="rounded-2xl border-2 border-slate-600/30 bg-slate-800/30 overflow-hidden">
            <summary className="cursor-pointer font-black text-lg text-white p-6 hover:bg-slate-700/30 transition-colors">
              🔒 Private league? Add ESPN cookies (optional)
            </summary>
            <div className="p-6 pt-0 space-y-6">
              <p className="text-slate-400 font-medium">
                Only needed if your league is set to private. Public leagues can import with just the League ID.
              </p>
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-400 uppercase tracking-wider">espn_s2 Cookie</label>
                <input
                  type="password"
                  value={formData.espn_s2}
                  onChange={(e) => setFormData({ ...formData, espn_s2: e.target.value })}
                  placeholder="Paste your espn_s2 cookie here"
                  className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white font-mono font-bold placeholder-slate-600 focus:border-red-500/50 focus:outline-none transition-colors disabled:opacity-50"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-400 uppercase tracking-wider">SWID Cookie</label>
                <input
                  type="password"
                  value={formData.swid}
                  onChange={(e) => setFormData({ ...formData, swid: e.target.value })}
                  placeholder="Paste your SWID cookie here"
                  className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white font-mono font-bold placeholder-slate-600 focus:border-red-500/50 focus:outline-none transition-colors disabled:opacity-50"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              {/* Guide */}
              <div className="bg-blue-500/10 border-2 border-blue-500/20 rounded-2xl p-6">
                <p className="font-black text-blue-400 mb-4 flex items-center gap-2">
                  🔑 Quick Guide: Get Your ESPN Cookies
                </p>
                <div className="space-y-2 text-sm text-slate-300 font-medium">
                  <p>1. Open <span className="text-white font-bold">fantasy.espn.com</span> in a private/incognito window</p>
                  <p>2. Log in and open your league page</p>
                  <p>3. Press <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded font-mono text-xs">F12</kbd> (or <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded font-mono text-xs">⌘⌥I</kbd> on Mac)</p>
                  <p>4. Click <span className="text-white font-bold">Application</span> tab → <span className="text-white font-bold">Cookies</span> → <span className="text-white font-bold">fantasy.espn.com</span></p>
                  <p>5. Find and copy <code className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded font-mono text-red-400">espn_s2</code> and <code className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded font-mono text-red-400">SWID</code></p>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-500/20">
                  <a
                    href="https://www.youtube.com/results?search_query=how+to+get+espn+fantasy+cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 font-bold transition-colors"
                  >
                    📺 Watch video tutorial on YouTube →
                  </a>
                </div>
              </div>
            </div>
          </details>

          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-2xl border-2 font-bold ${
              status === "error" ? "border-red-500/30 bg-red-500/20 text-red-400" :
              status === "success" ? "border-green-500/30 bg-green-500/20 text-green-400" :
              "border-blue-500/30 bg-blue-500/20 text-blue-400"
            }`}>
              {message}
            </div>
          )}

          {/* League Info Preview */}
          {leagueInfo && status === "success" && (
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-2 border-green-500/30 rounded-2xl p-6">
              <h3 className="font-black text-green-400 mb-3">League Connected!</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Name", value: String(leagueInfo.name) },
                  { label: "Year", value: String(leagueInfo.year) },
                  { label: "Teams", value: String(leagueInfo.size) },
                  { label: "Current Week", value: String(leagueInfo.current_week) },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-lg font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleValidate}
              disabled={isLoading || !formData.league_id}
              className="flex-1 h-14 bg-slate-700/50 border-2 border-red-500/30 text-white rounded-xl font-black text-lg hover:bg-red-500/20 hover:border-red-500/50 transition-all disabled:opacity-50"
            >
              {status === "validating" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Validating...
                </span>
              ) : (
                "Validate Connection"
              )}
            </button>

            {leagueInfo && (
              <button
                onClick={handleImport}
                disabled={isLoading || !leagueId}
                className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-black text-lg shadow-2xl hover:shadow-emerald-500/50 transition-all transform hover:scale-105 disabled:opacity-50"
              >
                {status === "importing" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span> Importing...
                  </span>
                ) : (
                  "Import League Data 🚀"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
