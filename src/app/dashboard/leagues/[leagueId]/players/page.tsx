import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getPlayerDirectory, type DirectoryPlayer } from "@/lib/activity";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, FilterChip, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;
type Search = Promise<{ q?: string; pos?: string; sort?: string; page?: string }>;

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "D/ST"];
const SORTS: Record<string, { label: string; fn: (a: DirectoryPlayer, b: DirectoryPlayer) => number }> = {
  points: { label: "Starter points", fn: (a, b) => b.startedPts - a.startedPts },
  starts: { label: "Starts", fn: (a, b) => b.starts - a.starts },
  managers: { label: "Managers", fn: (a, b) => b.managers - a.managers || b.weeksRostered - a.weeksRostered },
  drafted: { label: "Times drafted", fn: (a, b) => b.timesDrafted - a.timesDrafted },
  name: { label: "Name", fn: (a, b) => a.name.localeCompare(b.name) },
};
const PER_PAGE = 50;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Players — TheLeague` : "Players — TheLeague" };
}

export default async function PlayersPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;
  const sp = await searchParams;

  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const all = await getPlayerDirectory(leagueId, era.scope);
  const q = (sp.q ?? "").trim().toLowerCase();
  const pos = POSITIONS.includes(sp.pos ?? "") ? sp.pos : undefined;
  const sortKey = sp.sort && SORTS[sp.sort] ? sp.sort : "points";
  const filtered = all
    .filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!pos || p.position === pos))
    .sort(SORTS[sortKey].fn);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const base = `/dashboard/leagues/${leagueId}`;
  const href = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { q: sp.q, pos, sort: sortKey === "points" ? undefined : sortKey, ...o };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    const s = p.toString();
    return `${base}/players${s ? `?${s}` : ""}`;
  };

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={era.isAll ? "All seasons" : era.label}
          title="Players"
          description={`Every player who has been on a roster in this league: ${all.length} so far.`}
        />

        <div className="px-6 md:px-10 py-6 space-y-5 max-w-7xl">
          <form action={`${base}/players`} className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Search players"
                className="w-64 bg-slate-900 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            {pos && <input type="hidden" name="pos" value={pos} />}
            {sortKey !== "points" && <input type="hidden" name="sort" value={sortKey} />}
            <div className="flex flex-wrap gap-1.5">
              <FilterChip href={href({ pos: undefined, page: undefined })} active={!pos}>All</FilterChip>
              {POSITIONS.map((p) => (
                <FilterChip key={p} href={href({ pos: p, page: undefined })} active={pos === p}>{p}</FilterChip>
              ))}
            </div>
          </form>

          {rows.length === 0 ? (
            <Empty>No players match.</Empty>
          ) : (
            <div className="overflow-x-auto border border-white/8 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold w-10">#</th>
                    <SortTh label="Player" k="name" current={sortKey} href={href} align="left" />
                    <th className="px-4 py-2.5 text-left font-semibold">Last rostered by</th>
                    <SortTh label="Starter pts" k="points" current={sortKey} href={href} />
                    <SortTh label="Starts" k="starts" current={sortKey} href={href} />
                    <th className="px-4 py-2.5 text-right font-semibold">Weeks</th>
                    <SortTh label="Managers" k="managers" current={sortKey} href={href} />
                    <SortTh label="Drafted" k="drafted" current={sortKey} href={href} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((p, i) => (
                    <tr key={p.playerId} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2 text-slate-600 tabular-nums">{(page - 1) * PER_PAGE + i + 1}</td>
                      <td className="px-4 py-2">
                        <Link href={`${base}/players/${p.playerId}`} className="text-white hover:text-emerald-400">{p.name}</Link>
                        <span className="ml-2 text-xs text-slate-500">{p.position}{p.nflTeam ? ` · ${p.nflTeam}` : ""}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-400">{p.lastManager ? `${p.lastManager} · ${p.lastYear}` : "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.startedPts.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-300">{p.starts}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-400">{p.weeksRostered}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-300">{p.managers}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-400">{p.timesDrafted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="tabular-nums">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                {page > 1 && <Link href={href({ page: String(page - 1) })} className="btn-secondary">← Previous</Link>}
                {page < pages && <Link href={href({ page: String(page + 1) })} className="btn-secondary">Next →</Link>}
              </div>
            </div>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}

function SortTh({
  label,
  k,
  current,
  href,
  align = "right",
}: {
  label: string;
  k: string;
  current: string;
  href: (o: Record<string, string | undefined>) => string;
  align?: "left" | "right";
}) {
  return (
    <th className={`px-4 py-2.5 font-semibold ${align === "left" ? "text-left" : "text-right"}`}>
      <Link href={href({ sort: k === "points" ? undefined : k, page: undefined })} className={current === k ? "text-white" : "hover:text-slate-300"}>
        {label}{current === k ? " ↓" : ""}
      </Link>
    </th>
  );
}
