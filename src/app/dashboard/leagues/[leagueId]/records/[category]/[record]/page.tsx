import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Info, Lock, Trophy } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLeagueMembership, requireLeagueMember } from "@/lib/auth";
import { findRecord, UNTRACKED_NEEDS } from "@/lib/record-book/catalog";
import { computeRecord } from "@/lib/record-book/engine";
import { loadRecordBookData } from "@/lib/record-book/load";

type Params = Promise<{ leagueId: string; category: string; record: string }>;
type Search = Promise<{ view?: string }>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { leagueId, category, record } = await params;
  if (!(await getLeagueMembership(leagueId))) return { title: "TheLeague" };
  const { view } = await searchParams;
  const found = findRecord(category, record);
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  const label = found
    ? `${found.record.label}${view === "inverse" && found.record.inverseLabel ? ` (${found.record.inverseLabel})` : ""}`
    : "Record Book";
  return { title: `${league ? `${league.name} · ` : ""}${label} — TheLeague` };
}

export default async function RecordPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { leagueId, category, record } = await params;
  await requireLeagueMember(leagueId);
  const { view } = await searchParams;
  const found = findRecord(category, record);
  if (!found) notFound();

  const { category: cat, record: def } = found;
  const inverse = view === "inverse" && !!def.inverseLabel;
  const result = computeRecord(await loadRecordBookData(leagueId), cat.id, def, inverse);
  const href = `/dashboard/leagues/${leagueId}/records/${cat.id}/${def.id}`;
  const untracked = UNTRACKED_NEEDS.has(def.needs);

  return (
    <div>
      {/* Breadcrumb + title */}
      <p className="text-xs font-semibold uppercase tracking-widest text-yellow-500/80 mb-2">{cat.label}</p>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-3">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {def.label}
          {inverse && <span className="text-slate-500"> ({def.inverseLabel})</span>}
        </h2>
        {def.inverseLabel && (
          <div className="inline-flex rounded-md border border-white/10 bg-slate-900/80 p-1 text-sm self-start sm:self-auto" role="group" aria-label="View">
            <Link
              href={href}
              aria-current={!inverse ? "page" : undefined}
              className={`px-3 py-1.5 rounded font-semibold transition-colors ${!inverse ? "bg-yellow-500/15 text-yellow-300" : "text-slate-400 hover:text-white"}`}
            >
              Best
            </Link>
            <Link
              href={`${href}?view=inverse`}
              aria-current={inverse ? "page" : undefined}
              className={`px-3 py-1.5 rounded font-semibold transition-colors ${inverse ? "bg-yellow-500/15 text-yellow-300" : "text-slate-400 hover:text-white"}`}
            >
              {def.inverseLabel}
            </Link>
          </div>
        )}
      </div>
      <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mb-8">{def.description}</p>

      {result.status === "empty" ? (
        <div className="rounded-md border border-dashed border-white/10 bg-slate-900/40 px-6 py-14 text-center">
          {untracked ? (
            <Lock className="w-8 h-8 text-slate-600 mx-auto mb-4" />
          ) : (
            <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-semibold text-white mb-2">{untracked ? "Coming soon" : "No record yet"}</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">{result.reason}</p>
        </div>
      ) : (
        <>
          {/* Record holder */}
          <div className="rounded-md border-2 border-yellow-500/25 bg-yellow-500/[0.06] p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-yellow-500/80 mb-1">Record holder</p>
              <p className="text-2xl md:text-3xl font-semibold truncate">{result.rows[0].holder}</p>
              {result.rows[0].detail && <p className="text-sm text-slate-400 mt-1">{result.rows[0].detail}</p>}
            </div>
            <p className="text-4xl md:text-5xl font-semibold text-yellow-400 tabular-nums">{result.rows[0].value}</p>
          </div>

          {/* Leaderboard */}
          <div className="rounded-md border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-[11px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th scope="col" className="text-left font-semibold px-4 py-3 w-14">#</th>
                  <th scope="col" className="text-left font-semibold px-4 py-3">Manager</th>
                  <th scope="col" className="text-right font-semibold px-4 py-3">{result.valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-t border-white/5 bg-slate-950/40 hover:bg-white/[0.03]">
                    <td className={`px-4 py-3 font-semibold tabular-nums ${row.rank === 1 ? "text-yellow-400" : row.rank === 2 ? "text-slate-300" : row.rank === 3 ? "text-amber-600" : "text-slate-600"}`}>
                      {row.rank}
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      <p className="font-semibold text-white">{row.holder}</p>
                      {row.detail && <p className="text-xs text-slate-500 mt-0.5">{row.detail}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-white whitespace-nowrap">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.note && (
            <p className="flex items-start gap-2 text-xs text-slate-500 mt-4 max-w-2xl leading-relaxed">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {result.note}
            </p>
          )}
        </>
      )}
    </div>
  );
}
