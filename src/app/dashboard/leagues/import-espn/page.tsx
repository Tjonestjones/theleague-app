"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ImportESPNPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
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

      // Redirect to league page after 2 seconds
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
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={leagueId ? `/dashboard/leagues/${leagueId}` : "/dashboard"}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {leagueId ? "Back to League" : "Back to Dashboard"}
        </Link>
        <h1 className="text-3xl font-bold">Import ESPN League</h1>
        <p className="mt-2 text-gray-500">
          Connect your ESPN Fantasy Football league to TheLeague
        </p>
        {!leagueId && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
            ⚠️ No league selected. <Link href="/dashboard/leagues/create" className="underline font-medium">Create a league first</Link>, then import from the league page.
          </div>
        )}
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-lg border bg-white p-6">
        <div className="space-y-2">
          <Label htmlFor="league_id">ESPN League ID *</Label>
          <Input
            id="league_id"
            type="text"
            value={formData.league_id}
            onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
            placeholder="Enter your ESPN league ID"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500">
            Found in your league URL: fantasy.espn.com/football/league?leagueId=<strong>YOUR_ID</strong>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Season Year *</Label>
          <select
            id="year"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isLoading}
          >
            {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Private League Cookies (optional) */}
        <details className="rounded-md border p-4">
          <summary className="cursor-pointer font-medium">🔒 Private league? Add ESPN cookies (optional)</summary>
          <p className="mt-2 mb-4 text-sm text-gray-500">
            Only needed if your league is set to private. Public leagues can import with just the League ID.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="espn_s2">espn_s2 Cookie</Label>
              <Input
                id="espn_s2"
                type="password"
                value={formData.espn_s2}
                onChange={(e) => setFormData({ ...formData, espn_s2: e.target.value })}
                placeholder="Paste your espn_s2 cookie here"
                className="font-mono"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="swid">SWID Cookie</Label>
              <Input
                id="swid"
                type="password"
                value={formData.swid}
                onChange={(e) => setFormData({ ...formData, swid: e.target.value })}
                placeholder="Paste your SWID cookie here"
                className="font-mono"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                🔑 Quick Guide: Get Your ESPN Cookies
              </p>
              <div className="space-y-2 text-sm text-blue-800">
                <p>1. Open <strong>fantasy.espn.com</strong> in a new private/incognito window</p>
                <p>2. Log in and open your league page</p>
                <p>3. Press <kbd className="px-2 py-1 bg-white border rounded font-mono text-xs">F12</kbd> (or <kbd className="px-2 py-1 bg-white border rounded font-mono text-xs">⌘⌥I</kbd> on Mac) to open DevTools</p>
                <p>4. Click <strong>Application</strong> tab → <strong>Cookies</strong> → <strong>fantasy.espn.com</strong></p>
                <p>5. Find and copy <code className="px-1.5 py-0.5 bg-white border rounded font-mono">espn_s2</code> and <code className="px-1.5 py-0.5 bg-white border rounded font-mono">SWID</code></p>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <a 
                  href="https://www.youtube.com/results?search_query=how+to+get+espn+fantasy+cookies" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  📺 Watch video tutorial on YouTube →
                </a>
              </div>
            </div>
          </div>
        </details>

        {/* Status Message */}
        {message && (
          <div className={`rounded-md border p-4 ${
            status === "error" ? "border-red-200 bg-red-50 text-red-800" :
            status === "success" ? "border-green-200 bg-green-50 text-green-800" :
            "border-blue-200 bg-blue-50 text-blue-800"
          }`}>
            {message}
          </div>
        )}

        {/* League Info Preview */}
        {leagueInfo && status === "success" && (
          <div className="rounded-md border bg-gray-50 p-4">
            <h3 className="font-semibold">League Info:</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><strong>Name:</strong> {String(leagueInfo.name)}</li>
              <li><strong>Year:</strong> {String(leagueInfo.year)}</li>
              <li><strong>Teams:</strong> {String(leagueInfo.size)}</li>
              <li><strong>Current Week:</strong> {String(leagueInfo.current_week)}</li>
            </ul>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleValidate}
            disabled={isLoading || !formData.league_id}
            variant="outline"
            className="flex-1"
          >
            {status === "validating" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Validate Connection
          </Button>

          {leagueInfo && (
            <Button
              onClick={handleImport}
              disabled={isLoading || !leagueId}
              className="flex-1"
            >
              {status === "importing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import League Data
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
