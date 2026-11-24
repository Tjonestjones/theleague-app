import type { Recap, RecapKind } from "@prisma/client";
import { Markdown } from "@/components/markdown";
import { WriteRecapButton } from "@/components/write-recap-button";

/**
 * Shows a stored recap, or a template preview built from live facts with a
 * button to write and save it.
 */
export function RecapPanel({
  recap,
  preview,
  canWrite,
  aiEnabled,
  target,
}: {
  recap: Recap | null;
  preview: string | null;
  canWrite: boolean;
  aiEnabled: boolean;
  target: { leagueId: string; kind: RecapKind; year: number; week: number; memberId: string };
}) {
  const text = recap?.body ?? preview;
  const byAi = recap && recap.writer !== "template";
  return (
    <div className="border border-white/8 rounded-lg bg-slate-950">
      <div className="px-6 py-5">
        {text ? <Markdown text={text} /> : <p className="text-sm text-slate-500">Not enough data for this recap yet.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-white/5 text-xs text-slate-500">
        <span>
          {recap
            ? `${byAi ? "Written by AI" : "Auto-generated summary"} · saved ${recap.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : "Auto-generated preview, not saved yet"}
          {!aiEnabled && " · add an AI key to get written recaps"}
        </span>
        {canWrite && text && (
          <WriteRecapButton {...target} label={recap ? (aiEnabled ? "Rewrite" : "Refresh") : aiEnabled ? "Write with AI" : "Save summary"} />
        )}
      </div>
    </div>
  );
}
