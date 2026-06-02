"use client";

import { useState } from "react";

interface Props {
  leagueId: string;
  size?: "sm" | "lg";
}

export function UpgradeButton({ leagueId, size = "lg" }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  if (size === "sm") {
    return (
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="flex-shrink-0 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all disabled:opacity-50"
      >
        {loading ? "..." : "Subscribe — $36/yr"}
      </button>
    );
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-50"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Redirecting...
        </>
      ) : (
        "Subscribe — $36 / year"
      )}
    </button>
  );
}
