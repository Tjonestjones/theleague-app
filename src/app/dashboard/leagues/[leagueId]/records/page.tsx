import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRecordBook } from "@/lib/records";
import Link from "next/link";

export default async function RecordBookPage({
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

  if (!league) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">League not found</div>;

  const records = await getRecordBook(leagueId);

  // Group by category
  const categories: Map<string, typeof records> = new Map();
  for (const r of records) {
    if (!categories.has(r.category)) categories.set(r.category, []);
    categories.get(r.category)!.push(r);
  }

  const categoryConfig: Record<string, { icon: string; color: string; border: string; bg: string }> = {
    Scoring: { icon: "🎯", color: "text-emerald-400", border: "border-emerald-500/20 hover:border-emerald-500/50", bg: "from-emerald-900/30 to-green-900/30" },
    Matchups: { icon: "⚔️", color: "text-red-400", border: "border-red-500/20 hover:border-red-500/50", bg: "from-red-900/30 to-orange-900/30" },
    Season: { icon: "📅", color: "text-blue-400", border: "border-blue-500/20 hover:border-blue-500/50", bg: "from-blue-900/30 to-indigo-900/30" },
    Streaks: { icon: "🔥", color: "text-orange-400", border: "border-orange-500/20 hover:border-orange-500/50", bg: "from-orange-900/30 to-red-900/30" },
    "All-Time": { icon: "🏆", color: "text-yellow-400", border: "border-yellow-500/20 hover:border-yellow-500/50", bg: "from-yellow-900/30 to-amber-900/30" },
    "Top Scores": { icon: "📈", color: "text-green-400", border: "border-green-500/20 hover:border-green-500/50", bg: "from-green-900/30 to-emerald-900/30" },
    "Bottom Scores": { icon: "📉", color: "text-purple-400", border: "border-purple-500/20 hover:border-purple-500/50", bg: "from-purple-900/30 to-pink-900/30" },
    Luck: { icon: "🍀", color: "text-cyan-400", border: "border-cyan-500/20 hover:border-cyan-500/50", bg: "from-cyan-900/30 to-blue-900/30" },
  };

  const defaultConfig = { icon: "📊", color: "text-emerald-400", border: "border-emerald-500/20 hover:border-emerald-500/50", bg: "from-slate-800/90 to-slate-900/90" };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-12">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 via-amber-700/10 to-yellow-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-yellow-500/30 rounded-3xl p-10 shadow-2xl">
          <Link href={`/dashboard/leagues/${leagueId}`} className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-bold mb-4 transition-colors">
            <span className="text-2xl">←</span>
            <span>Back to {league.name}</span>
          </Link>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">🏆 Record Book</h1>
          <p className="text-2xl text-slate-400 font-semibold">
            <span className="text-yellow-400 font-black">{records.length}</span> records across{" "}
            <span className="text-yellow-400 font-black">{categories.size}</span> categories
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-yellow-500/30 rounded-3xl p-16 text-center shadow-2xl">
          <div className="text-9xl mb-6">📊</div>
          <h3 className="text-4xl font-black mb-4 text-white">No Records Yet</h3>
          <p className="text-xl text-slate-400 font-semibold">Import some seasons and the record book will populate automatically.</p>
        </div>
      ) : (
        Array.from(categories.entries()).map(([category, recs]) => {
          const config = categoryConfig[category] ?? defaultConfig;
          return (
            <div key={category} className="space-y-6">
              {/* Category Header */}
              <div className="flex items-center gap-4">
                <span className="text-4xl">{config.icon}</span>
                <h2 className={`text-4xl font-black ${config.color}`}>{category}</h2>
                <span className="px-4 py-1 bg-slate-700/50 border border-slate-600/30 rounded-full text-slate-400 font-bold text-sm">
                  {recs.length} records
                </span>
              </div>
              
              {/* Records Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {recs.map((r, i) => (
                  <div key={i} className={`group relative bg-gradient-to-br ${config.bg} backdrop-blur-xl rounded-2xl p-6 border-2 ${config.border} transition-all duration-500 transform hover:scale-[1.02] shadow-xl`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-black text-lg mb-2 text-white group-hover:text-emerald-400 transition-colors">{r.title}</h3>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">{r.detail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-4xl font-black ${config.color} mb-1`}>{r.value}</p>
                        <span className="inline-block px-3 py-1 bg-slate-700/50 border border-slate-600/30 rounded-full text-white font-bold text-sm">
                          {r.holder}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
