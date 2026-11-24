"use client";

import { useState, useTransition } from "react";
import type { RecapKind } from "@prisma/client";
import { Loader2, Sparkles } from "lucide-react";
import { writeRecapAction } from "@/app/dashboard/leagues/[leagueId]/recap-actions";

export function WriteRecapButton({
  leagueId, kind, year, week, memberId, label,
}: { leagueId: string; kind: RecapKind; year: number; week: number; memberId: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-3">
      {error && <span className="text-red-400">{error}</span>}
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await writeRecapAction(leagueId, kind, year, week, memberId);
            if (!res.ok) setError(res.error ?? "Something went wrong");
          })
        }
        className="btn-secondary disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {pending ? "Writing…" : label}
      </button>
    </span>
  );
}
