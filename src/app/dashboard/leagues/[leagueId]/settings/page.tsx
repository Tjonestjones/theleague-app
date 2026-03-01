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

      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">⚙️</div>
          <p className="text-xl text-slate-400 font-semibold">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 via-slate-700/10 to-slate-900/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-slate-500/30 rounded-3xl p-10 shadow-2xl">
            <Link href={`/dashboard/leagues/${leagueId}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 font-bold mb-4 transition-colors">
              <span className="text-2xl">←</span>
              <span>Back to League</span>
            </Link>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight">⚙️ Settings</h1>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-slate-500/20 rounded-3xl p-10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-500/20 border-2 border-red-500/30 rounded-2xl text-red-400 font-bold">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-500/20 border-2 border-green-500/30 rounded-2xl text-green-400 font-bold">
                {success}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider">League Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider">Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
                placeholder="A brief description of your league"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider">Visibility</label>
              <select
                className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              >
                <option value="PRIVATE">🔒 Private</option>
                <option value="PUBLIC">🌐 Public</option>
                <option value="UNLISTED">🔗 Unlisted</option>
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-black text-lg shadow-2xl hover:shadow-emerald-500/50 transition-all transform hover:scale-105 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/leagues/${leagueId}`)}
                className="h-14 px-8 bg-slate-700/50 border-2 border-slate-600/30 text-slate-300 rounded-xl font-bold hover:bg-slate-600/50 hover:border-slate-500/50 transition-all"
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
