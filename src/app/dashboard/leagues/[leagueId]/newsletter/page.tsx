"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SeasonOption {
  id: string;
  year: number;
  weekCount: number;
}

export default function NewsletterPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [loading, setLoading] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [newsletter, setNewsletter] = useState("");
  const [html, setHtml] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "markdown" | "html">("preview");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.league?.seasons) {
          const s = data.league.seasons.map((season: { id: string; year: number; _count: { weeks: number } }) => ({
            id: season.id,
            year: season.year,
            weekCount: season._count.weeks,
          }));
          setSeasons(s);
          if (s.length > 0) setSelectedSeason(s[0].id);
        }
      })
      .finally(() => setLoadingSeasons(false));
  }, [leagueId]);

  const selectedSeasonData = seasons.find((s) => s.id === selectedSeason);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setNewsletter("");
    setHtml("");

    try {
      const res = await fetch(`/api/leagues/${leagueId}/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId: selectedSeason, weekNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setNewsletter(data.newsletter);
      setHtml(data.html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyContent = async () => {
    const content = viewMode === "html" ? html : newsletter;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingSeasons) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">📰</div>
          <p className="text-xl text-slate-400 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-10">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-indigo-700/10 to-purple-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-purple-500/30 rounded-3xl p-10 shadow-2xl">
          <Link href={`/dashboard/leagues/${leagueId}`} className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-bold mb-4 transition-colors">
            <span className="text-2xl">←</span>
            <span>Back to League</span>
          </Link>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight">📰 Newsletter</h1>
          <p className="text-2xl text-slate-400 font-semibold mt-3">Generate weekly recaps to share with your league.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-6">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Season</label>
            <select
              className="h-12 w-44 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-purple-500/50 focus:outline-none transition-colors"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.year} ({s.weekCount} weeks)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Week</label>
            <select
              className="h-12 w-28 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-purple-500/50 focus:outline-none transition-colors"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
            >
              {Array.from({ length: selectedSeasonData?.weekCount ?? 17 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedSeason}
            className="h-12 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-black shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span> Generating...
              </span>
            ) : (
              "Generate Recap 🚀"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border-2 border-red-500/30 rounded-2xl text-red-400 font-bold">{error}</div>
      )}

      {/* Newsletter Output */}
      {(newsletter || html) && (
        <div className="space-y-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
              {(["preview", "markdown", "html"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-5 py-2.5 text-sm rounded-lg font-black transition-all ${
                    viewMode === mode
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={copyContent}
              className="px-6 py-2.5 bg-slate-700/50 border-2 border-slate-600/30 text-slate-300 rounded-xl hover:bg-slate-600/50 hover:border-slate-500/50 font-bold transition-all"
            >
              {copied ? "✓ Copied!" : `Copy ${viewMode === "html" ? "HTML" : "Markdown"}`}
            </button>
          </div>

          {/* Content */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-purple-500/20 shadow-2xl">
            {viewMode === "preview" ? (
              <div
                className="p-8 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="p-6 text-slate-300 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                {viewMode === "markdown" ? newsletter : html}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!newsletter && !error && !loading && (
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-purple-500/30 rounded-3xl p-16 text-center shadow-2xl">
          <div className="text-9xl mb-6">📰</div>
          <h3 className="text-4xl font-black mb-4 text-white">Ready to Generate</h3>
          <p className="text-xl text-slate-400 font-semibold max-w-2xl mx-auto">
            Select a season and week above, then hit generate. You&apos;ll get a formatted newsletter to share via email, group chat, or social media.
          </p>
        </div>
      )}
    </div>
  );
}
