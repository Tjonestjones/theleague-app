import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SubscriptionGate } from "@/components/subscription-gate";
import { describeMove, formatMoveDate, getPlayerJourney, type MoveRow } from "@/lib/transactions";
import { TypeBadge, weekLabel } from "../../transactions/move-parts";
import { getPlayerMilestones } from "@/lib/milestones";
import { MilestonesPanel } from "./milestones";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string; playerId: string }>;
}): Promise<Metadata> {
  const { leagueId, playerId } = await params;
  const [league, player] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    prisma.player.findUnique({ where: { id: playerId }, select: { name: true } }),
  ]);
  if (!league || !player) return { title: "Player — TheLeague" };
  return { title: `${player.name} · ${league.name} — TheLeague` };
}

export default async function PlayerJourneyPage({
  params,
}: {
  params: Promise<{ leagueId: string; playerId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId, playerId } = await params;
  const [league, journey] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getPlayerJourney(leagueId, playerId),
  ]);

  if (!league || !journey.player)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">
        Player not found
      </div>
    );

  const { player, moves, stats } = journey;
  const milestones = await getPlayerMilestones(leagueId, playerId, player.position);
  const bySeason = new Map<number, MoveRow[]>();
  for (const m of moves) {
    if (!bySeason.has(m.season.year)) bySeason.set(m.season.year, []);
    bySeason.get(m.season.year)!.push(m);
  }

  const pills = [
    { label: "Seasons", value: stats.seasons },
    { label: "Managers", value: stats.managers },
    { label: "Drafted", value: stats.drafted },
    { label: "Claimed", value: stats.claimed },
    { label: "Picked up", value: stats.added },
    { label: "Dropped", value: stats.dropped },
    { label: "Traded", value: stats.traded },
  ];

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
        <div className="relative overflow-hidden border-b border-white/5">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-emerald-700/12 rounded-full blur-3xl pointer-events-none" />
          <div className="relative px-6 md:px-12 pt-8 pb-8">
            <Link
              href={`/dashboard/leagues/${leagueId}/transactions`}
              className="flex w-fit items-center gap-1.5 text-slate-500 hover:text-emerald-400 font-bold text-sm transition-colors mb-6"
            >
              ← Transactions
            </Link>
            <span className="inline-flex items-center border border-emerald-500/25 bg-emerald-500/10 rounded-full px-3 py-1 text-xs font-black text-emerald-400 uppercase tracking-wider mb-3">
              {player.position}
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{player.name}</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {moves.length} move{moves.length === 1 ? "" : "s"} in {league.name}
            </p>
            <div className="mt-6 grid grid-cols-4 sm:grid-cols-7 gap-2 max-w-3xl">
              {pills.map((p) => (
                <div key={p.label} className="rounded-xl bg-slate-900 border border-white/8 px-2 py-2.5 text-center">
                  <span className="block text-lg font-black text-white tabular-nums">{p.value}</span>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 md:px-12 pt-10">
          <MilestonesPanel data={milestones} leagueName={league.name} />
        </div>

        <div className="px-6 md:px-12 pt-12">
          <h2 className="text-lg font-black uppercase tracking-wider text-white">Transaction history</h2>
        </div>

        <div className="px-6 md:px-12 pt-6 pb-10 space-y-10 max-w-4xl">
          {moves.length === 0 && (
            <div className="border-2 border-dashed border-white/8 rounded-2xl p-12 text-center">
              <p className="text-slate-600 font-bold text-sm">This player hasn&apos;t been on a roster in this league.</p>
            </div>
          )}
          {[...bySeason.entries()].map(([year, ms]) => (
            <section key={year}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">{year}</h2>
              <ol className="relative border-l border-white/10 ml-2 space-y-5">
                {ms.map((m) => (
                  <li key={m.id} className="pl-6 relative">
                    <span className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-slate-600 ring-4 ring-slate-950" />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <TypeBadge type={m.type} />
                      <span className="text-xs font-bold text-slate-500">
                        {m.processedAt ? formatMoveDate(m.processedAt) : ""}
                        {m.processedAt && m.weekNumber !== null ? " · " : ""}
                        {weekLabel(m.weekNumber)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-white">
                      <MoveText move={m} leagueId={leagueId} />
                    </p>
                    {m.note && <p className="text-xs font-medium text-slate-500 mt-0.5">{m.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </SubscriptionGate>
  );
}

// describeMove's sentence, with the manager names linked
function MoveText({ move, leagueId }: { move: MoveRow; leagueId: string }) {
  const text = describeMove(move);
  const names = [move.fromTeam?.member, move.toTeam?.member].filter(Boolean) as { id: string; displayName: string }[];
  if (!names.length) return <>{text}</>;
  const pattern = new RegExp(`(${names.map((n) => n.displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return (
    <>
      {text.split(pattern).map((part, i) => {
        const member = names.find((n) => n.displayName === part);
        return member ? (
          <Link key={i} href={`/dashboard/leagues/${leagueId}/members/${member.id}`} className="text-emerald-400 hover:text-emerald-300 transition-colors">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}
