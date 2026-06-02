"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function LeagueSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "PRIVATE",
  });

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.league) {
          setFormData({
            name: data.league.name,
            description: data.league.description ?? "",
            visibility: data.league.visibility,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update league");
        return;
      }

      setSuccess("Settings saved.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← Back to League
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">League Settings</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Update your league name, description, and visibility.
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

            {success && (
              <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-bold text-emerald-400">{success}</p>
              </div>
            )}

            {/* League Name */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                League Name <span className="text-emerald-500">*</span>
              </label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold focus:border-emerald-500/40 focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of your league"
                className="h-11 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none transition-colors"
              />
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
              <p className="text-xs text-slate-600 font-medium">
                Public and Unlisted leagues get a shareable public page.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/leagues/${leagueId}`)}
                className="h-11 px-6 rounded-xl bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* ── DANGER ZONE ─────────────────────────────────────────────── */}
        <div className="mt-8 bg-slate-900 border border-red-500/15 rounded-2xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-400 mb-4">Danger Zone</h3>
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-bold text-white">Delete this league</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Permanently removes all seasons, records, and member data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="flex-shrink-0 h-9 px-4 rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 font-bold text-xs transition-all"
              onClick={() => {
                if (window.confirm("Delete this league? This action cannot be undone.")) {
                  fetch(`/api/leagues/${leagueId}`, { method: "DELETE" }).then(() =>
                    router.push("/dashboard")
                  );
                }
              }}
            >
              Delete League
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
