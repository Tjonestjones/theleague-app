import { prisma } from "@/lib/db";
import { getRecordBook } from "@/lib/records";
import Link from "next/link";
import { RECORD_CATEGORIES, categoryPageCount } from "@/lib/record-book/catalog";
import type { Metadata } from "next";
import { Target, Swords, CalendarDays, Flame, Trophy, TrendingUp, TrendingDown, Clover, BarChart3, type LucideIcon } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Record Book — TheLeague` : "Record Book — TheLeague" };
}

export default async function RecordBookPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const records = await getRecordBook(leagueId);

  // Group by category, preserving insertion order
  const categories = new Map<string, typeof records>();
  for (const r of records) {
    if (!categories.has(r.category)) categories.set(r.category, []);
    categories.get(r.category)!.push(r);
  }

  const CATEGORY_META: Record<
    string,
    { icon: LucideIcon; accent: string; accentBg: string; accentBorder: string }
  > = {
    Scoring:        { icon: Target, accent: "text-emerald-400", accentBg: "bg-emerald-500/10",  accentBorder: "border-emerald-500/25" },
    Matchups:       { icon: Swords, accent: "text-red-400",     accentBg: "bg-red-500/10",      accentBorder: "border-red-500/25" },
    Season:         { icon: CalendarDays, accent: "text-blue-400",    accentBg: "bg-blue-500/10",     accentBorder: "border-blue-500/25" },
    Streaks:        { icon: Flame, accent: "text-orange-400",  accentBg: "bg-orange-500/10",   accentBorder: "border-orange-500/25" },
    "All-Time":     { icon: Trophy, accent: "text-yellow-400",  accentBg: "bg-yellow-500/10",   accentBorder: "border-yellow-500/25" },
    "Top Scores":   { icon: TrendingUp, accent: "text-green-400",   accentBg: "bg-green-500/10",    accentBorder: "border-green-500/25" },
    "Bottom Scores":{ icon: TrendingDown, accent: "text-purple-400",  accentBg: "bg-purple-500/10",   accentBorder: "border-purple-500/25" },
    Luck:           { icon: Clover, accent: "text-cyan-400",    accentBg: "bg-cyan-500/10",     accentBorder: "border-cyan-500/25" },
  };

  const DEFAULT_META = {
    icon: BarChart3,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/25",
  };

  return (
    <div>
      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-semibold uppercase tracking-widest text-yellow-400 mb-5">Browse by category</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {RECORD_CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/leagues/${leagueId}/records/${c.id}`}
              className="group rounded-md border border-white/10 bg-slate-900/60 p-5 hover:border-yellow-500/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-semibold text-white group-hover:text-yellow-300 transition-colors">{c.label}</p>
                <span className="text-[11px] font-bold text-slate-500 border border-white/10 rounded-full px-2 py-0.5 tabular-nums">
                  {categoryPageCount(c)}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <h2 className="text-xl font-semibold uppercase tracking-widest text-slate-300 mb-8">Highlights</h2>
      <div className="space-y-16">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 className="w-10 h-10 text-slate-600 mb-5" />
            <h3 className="text-2xl font-semibold text-white mb-3">No Records Yet</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
              Import some seasons and the record book will populate automatically.
            </p>
          </div>
        ) : (
          Array.from(categories.entries()).map(([category, recs]) => {
            const meta = CATEGORY_META[category] ?? DEFAULT_META;
            const [featured, ...rest] = recs;

            return (
              <section key={category}>
                {/* Category heading */}
                <div className="flex items-center gap-3 mb-6">
                  <meta.icon className={`w-5 h-5 ${meta.accent}`} strokeWidth={2} />
                  <h2 className={`text-xl font-semibold uppercase tracking-widest ${meta.accent}`}>
                    {category}
                  </h2>
                  <span className="text-xs font-bold text-slate-600 border border-slate-700/50 rounded-full px-2.5 py-1">
                    {recs.length}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Featured record — full width, gold treatment */}
                <div className={`relative rounded-lg border-2 p-7 mb-5 overflow-hidden ${meta.accentBg} ${meta.accentBorder}`}>
                  {/* rank badge */}
                  <div className="absolute top-4 right-5">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                      <span className="text-yellow-400 font-semibold text-xs">#1</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                    <div className="flex-1">
                      <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${meta.accent} opacity-70`}>
                        {featured.title}
                      </p>
                      {/* holder name — the hero */}
                      <p className="text-3xl md:text-4xl font-semibold text-white leading-tight">
                        {featured.holder}
                      </p>
                      {featured.detail && (
                        <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                          {featured.detail}
                        </p>
                      )}
                    </div>
                    <div className={`text-right flex-shrink-0`}>
                      <p className={`text-5xl md:text-6xl font-semibold ${meta.accent}`}>
                        {featured.value}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Remaining records — 2-col grid */}
                {rest.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rest.map((r, i) => (
                      <RecordCard key={i} r={r} rank={i + 2} meta={meta} />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RecordCard({
  r,
  rank,
  meta,
}: {
  r: { title: string; holder: string; value: string; detail: string };
  rank: number;
  meta: { accent: string; accentBg: string; accentBorder: string };
}) {
  const rankBadge =
    rank === 2
      ? { bg: "bg-slate-400/15 border-slate-400/30", text: "text-slate-300" }
      : rank === 3
      ? { bg: "bg-amber-700/15 border-amber-700/30", text: "text-amber-600" }
      : { bg: "bg-slate-700/30 border-slate-600/20",  text: "text-slate-500" };

  return (
    <div className="flex items-stretch rounded-md border border-white/8 bg-slate-900 overflow-hidden hover:border-white/15 transition-colors group">
      {/* left rank strip */}
      <div className={`flex items-center justify-center w-10 flex-shrink-0 border-r border-white/5 ${rankBadge.bg}`}>
        <span className={`text-xs font-semibold ${rankBadge.text}`}>#{rank}</span>
      </div>

      {/* content */}
      <div className="flex items-center justify-between flex-1 px-5 py-4 gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">
            {r.title}
          </p>
          <p className="font-semibold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">
            {r.holder}
          </p>
          {r.detail && (
            <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">{r.detail}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-2xl font-semibold ${meta.accent}`}>{r.value}</p>
        </div>
      </div>
    </div>
  );
}
