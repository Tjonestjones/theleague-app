import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { getRivalryGrid, type GridCell } from "@/lib/rivalries";
import { SubscriptionGate } from "@/components/subscription-gate";
import { PageHeader, Section, Empty } from "@/components/page-chrome";

type Params = Promise<{ leagueId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Rivalries — TheLeague` : "Rivalries — TheLeague" };
}

export default async function RivalriesPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { leagueId } = await params;

  const [league, era] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
    getEra(leagueId),
  ]);
  if (!league) notFound();

  const grid = await getRivalryGrid(leagueId, era.scope);
  const base = `/dashboard/leagues/${leagueId}`;
  const pairHref = (a: string, b: string) => `${base}/rivalries/${a}/${b}`;

  const shade = (c: GridCell | null) => {
    if (!c || !c.games) return "transparent";
    const pct = (c.wins + c.ties * 0.5) / c.games;
    const d = pct - 0.5;
    return d >= 0 ? `rgba(16,185,129,${(d * 1.2).toFixed(3)})` : `rgba(239,68,68,${(-d * 1.2).toFixed(3)})`;
  };

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen text-white">
        <PageHeader
          eyebrow={era.isAll ? "All seasons, regular season and playoffs" : `${era.label}, regular season and playoffs`}
          title="Rivalries"
          description="Every manager's record against every other manager. Read across a row for that manager's record; click a cell for the full series."
        />

        <div className="px-6 md:px-10 py-8 space-y-10 max-w-7xl">
          {grid.members.length === 0 ? (
            <Empty>No games yet.</Empty>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-6">
                <PairList title="Most one-sided" pairs={grid.mostLopsided} href={pairHref} />
                <PairList title="Closest series" pairs={grid.mostEven} href={pairHref} />
                <PairList title="Most played" pairs={grid.mostPlayed} href={pairHref} />
              </div>

              <Section title="Head-to-head grid">
                <div className="overflow-x-auto border border-white/8 rounded-lg">
                  <table className="text-xs tabular-nums">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-slate-950 px-3 py-2" />
                        {grid.members.map((m) => (
                          <th key={m.id} className="px-1 py-2 font-medium text-slate-400 align-bottom h-28">
                            <div className="w-10 mx-auto [writing-mode:vertical-rl] rotate-180 text-left whitespace-nowrap">{m.name}</div>
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grid.members.map((row) => {
                        let w = 0, l = 0;
                        return (
                          <tr key={row.id} className="border-t border-white/5">
                            <th className="sticky left-0 bg-slate-950 px-3 py-1.5 text-left font-medium text-slate-300 whitespace-nowrap">
                              <Link href={`${base}/members/${row.id}`} className="hover:text-emerald-400">{row.name}</Link>
                            </th>
                            {grid.members.map((col) => {
                              if (col.id === row.id) return <td key={col.id} className="w-12 h-9 bg-white/[0.03]" />;
                              const c = grid.get(row.id, col.id);
                              if (c) { w += c.wins; l += c.losses; }
                              return (
                                <td key={col.id} className="p-0 w-12 h-9 text-center" style={{ backgroundColor: shade(c) }}>
                                  {c && c.games ? (
                                    <Link href={pairHref(row.id, col.id)} className="block py-2 hover:bg-white/10" title={`${row.name} vs ${col.name}: ${c.wins}-${c.losses}${c.ties ? `-${c.ties}` : ""}`}>
                                      {c.wins}-{c.losses}
                                    </Link>
                                  ) : (
                                    <span className="text-slate-700">·</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-1.5 text-right text-slate-300">{w}-{l}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}

function PairList({
  title,
  pairs,
  href,
}: {
  title: string;
  pairs: { a: { id: string; name: string }; b: { id: string; name: string }; c: GridCell }[];
  href: (a: string, b: string) => string;
}) {
  return (
    <Section title={title}>
      <ul className="border border-white/8 rounded-lg divide-y divide-white/5">
        {pairs.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Not enough games yet.</li>}
        {pairs.map((p) => (
          <li key={`${p.a.id}-${p.b.id}`}>
            <Link href={href(p.a.id, p.b.id)} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.02]">
              <span className="truncate">
                {p.a.name} <span className="text-slate-600">vs</span> {p.b.name}
              </span>
              <span className="tabular-nums text-slate-300 whitespace-nowrap">
                {p.c.wins}-{p.c.losses}{p.c.ties ? `-${p.c.ties}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
