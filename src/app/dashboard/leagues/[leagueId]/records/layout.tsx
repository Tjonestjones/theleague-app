import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SubscriptionGate } from "@/components/subscription-gate";
import { RECORD_CATEGORIES, categoryPageCount } from "@/lib/record-book/catalog";
import { RecordsNav } from "./records-nav";

export default async function RecordBookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });

  if (!league)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-semibold">
        League not found
      </div>
    );

  const pageCount = RECORD_CATEGORIES.reduce((n, c) => n + categoryPageCount(c), 0);

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-white/5">
          <div className="absolute -top-24 left-0 w-80 h-64 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative px-4 md:px-12 pt-8 pb-8">
            <Link
              href={`/dashboard/leagues/${leagueId}`}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-yellow-400 font-bold text-sm transition-colors mb-6"
            >
              ← {league.name}
            </Link>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Record Book</h1>
            <p className="text-sm text-slate-500 font-medium mt-2">
              <span className="text-white font-bold">{pageCount}</span> record pages across{" "}
              <span className="text-white font-bold">{RECORD_CATEGORIES.length}</span> categories
            </p>
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div className="px-4 md:px-12 py-8 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
          {/* Sidebar: collapsible on small screens, sticky column on large */}
          <aside className="mb-8 lg:mb-0">
            <details className="lg:hidden rounded-md border border-white/10 bg-slate-900/60">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300">
                Browse records
              </summary>
              <div className="px-2 pb-3 max-h-[70vh] overflow-y-auto">
                <Suspense>
                  <RecordsNav leagueId={leagueId} />
                </Suspense>
              </div>
            </details>
            <div className="hidden lg:block sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 pb-8">
              <Suspense>
                <RecordsNav leagueId={leagueId} />
              </Suspense>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </SubscriptionGate>
  );
}
