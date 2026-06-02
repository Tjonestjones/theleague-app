"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SPORTS = [
  { value: "NFL", label: "NFL", sub: "Fantasy Football" },
  { value: "NBA", label: "NBA", sub: "Fantasy Basketball" },
  { value: "MLB", label: "MLB", sub: "Fantasy Baseball" },
  { value: "NHL", label: "NHL", sub: "Fantasy Hockey" },
];

export default function CreateLeaguePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sport: "NFL",
    visibility: "PRIVATE",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create league");
        return;
      }

      router.push(`/dashboard/leagues/${data.league.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Create a League</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Set up your league and start importing your history.
          </p>
        </div>
      </div>

      {/* ── FORM ───────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-10 max-w-2xl">
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-7">

            {error && (
              <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-sm font-bold text-red-400">{error}</p>
              </div>
            )}

            {/* League Name */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                League Name <span className="text-emerald-500">*</span>
              </label>
              <input
                placeholder="e.g. Sunday Night Legends"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                Description <span className="text-slate-700 font-normal normal-case tracking-normal">optional</span>
              </label>
              <input
                placeholder="A brief description of your league"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-11 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none transition-colors"
              />
            </div>

            {/* Sport */}
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Sport</label>
              <div className="grid grid-cols-2 gap-3">
                {SPORTS.map((sport) => {
                  const selected = formData.sport === sport.value;
                  return (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, sport: sport.value })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-white/8 bg-slate-800/30 hover:border-white/15"
                      }`}
                    >
                      <span className={`block text-xs font-black uppercase tracking-widest mb-1 ${selected ? "text-emerald-400" : "text-slate-500"}`}>
                        {sport.label}
                      </span>
                      <span className={`text-sm font-bold ${selected ? "text-white" : "text-slate-400"}`}>
                        {sport.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Visibility</label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                className="h-11 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold focus:border-emerald-500/40 focus:outline-none transition-colors"
              >
                <option value="PRIVATE">Private — Members only</option>
                <option value="PUBLIC">Public — Anyone can view</option>
                <option value="UNLISTED">Unlisted — Accessible via link</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : "Create League"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="h-11 px-6 rounded-xl bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
