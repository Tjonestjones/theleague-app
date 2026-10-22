import Link from "next/link";
import type { TransactionType } from "@prisma/client";
import { TYPE_LABEL, type MoveRow } from "@/lib/transactions";

const TYPE_STYLE: Record<TransactionType, string> = {
  DRAFT: "bg-slate-500/10 text-slate-300 border-slate-500/25",
  WAIVER: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  ADD: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  DROP: "bg-red-500/10 text-red-400 border-red-500/25",
  TRADE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25",
};

export function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${TYPE_STYLE[type]}`}>
      {TYPE_LABEL[type]}
    </span>
  );
}

type Team = MoveRow["toTeam"];

export function TeamCell({ team, leagueId, empty = "Free agency" }: { team: Team; leagueId: string; empty?: string }) {
  if (!team) return <span className="text-slate-600 text-sm font-bold">{empty}</span>;
  return (
    <div className="min-w-0">
      <Link
        href={`/dashboard/leagues/${leagueId}/members/${team.member.id}`}
        className="block truncate text-sm font-bold text-white hover:text-emerald-400 transition-colors"
      >
        {team.member.displayName}
      </Link>
      <span className="block truncate text-xs font-medium text-slate-500">{team.name}</span>
    </div>
  );
}

export function PlayerLink({ player, leagueId }: { player: MoveRow["player"]; leagueId: string }) {
  return (
    <Link
      href={`/dashboard/leagues/${leagueId}/players/${player.id}`}
      className="font-bold text-white hover:text-emerald-400 transition-colors"
    >
      {player.name}
      <span className="ml-1.5 text-xs font-bold text-slate-500">{player.position}</span>
    </Link>
  );
}

export function weekLabel(week: number | null) {
  if (week === null) return "";
  return week === 0 ? "Pre" : `Wk ${week}`;
}
