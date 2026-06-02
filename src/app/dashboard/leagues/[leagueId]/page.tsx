import { prisma } from "@/lib/db";
import { getCurrentUser, getLeagueAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LeagueMembers } from "./league-members";
import { TrialBanner } from "@/components/subscription-gate";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true, description: true },
  });
  if (!league) return { title: "League — TheLeague" };
  return {
    title: `${league.name} — TheLeague`,
    description: league.description ?? `${league.name} fantasy football league on TheLeague`,
  };
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        include: {
          user: { select: { firstName: true, lastName: true, imageUrl: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      seasons: {
        include: {
          _count: { select: { teams: true, weeks: true } },
        },
        orderBy: { year: "desc" },
      },
    },
  });

  if (!league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl font-black text-slate-700 mb-4">404</p>
          <h2 className="text-2xl font-black mb-4">League Not Found</h2>
          <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const access = await getLeagueAccess(leagueId);

  const currentMember = league.members.find((m) => m.userId === user.id);
  const isCommissioner =
    currentMember?.role === "COMMISSIONER" || currentMember?.role === "CO_COMMISSIONER";

  const navItems = [
    { href: `/dashboard/leagues/${leagueId}/history`,   abbr: "HST", label: "History",    bar: "bg-emerald-500", text: "group-hover:text-emerald-400", border: "hover:border-emerald-500/40" },
    { href: `/dashboard/leagues/${leagueId}/records`,   abbr: "REC", label: "Records",    bar: "bg-yellow-500",  text: "group-hover:text-yellow-400",  border: "hover:border-yellow-500/40" },
    { href: `/dashboard/leagues/${leagueId}/analytics`, abbr: "ANA", label: "Analytics",  bar: "bg-cyan-500",    text: "group-hover:text-cyan-400",    border: "hover:border-cyan-500/40" },
    { href: `/dashboard/leagues/${leagueId}/members`,   abbr: "MBR", label: "Members",    bar: "bg-blue-500",    text: "group-hover:text-blue-400",    border: "hover:border-blue-500/40" },
    { href: `/dashboard/leagues/${leagueId}/finances`,  abbr: "FIN", label: "Finances",   bar: "bg-green-500",   text: "group-hover:text-green-400",   border: "hover:border-green-500/40" },
    { href: `/dashboard/leagues/${leagueId}/newsletter`,abbr: "NWS", label: "Newsletter", bar: "bg-purple-500",  text: "group-hover:text-purple-400",  border: "hover:border-purple-500/40" },
  ];

  const syncStatusStyle = (status: string) => {
    if (status === "COMPLETED") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status === "SYNCING")   return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse";
    if (status === "FAILED")    return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-slate-700/30 text-slate-500 border-slate-600/20";
  };

  const platformLabel: Record<string, string> = {
    ESPN: "ESPN", SLEEPER: "Sleeper", YAHOO: "Yahoo", FLEAFLICKER: "Fleaflicker",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── TRIAL BANNER ─────────────────────────────────────────────────── */}
      {access.ok && access.daysLeft !== null && access.daysLeft <= 7 && (
        <TrialBanner leagueId={leagueId} daysLeft={access.daysLeft} />
      )}

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-12 pt-10 pb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
          >
            ← Dashboard
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{league.name}</h1>
              {league.description && (
                <p className="text-slate-400 text-sm font-medium mb-3">{league.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 border border-emerald-500/25 bg-emerald-500/10 rounded-full px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {league.sport}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {league.members.length} members
                </span>
                <span className="text-slate-700">·</span>
                <span className="text-xs font-bold text-slate-500">
                  {league.seasons.length} seasons
                </span>
                <span className="text-slate-700">·</span>
                <span className={`text-xs font-bold ${
                  league.visibility === "PUBLIC" ? "text-green-400" :
                  league.visibility === "UNLISTED" ? "text-yellow-400" : "text-slate-500"
                }`}>
                  {league.visibility.charAt(0) + league.visibility.slice(1).toLowerCase()}
                </span>
                {league.visibility !== "PRIVATE" && (
                  <a
                    href={`/league/${league.slug}`}
                    target="_blank"
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Public Page ↗
                  </a>
                )}
              </div>
            </div>

            {isCommissioner && (
              <Link
                href={`/dashboard/leagues/${leagueId}/settings`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-bold text-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 space-y-12">

        {/* ── NAVIGATION ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`group relative flex flex-col items-center bg-slate-900 border border-white/8 ${item.border} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer`}>
                <div className={`w-full h-0.5 ${item.bar}`} />
                <div className="py-5 px-3 text-center">
                  <span className={`block text-xs font-black text-slate-600 tracking-widest mb-1.5 uppercase`}>{item.abbr}</span>
                  <span className={`font-black text-sm text-white ${item.text} transition-colors`}>{item.label}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── SEASONS ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Imported Seasons</h2>
            {isCommissioner && (
              <Link
                href={`/dashboard/leagues/import?leagueId=${leagueId}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/50"
              >
                + Import Data
              </Link>
            )}
          </div>

          {league.seasons.length === 0 ? (
            <div className="border-2 border-dashed border-white/8 rounded-2xl p-14 text-center">
              <p className="text-slate-600 font-black text-sm uppercase tracking-widest mb-2">No seasons imported</p>
              <p className="text-slate-500 text-sm font-medium mb-6">
                Import from ESPN, Sleeper, Yahoo, or Fleaflicker to unlock your league history.
              </p>
              {isCommissioner && (
                <Link
                  href={`/dashboard/leagues/import?leagueId=${leagueId}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/50"
                >
                  Import Your First Season →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {league.seasons.map((season) => (
                <div
                  key={season.id}
                  className="group flex items-center gap-6 bg-slate-900 border border-white/8 rounded-2xl px-6 py-5"
                >
                  <div className="text-2xl font-black text-white w-16 flex-shrink-0">
                    {season.year}
                  </div>

                  <div className="flex-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500 font-medium">
                    {season.platform && (
                      <span className="text-slate-400 font-bold">
                        {platformLabel[season.platform] ?? season.platform}
                      </span>
                    )}
                    <span>{season._count.teams} teams</span>
                    <span>{season._count.weeks} weeks</span>
                  </div>

                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex-shrink-0 ${syncStatusStyle(season.syncStatus)}`}>
                    {season.syncStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── MEMBERS ─────────────────────────────────────────────────── */}
        <LeagueMembers
          leagueId={leagueId}
          members={league.members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            email: m.email,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
            firstName: m.user?.firstName ?? null,
            lastName: m.user?.lastName ?? null,
            imageUrl: m.user?.imageUrl ?? null,
          }))}
          isCommissioner={isCommissioner}
        />
      </div>
    </div>
  );
}
