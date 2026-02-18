"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ImportSleeperPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ImportSleeperContent />
    </Suspense>
  );
}

function ImportSleeperContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leagueId = searchParams.get("leagueId");

  const [sleeperLeagueId, setSleeperLeagueId] = useState("");
  const [status, setStatus] = useState<"idle" | "validating" | "importing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [leagueInfo, setLeagueInfo] = useState<Record<string, unknown> | null>(null);

  const handleValidate = async () => {
    setStatus("validating");
    setMessage("");

    try {
      const res = await fetch("/api/sleeper/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league_id: sleeperLeagueId }),
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
    if (!leagueId) {
      setStatus("error");
      setMessage("No league selected. Create a league first.");
      return;
    }

    setStatus("importing");
    setMessage("Importing from Sleeper... this may take a minute.");

    try {
      const res = await fetch("/api/sleeper/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league_id: sleeperLeagueId, leagueId }),
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
        <h1 className="text-3xl font-bold">Import from Sleeper 😴</h1>
        <p className="mt-2 text-gray-500">
          No authentication needed — Sleeper&apos;s API is public for league data.
        </p>
      </div>

      <div className="space-y-6 rounded-lg border bg-white p-6">
        <div className="space-y-2">
          <Label htmlFor="league_id">Sleeper League ID *</Label>
          <Input
            id="league_id"
            value={sleeperLeagueId}
            onChange={(e) => setSleeperLeagueId(e.target.value)}
            placeholder="e.g. 1048625438492180480"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500">
            Found in your Sleeper league URL or league settings.
          </p>
        </div>

        {!leagueId && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
            ⚠️ No league selected. <Link href="/dashboard/leagues/create" className="underline font-medium">Create a league first</Link>.
          </div>
        )}

        {message && (
          <div className={`rounded-md border p-4 ${
            status === "error" ? "border-red-200 bg-red-50 text-red-800" :
            status === "success" ? "border-green-200 bg-green-50 text-green-800" :
            "border-blue-200 bg-blue-50 text-blue-800"
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
              <li><strong>Members:</strong> {String(leagueInfo.members)}</li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleValidate}
            disabled={isLoading || !sleeperLeagueId}
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
