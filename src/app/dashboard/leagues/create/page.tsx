"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  const sports = [
    { value: "NFL", label: "🏈 NFL Fantasy Football", icon: "🏈" },
    { value: "NBA", label: "🏀 NBA Fantasy Basketball", icon: "🏀" },
    { value: "MLB", label: "⚾ MLB Fantasy Baseball", icon: "⚾" },
    { value: "NHL", label: "🏒 NHL Fantasy Hockey", icon: "🏒" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-700/10 to-emerald-900/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/30 rounded-3xl p-10 shadow-2xl">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold mb-4 transition-colors">
              <span className="text-2xl">←</span>
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">Create a League</h1>
            <p className="text-2xl text-slate-400 font-semibold">
              Set up your fantasy football league and start importing your history.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/20 rounded-3xl p-10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-500/20 border-2 border-red-500/30 rounded-2xl text-red-400 font-bold">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider">League Name *</label>
              <input
                placeholder="e.g. Sunday Night Legends"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider">Description</label>
              <input
                placeholder="A brief description of your league"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider">Sport</label>
              <div className="grid grid-cols-2 gap-3">
                {sports.map((sport) => (
                  <button
                    key={sport.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, sport: sport.value })}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                      formData.sport === sport.value
                        ? "border-emerald-500/50 bg-emerald-500/20 shadow-lg shadow-emerald-500/10"
                        : "border-slate-600/50 bg-slate-800/50 hover:border-slate-500/50"
                    }`}
                  >
                    <span className="text-3xl block mb-2">{sport.icon}</span>
                    <span className={`font-bold ${formData.sport === sport.value ? "text-emerald-400" : "text-slate-300"}`}>
                      {sport.label.replace(/^[^ ]+ /, "")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black text-emerald-400 uppercase tracking-wider">Visibility</label>
              <select
                className="h-14 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-5 text-white text-lg font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              >
                <option value="PRIVATE">🔒 Private – Members only</option>
                <option value="PUBLIC">🌐 Public – Anyone can view</option>
                <option value="UNLISTED">🔗 Unlisted – Accessible via link</option>
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex-1 h-14 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-black text-lg shadow-2xl hover:shadow-emerald-500/50 transition-all transform hover:scale-105 disabled:opacity-50 overflow-hidden"
              >
                <span className="relative z-10">{loading ? "Creating..." : "Create League 🏈"}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
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
