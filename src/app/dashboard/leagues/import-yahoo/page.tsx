"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ImportYahooPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leagueId = searchParams.get("leagueId");
  const connected = searchParams.get("connected") === "true";

  const [formData, setFormData] = useState({ league_id: "", year: "2024" });
  const [status, setStatus] = useState<"idle" | "validating" | "importing" | "success" | "error">("idle");
  const [message, setMessage] = useState(connected ? "✓ Yahoo account connected!" : "");
  const [leagueInfo, setLeagueInfo] = useState<Record<string, unknown> | null>(null);

  const handleConnect = () => {
    // Redirect to Yahoo OAuth
    window.location.href = "/api/yahoo/auth";
  };

  const handleValidate = async () => {
    setStatus("validating");
    setMessage("");

    try {
      const res = await fetch("/api/yahoo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setMessage("Yahoo session expired. Please reconnect.");
          setStatus("error");
          return;
        }
        throw new Error(data.error || "Validation failed");
      }

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
    if (!leagueId) {
      setStatus("error");
      setMessage("No league selected. Create a league first.");
      return;
    }

    setStatus("importing");
    setMessage("Importing from Yahoo... this may take a couple minutes.");

    try {
      const res = await fetch("/api/yahoo/import", {
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
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link
          href={leagueId ? `/dashboard/leagues/${leagueId}` : "/dashboard"}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold">Import from Yahoo 🟣</h1>
        <p className="mt-2 text-gray-500">
          Yahoo requires OAuth authentication. Connect your account first.
        </p>
      </div>

      <div className="space-y-6 rounded-lg border bg-white p-6">
        {/* Step 1: Connect Yahoo */}
        <div className="space-y-3">
          <h3 className="font-semibold">Step 1: Connect Yahoo Account</h3>
          <Button onClick={handleConnect} variant={connected ? "outline" : "default"}>
            {connected ? "✓ Connected — Reconnect" : "Connect Yahoo Account"}
          </Button>
          {!process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID && !connected && (
            <p className="text-xs text-gray-500">
              Requires YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in .env.local.
              Register at <a href="https://developer.yahoo.com/apps/" className="underline" target="_blank">developer.yahoo.com</a>.
            </p>
          )}
        </div>

        {/* Step 2: League details */}
        <div className="space-y-2">
          <h3 className="font-semibold">Step 2: Enter League Details</h3>
          <Label htmlFor="league_id">Yahoo League ID *</Label>
          <Input
            id="league_id"
            value={formData.league_id}
            onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
            placeholder="e.g. 123456"
            disabled={isLoading || !connected}
          />
          <p className="text-xs text-gray-500">
            Found in your Yahoo Fantasy league URL: football.fantasysports.yahoo.com/f1/<strong>YOUR_ID</strong>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Season Year</Label>
          <select
            id="year"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            disabled={isLoading || !connected}
          >
            {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {!leagueId && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
            ⚠️ No league selected. <Link href="/dashboard/leagues/create" className="underline font-medium">Create a league first</Link>.
          </div>
        )}

        {message && (
          <div className={`rounded-md border p-4 ${
            status === "error" ? "border-red-200 bg-red-50 text-red-800" :
            "border-green-200 bg-green-50 text-green-800"
          }`}>
            {message}
          </div>
        )}

        {leagueInfo && status === "success" && (
          <div className="rounded-md border bg-gray-50 p-4">
            <h3 className="font-semibold">League Info:</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><strong>Name:</strong> {String(leagueInfo.name)}</li>
              <li><strong>Season:</strong> {String(leagueInfo.season)}</li>
              <li><strong>Teams:</strong> {String(leagueInfo.size)}</li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleValidate}
            disabled={isLoading || !formData.league_id || !connected}
            variant="outline"
            className="flex-1"
          >
            {status === "validating" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Validate
          </Button>

          {leagueInfo && (
            <Button
              onClick={handleImport}
              disabled={isLoading || !leagueId}
              className="flex-1"
            >
              {status === "importing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
