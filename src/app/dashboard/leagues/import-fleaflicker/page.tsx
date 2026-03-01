"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportFleaflickerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-6xl animate-spin">🪲</div>
      </div>
    }>
      <ImportFleaflickerContent />
    </Suspense>
  );
}

function ImportFleaflickerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leagueId = searchParams.get("leagueId");

  const [formData, setFormData] = useState({ league_id: "", year: "2024" });
  const [status, setStatus] = useState<"idle" | "validating" | "importing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [leagueInfo, setLeagueInfo] = useState<Record<string, unknown> | null>(null);

  const handleValidate = async () => {
    setStatus("validating");
    setMessage("");
    try {
      const res = await fetch("/api/fleaflicker/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      setLeagueInfo(data);
      setStatus("success");
      setMessage(`✓ Found "${data.name}" (${data.size} teams, ${data.season} season)`);
    } catch (error: unknown) {
      setStatus("error");
      setMessage(`✗ ${error instanceof Error ? error.message : "Unknown error"}`);
      setLeagueInfo(null);
    }
  };

  const handleImport = async () => {
    if (!leagueId) { setStatus("error"); setMessage("No league selected. Create a league first."); return; }
    setStatus("importing");
    setMessage("Importing from Fleaflicker... this may take a minute.");
    try {
      const res = await fetch("/api/fleaflicker/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setStatus("success");
      setMessage(`✓ ${data.message}`);
      setTimeout(() => router.push(`/dashboard/leagues/${leagueId}`), 2000);
    } catch (error: unknown) {
      setStatus("error");
      setMessage(`✗ ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const isLoading = status === "validating" || status === "importing";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 via-amber-700/10 to-amber-900/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-10 shadow-2xl">
            <Link href={leagueId ? `/dashboard/leagues/${leagueId}` : "/dashboard/leagues/import"} className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold mb-4 transition-colors">
              <span className="text-2xl">←</span>
              <span>{leagueId ? "Back to League" : "Back to Platforms"}</span>
            </Link>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">🪲 Import Fleaflicker</h1>
            <p className="text-2xl text-slate-400 font-semibold">No authentication needed — Fleaflicker&apos;s API is fully public.</p>
            {!leagueId && (
              <div className="mt-4 p-4 bg-yellow-500/20 border-2 border-yellow-500/30 rounded-2xl text-yellow-400 font-bold flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span>No league selected. <Link href="/dashboard/leagues/create" className="underline hover:text-yellow-300">Create a league first</Link>.</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-amber-500/20 rounded-3xl p-10 shadow-2xl space-y-8">
          <div className="space-y-3">
            <label className="block text-sm font-black text-amber-400 uppercase tracking-wider">Fleaflicker League ID *</label>
            <input
              value={formData.league_id}
              onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
              placeholder="e.g. 123456"
              disabled={isLoading}
              className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold placeholder-slate-600 focus:border-amber-500/50 focus:outline-none transition-colors disabled:opacity-50"
            />
            <p className="text-sm text-slate-500 font-medium">Found in your URL: fleaflicker.com/nfl/leagues/<span className="text-amber-400 font-bold">YOUR_ID</span></p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-black text-amber-400 uppercase tracking-wider">Season Year</label>
            <select
              className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold focus:border-amber-500/50 focus:outline-none transition-colors disabled:opacity-50"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              disabled={isLoading}
            >
              {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl border-2 font-bold ${
              status === "error" ? "border-red-500/30 bg-red-500/20 text-red-400" :
              status === "success" ? "border-green-500/30 bg-green-500/20 text-green-400" :
              "border-blue-500/30 bg-blue-500/20 text-blue-400"
            }`}>{message}</div>
          )}

          {leagueInfo && status === "success" && (
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-2 border-green-500/30 rounded-2xl p-6">
              <h3 className="font-black text-green-400 mb-3">League Connected!</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Name", value: String(leagueInfo.name) },
                  { label: "Season", value: String(leagueInfo.season) },
                  { label: "Teams", value: String(leagueInfo.size) },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-lg font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={handleValidate} disabled={isLoading || !formData.league_id}
              className="flex-1 h-14 bg-slate-700/50 border-2 border-amber-500/30 text-white rounded-xl font-black text-lg hover:bg-amber-500/20 hover:border-amber-500/50 transition-all disabled:opacity-50">
              {status === "validating" ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> Validating...</span> : "Validate Connection"}
            </button>
            {leagueInfo && (
              <button onClick={handleImport} disabled={isLoading || !leagueId}
                className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-black text-lg shadow-2xl hover:shadow-emerald-500/50 transition-all transform hover:scale-105 disabled:opacity-50">
                {status === "importing" ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> Importing...</span> : "Import League Data 🚀"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
