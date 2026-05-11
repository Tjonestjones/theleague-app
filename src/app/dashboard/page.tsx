// import { prisma } from "@/lib/db";
// import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// ─── MOCK DATA (remove when DB is connected) ──────────────────────────────────
const MOCK_USER = { id: "mock-user", firstName: "Thomas" };

const MOCK_LEAGUES = [
  {
    id: "league-1",
    name: "Stab League",
    description: "The original. Est. 2016.",
    sport: "NFL",
    createdAt: new Date("2016-01-01"),
    _count: { members: 10, seasons: 8 },
    members: [{ role: "COMMISSIONER" as const }],
    seasons: [
      { year: 2016 }, { year: 2017 }, { year: 2018 }, { year: 2019 },
      { year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 },
    ],
  },
  {
    id: "league-2",
    name: "Dynasty Kings",
    description: null,
    sport: "NFL",
    createdAt: new Date("2019-01-01"),
    _count: { members: 12, seasons: 5 },
    members: [{ role: "MEMBER" as const }],
    seasons: [
      { year: 2019 }, { year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 },
    ],
  },
  {
    id: "league-3",
    name: "Redraft 2024",
    description: null,
    sport: "NFL",
    createdAt: new Date("2024-01-01"),
    _count: { members: 8, seasons: 1 },
    members: [{ role: "CO_COMMISSIONER" as const }],
    seasons: [{ year: 2024 }],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // const user = await getCurrentUser();
  // if (!user) redirect("/sign-in");
  const user = MOCK_USER;

  // const leagues = await prisma.league.findMany({ ... });
  const leagues = MOCK_LEAGUES;

  const totalSeasons = leagues.reduce((sum, l) => sum + l._count.seasons, 0);
  const ownedCount = leagues.filter(
    (l) => l.members[0]?.role === "COMMISSIONER"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* ambient glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-16 right-0 w-80 h-80 bg-green-700/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 md:px-12 pt-10 pb-8">
          {/* live badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5 mb-5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Live</span>
          </div>

          {/* greeting + quick stats */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                {user.firstName ? (
                  <>Welcome back, <span className="text-emerald-400">{user.firstName}</span>.</>
                ) : (
                  "Welcome back."
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <Pill label={`${leagues.length} league${leagues.length !== 1 ? "s" : ""}`} color="emerald" />
                <Pill label={`${totalSeasons} season${totalSeasons !== 1 ? "s" : ""} imported`} color="blue" />
                {ownedCount > 0 && (
                  <Pill label={`${ownedCount} commissioner`} color="yellow" icon="👑" />
                )}
              </div>
            </div>

            {/* quick actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/dashboard/leagues/import"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 font-bold text-sm transition-all"
              >
                <span>📥</span> Import
              </Link>
              <Link
                href="/dashboard/leagues/create"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/50"
              >
                <span>＋</span> Create League
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── LEAGUE GRID ─────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-10">
        {leagues.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
              My Leagues
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {leagues.map((league) => {
                const isOwner = league.members[0]?.role === "COMMISSIONER";
                const isCoComm = league.members[0]?.role === "CO_COMMISSIONER";
                const years = league.seasons.map((s) => s.year);
                const yearRange =
                  years.length > 0
                    ? years.length === 1
                      ? `${years[0]}`
                      : `${years[0]}–${years[years.length - 1]}`
                    : null;
                const initial = league.name.charAt(0).toUpperCase();

                return (
                  <Link key={league.id} href={`/dashboard/leagues/${league.id}`}>
                    <div className="group relative flex flex-col bg-slate-900 border border-white/8 hover:border-emerald-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/60 cursor-pointer">

                      {/* colour bar top */}
                      <div className={`h-1 w-full ${isOwner ? "bg-gradient-to-r from-yellow-500 to-amber-400" : isCoComm ? "bg-gradient-to-r from-blue-500 to-indigo-400" : "bg-gradient-to-r from-emerald-600 to-green-500"}`} />

                      <div className="flex items-start gap-5 p-6">
                        {/* league avatar */}
                        <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black ${isOwner ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"}`}>
                          {initial}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* name + role */}
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors truncate leading-tight">
                              {league.name}
                            </h3>
                            {(isOwner || isCoComm) && (
                              <span className={`flex-shrink-0 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${isOwner ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25" : "bg-blue-500/15 text-blue-400 border border-blue-500/25"}`}>
                                {isOwner ? "👑 Owner" : "⚡ Co-Comm"}
                              </span>
                            )}
                          </div>

                          {/* meta row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 font-medium">
                            {yearRange && (
                              <span className="text-slate-400 font-bold">{yearRange}</span>
                            )}
                            <span>{league._count.seasons} season{league._count.seasons !== 1 ? "s" : ""}</span>
                            <span>{league._count.members} members</span>
                            <span className="text-emerald-600 font-bold uppercase text-xs">{league.sport}</span>
                          </div>
                        </div>
                      </div>

                      {/* footer row */}
                      <div className="mt-auto border-t border-white/5 px-6 py-3 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">
                          {league._count.seasons === 0 ? "No data imported yet" : `${league._count.seasons} season${league._count.seasons !== 1 ? "s" : ""} of history`}
                        </span>
                        <span className="text-xs text-emerald-600 font-bold group-hover:text-emerald-400 transition-colors">
                          Open →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* "Add another" card */}
              <Link href="/dashboard/leagues/create">
                <div className="group flex flex-col items-center justify-center border-2 border-dashed border-white/8 hover:border-emerald-500/30 rounded-2xl p-10 transition-all duration-300 cursor-pointer min-h-[160px]">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-2xl text-emerald-500 mb-3 transition-all">
                    ＋
                  </div>
                  <p className="text-sm font-bold text-slate-500 group-hover:text-slate-400 transition-colors">
                    Add another league
                  </p>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({
  label,
  color,
  icon,
}: {
  label: string;
  color: "emerald" | "blue" | "yellow";
  icon?: string;
}) {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-bold ${colors[color]}`}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="max-w-2xl mx-auto pt-10 text-center">
      <div className="text-7xl mb-6">🏈</div>
      <h2 className="text-3xl font-black text-white mb-3">
        No leagues yet
      </h2>
      <p className="text-slate-400 mb-10 leading-relaxed">
        Create a league and import your history from ESPN, Sleeper, Yahoo, or
        Fleaflicker — all your seasons in one place, forever.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/dashboard/leagues/create"
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black transition-all shadow-lg shadow-emerald-900/50"
        >
          Create a League
        </Link>
        <Link
          href="/dashboard/leagues/import"
          className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white rounded-xl font-bold transition-all"
        >
          Import Existing Data
        </Link>
      </div>
    </div>
  );
}
