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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-blue-700/10 to-cyan-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-cyan-500/30 rounded-3xl p-10 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <Link
                href={`/dashboard/leagues/${leagueId}`}
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-bold mb-4 transition-colors"
              >
                <span className="text-2xl">←</span>
                <span>Back to {league.name}</span>
              </Link>
              <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">
                📊 Analytics
              </h1>
              <p className="text-2xl text-slate-400 font-semibold">
                Lineup efficiency, max potential points, and bench analysis
              </p>
            </div>
            <div className="flex gap-3">
              <Link href={`/dashboard/leagues/${leagueId}/history`}>
                <button className="px-6 py-3 bg-emerald-500/20 border-2 border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/30 hover:border-emerald-500/50 font-bold transition-all">
                  📊 History
                </button>
              </Link>
              <Link href={`/dashboard/leagues/${leagueId}/records`}>
                <button className="px-6 py-3 bg-yellow-500/20 border-2 border-yellow-500/30 text-yellow-400 rounded-xl hover:bg-yellow-500/30 hover:border-yellow-500/50 font-bold transition-all">
                  🏆 Records
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Concept Explainer */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 backdrop-blur-xl border-2 border-cyan-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">💡</span>
          <div>
            <h3 className="font-black text-lg text-cyan-400 mb-2">What is Lineup Efficiency?</h3>
            <p className="text-slate-400 font-medium leading-relaxed">
              Every week, your team has a <span className="text-white font-bold">max potential score</span> — the points you would have scored with the perfect lineup.
              Efficiency measures how close you get to that maximum.
              A manager with <span className="text-cyan-400 font-bold">95% efficiency</span> barely leaves points on the bench,
              while <span className="text-red-400 font-bold">75%</span> means a lot of wasted potential.
              Inspired by <a href="https://github.com/amjohnson36/FantasyGraphs" target="_blank" className="text-cyan-400 underline hover:text-cyan-300 transition-colors">FantasyGraphs</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <AnalyticsCharts leagueId={leagueId} />
    </div>
  );
}
