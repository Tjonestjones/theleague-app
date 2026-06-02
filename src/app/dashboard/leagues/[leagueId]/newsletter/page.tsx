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
          const s = data.league.seasons.map(
            (season: { id: string; year: number; _count: { weeks: number } }) => ({
              id: season.id,
              year: season.year,
              weekCount: season._count.weeks,
            })
          );
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
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 right-0 w-72 h-72 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← Back to League
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Newsletter</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Generate a weekly recap to share with your league.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 space-y-8 max-w-4xl">

        {/* ── CONTROLS ────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">Generate Recap</p>
          <div className="flex flex-wrap gap-4 items-end">

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Season</label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="h-11 w-44 rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold focus:border-purple-500/40 focus:outline-none transition-colors"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.year} ({s.weekCount} weeks)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Week</label>
              <select
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                className="h-11 w-28 rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold focus:border-purple-500/40 focus:outline-none transition-colors"
              >
                {Array.from(
                  { length: selectedSeasonData?.weekCount ?? 17 },
                  (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Week {i + 1}
                    </option>
                  )
                )}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !selectedSeason}
              className="h-11 px-6 flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all shadow-lg shadow-purple-900/50 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Recap"
              )}
            </button>
          </div>
        </div>

        {/* ── ERROR ───────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm font-bold text-red-400">{error}</p>
          </div>
        )}

        {/* ── OUTPUT ──────────────────────────────────────────────────── */}
        {(newsletter || html) && (
          <div className="space-y-4">
            {/* View toggle + copy */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-white/8">
                {(["preview", "markdown", "html"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 text-xs rounded-lg font-black transition-all uppercase tracking-wider ${
                      viewMode === mode
                        ? "bg-purple-600 text-white"
                        : "text-slate-500 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                onClick={copyContent}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-bold text-xs transition-all"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>Copy {viewMode === "html" ? "HTML" : "Markdown"}</>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
              {viewMode === "preview" ? (
                <div
                  className="p-8 prose prose-invert max-w-none prose-headings:font-black prose-a:text-purple-400"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <pre className="p-6 text-slate-300 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {viewMode === "markdown" ? newsletter : html}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
        {!newsletter && !error && !loading && (
          <div className="border-2 border-dashed border-white/8 rounded-2xl p-14 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-sm font-black text-slate-600 uppercase tracking-widest mb-1">Ready to generate</p>
            <p className="text-xs text-slate-600 font-medium">
              Select a season and week above, then hit Generate Recap.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
