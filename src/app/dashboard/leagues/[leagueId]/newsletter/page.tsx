"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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

  if (loadingSeasons) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/leagues/${leagueId}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to League
        </Link>
        <h1 className="text-3xl font-bold mt-1">📰 Newsletter Generator</h1>
        <p className="text-gray-500 mt-1">Generate weekly recaps to share with your league.</p>
      </div>

      {/* Controls */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <Label>Season</Label>
            <select
              className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.year} ({s.weekCount} weeks)</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Week</Label>
            <select
              className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
            >
              {Array.from({ length: selectedSeasonData?.weekCount ?? 17 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !selectedSeason}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Recap
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">{error}</div>
      )}

      {/* Newsletter Output */}
      {(newsletter || html) && (
        <div className="space-y-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(["preview", "markdown", "html"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={copyContent}>
              {copied ? "Copied!" : `Copy ${viewMode === "html" ? "HTML" : "Markdown"}`}
            </Button>
          </div>

          {/* Content */}
          <div className="border rounded-lg overflow-hidden">
            {viewMode === "preview" ? (
              <div
                className="p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : viewMode === "markdown" ? (
              <pre className="p-4 bg-gray-900 text-gray-100 text-sm overflow-x-auto whitespace-pre-wrap">
                {newsletter}
              </pre>
            ) : (
              <pre className="p-4 bg-gray-900 text-gray-100 text-sm overflow-x-auto whitespace-pre-wrap">
                {html}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      {!newsletter && !error && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-500">
          <p className="text-lg mb-2">Select a season and week, then generate a recap</p>
          <p className="text-sm">You&apos;ll get a formatted newsletter you can copy and share via email, group chat, or social media.</p>
        </div>
      )}
    </div>
  );
}
