import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { AnalyticsCharts } from "./analytics-charts";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true },
  });

  if (!league) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">
        League not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-24 right-0 w-72 h-72 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← {league.name}
          </Link>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">Analytics</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Lineup efficiency, max potential, and bench analysis
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/leagues/${leagueId}/history`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/25 font-bold text-sm transition-all"
              >
                History
              </Link>
              <Link
                href={`/dashboard/leagues/${leagueId}/records`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-yellow-400 hover:border-yellow-500/25 font-bold text-sm transition-all"
              >
                Records
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 space-y-10">

        {/* ── CONCEPT EXPLAINER ───────────────────────────────────────── */}
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-sm text-cyan-400 mb-2 uppercase tracking-wider">
                What is Lineup Efficiency?
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Every week your team has a <span className="text-white font-bold">max potential score</span> — what you
                would have scored with the perfect lineup. Efficiency measures how close you get. A manager at{" "}
                <span className="text-cyan-400 font-bold">95%</span> barely leaves points on the bench, while{" "}
                <span className="text-red-400 font-bold">75%</span> means a lot of wasted potential. Inspired by{" "}
                <a
                  href="https://github.com/amjohnson36/FantasyGraphs"
                  target="_blank"
                  className="text-cyan-400 underline hover:text-cyan-300 transition-colors"
                >
                  FantasyGraphs
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* ── CHARTS ──────────────────────────────────────────────────── */}
        <AnalyticsCharts leagueId={leagueId} />
      </div>
    </div>
  );
}
