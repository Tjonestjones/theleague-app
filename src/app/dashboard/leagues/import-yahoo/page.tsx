"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportYahooPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ImportYahooContent />
    </Suspense>
  );
}

function ImportYahooContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leagueId = searchParams.get("leagueId");
  const connected = searchParams.get("connected") === "true";

  const [formData, setFormData] = useState({ league_id: "", year: "2024" });
  const [status, setStatus] = useState<"idle" | "validating" | "importing" | "success" | "error">("idle");
  const [message, setMessage] = useState(connected ? "Yahoo account connected successfully." : "");
  const [leagueInfo, setLeagueInfo] = useState<Record<string, unknown> | null>(null);

  const handleConnect = () => {
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
          setMessage("Yahoo session expired. Please reconnect your account.");
          setStatus("error");
          return;
        }
        throw new Error(data.error || "Validation failed");
      }
      setLeagueInfo(data);
      setStatus("success");
      setMessage(`Found "${data.name}" — ${data.size} teams, ${data.season} season`);
    } catch (error: unknown) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error");
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
    setMessage("Importing from Yahoo — this may take a couple minutes...");
    try {
      const res = await fetch("/api/yahoo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setStatus("success");
      setMessage(data.message);
      setTimeout(() => router.push(`/dashboard/leagues/${leagueId}`), 2000);
    } catch (error: unknown) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const isLoading = status === "validating" || status === "importing";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 right-0 w-72 h-72 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href={leagueId ? `/dashboard/leagues/${leagueId}` : "/dashboard/leagues/import"}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← {leagueId ? "Back to League" : "Back to Platforms"}
          </Link>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <span className="text-xs font-black text-purple-400 tracking-wider">YAH</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Import Yahoo</h1>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Yahoo requires OAuth. Connect your account before importing.
          </p>

          {!leagueId && (
            <div className="flex items-start gap-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl p-4 mt-5">
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-bold text-yellow-400">
                No league selected.{" "}
                <Link href="/dashboard/leagues/create" className="underline hover:text-yellow-300 transition-colors">
                  Create a league first
                </Link>{" "}
                to link imported data.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FORM ───────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-10 max-w-2xl">
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-8 space-y-7">

          {/* Step 1: Connect */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Step 1 — Connect Account</p>
            <button
              onClick={handleConnect}
              className={`h-11 px-6 rounded-xl font-bold text-sm transition-all ${
                connected
                  ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50"
              }`}
            >
              {connected ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected — Reconnect Yahoo
                </span>
              ) : "Connect Yahoo Account"}
            </button>
            {!connected && (
              <p className="text-xs text-slate-600 font-medium">
                Register your app at{" "}
                <a href="https://developer.yahoo.com/apps/" target="_blank" className="text-purple-400 hover:text-purple-300 transition-colors">
                  developer.yahoo.com
                </a>{" "}
                if you haven&apos;t already.
              </p>
            )}
          </div>

          <div className="border-t border-white/5" />

          {/* Step 2: League details */}
          <div className="space-y-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Step 2 — Enter League Details</p>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
                Yahoo League ID <span className="text-purple-500">*</span>
              </label>
              <input
                value={formData.league_id}
                onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
                placeholder="e.g. 123456"
                disabled={isLoading || !connected}
                className="h-11 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold placeholder-slate-600 focus:border-purple-500/40 focus:outline-none transition-colors disabled:opacity-50"
              />
              <p className="text-xs text-slate-600 font-medium">
                From your URL:{" "}
                <span className="text-slate-500">football.fantasysports.yahoo.com/f1/</span>
                <span className="text-purple-400 font-bold">YOUR_ID</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Season Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                disabled={isLoading || !connected}
                className="h-11 w-full rounded-xl bg-slate-800/50 border border-white/10 px-4 text-white text-sm font-bold focus:border-purple-500/40 focus:outline-none transition-colors disabled:opacity-50"
              >
                {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Message */}
          {message && <StatusMessage status={connected && status === "idle" ? "success" : status} message={message} />}

          {/* League Preview */}
          {leagueInfo && status === "success" && (
            <LeaguePreview
              items={[
                { label: "Name", value: String(leagueInfo.name) },
                { label: "Season", value: String(leagueInfo.season) },
                { label: "Teams", value: String(leagueInfo.size) },
              ]}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleValidate}
              disabled={isLoading || !formData.league_id || !connected}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 font-bold text-sm transition-all disabled:opacity-40"
            >
              {status === "validating" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Validating...
                </>
              ) : "Validate Connection"}
            </button>

            {leagueInfo && (
              <button
                onClick={handleImport}
                disabled={isLoading || !leagueId}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-40"
              >
                {status === "importing" ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : "Import League Data"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function StatusMessage({ status, message }: { status: string; message: string }) {
  const styles =
    status === "error"
      ? "bg-red-500/8 border-red-500/20 text-red-400"
      : status === "success"
      ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
      : "bg-blue-500/8 border-blue-500/20 text-blue-400";

  const Icon =
    status === "error" ? (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ) : status === "success" ? (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
    );

  return (
    <div className={`flex items-start gap-3 border rounded-xl p-4 ${styles}`}>
      {Icon}
      <p className="text-sm font-bold leading-relaxed">{message}</p>
    </div>
  );
}

function LeaguePreview({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-5">
      <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">League Connected</p>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
