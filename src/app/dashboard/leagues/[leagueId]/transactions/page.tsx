import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { TransactionType } from "@prisma/client";
import { SubscriptionGate } from "@/components/subscription-gate";
import {
  PAGE_SIZE,
  TRANSACTION_TYPES,
  TYPE_LABEL,
  formatMoveDate,
  formatMoveTime,
  getTrades,
  getTransactionFilterOptions,
  getTransactions,
  type TransactionFilters,
} from "@/lib/transactions";
import { PlayerLink, TeamCell, TypeBadge, weekLabel } from "./move-parts";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  return { title: league ? `${league.name} · Transactions — TheLeague` : "Transactions — TheLeague" };
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId } = await params;
  const sp = await searchParams;

  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } });
  if (!league)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">
        League not found
      </div>
    );

  const view = one(sp.view) === "trades" ? "trades" : "all";
  const typeParam = one(sp.type)?.toUpperCase();
  const filters: TransactionFilters = {
    season: Number(one(sp.season)) || undefined,
    type: TRANSACTION_TYPES.includes(typeParam as TransactionType) ? (typeParam as TransactionType) : undefined,
    memberId: one(sp.member) || undefined,
    q: one(sp.q)?.trim() || undefined,
  };
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const options = await getTransactionFilterOptions(leagueId);
  const hasHistory = options.seasons.length > 0;

  // Build links that keep the current filters
  const href = (patch: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged = {
      view: view === "trades" ? "trades" : undefined,
      season: filters.season,
      type: filters.type?.toLowerCase(),
      member: filters.memberId,
      q: filters.q,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") q.set(k, String(v));
    const s = q.toString();
    return `/dashboard/leagues/${leagueId}/transactions${s ? `?${s}` : ""}`;
  };

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league.name}>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-white/5">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-yellow-500/6 rounded-full blur-3xl pointer-events-none" />
          <div className="relative px-6 md:px-12 pt-10 pb-8">
            <Link
              href={`/dashboard/leagues/${leagueId}`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-300 mb-6 transition-colors"
            >
              ← {league.name}
            </Link>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Transactions</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Every draft pick, waiver claim, pickup, drop and trade
                  {hasHistory && ` · ${options.seasons[options.seasons.length - 1]}–${options.seasons[0]}`}
                </p>
              </div>
              <div className="flex rounded-xl bg-slate-900 border border-white/10 p-1">
                {(["all", "trades"] as const).map((v) => (
                  <Link
                    key={v}
                    href={href({ view: v === "trades" ? "trades" : undefined, page: undefined, type: v === "trades" ? undefined : filters.type?.toLowerCase() })}
                    className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${
                      view === v ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {v === "all" ? "All moves" : "Trades"}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-12 py-10 space-y-8">
          {!hasHistory ? (
            <div className="border-2 border-dashed border-white/8 rounded-2xl p-12 text-center">
              <p className="text-slate-600 font-black text-sm uppercase tracking-widest mb-2">No transactions yet</p>
              <p className="text-slate-500 text-sm font-medium">
                Import a season from ESPN to load its draft, waiver, free-agent and trade history.
              </p>
            </div>
          ) : (
            <>
              {/* ── FILTERS ─────────────────────────────────────────────── */}
              <form method="get" className="flex flex-wrap items-end gap-3">
                {view === "trades" && <input type="hidden" name="view" value="trades" />}
                <FilterSelect name="season" label="Season" value={filters.season?.toString()} options={options.seasons.map((y) => ({ value: String(y), label: String(y) }))} all="All seasons" />
                <FilterSelect name="member" label="Manager" value={filters.memberId} options={options.members.map((m) => ({ value: m.id, label: m.displayName }))} all="All managers" />
                {view === "all" && (
                  <FilterSelect name="type" label="Type" value={filters.type?.toLowerCase()} options={TRANSACTION_TYPES.map((t) => ({ value: t.toLowerCase(), label: TYPE_LABEL[t] }))} all="All types" />
                )}
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Player</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={filters.q}
                    placeholder="Search a player"
                    className="h-10 w-52 rounded-xl bg-slate-900 border border-white/10 px-3 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </label>
                <button type="submit" className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-colors">
                  Apply
                </button>
                {(filters.season || filters.memberId || filters.type || filters.q) && (
                  <Link href={href({ season: undefined, member: undefined, type: undefined, q: undefined, page: undefined })} className="h-10 inline-flex items-center px-3 text-sm font-bold text-slate-500 hover:text-slate-300">
                    Clear
                  </Link>
                )}
              </form>

              {view === "all" ? (
                <AllMoves leagueId={leagueId} filters={filters} page={page} href={href} />
              ) : (
                <TradesList leagueId={leagueId} filters={filters} />
              )}
            </>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}

// ── All moves ───────────────────────────────────────────────────────────────

async function AllMoves({
  leagueId,
  filters,
  page,
  href,
}: {
  leagueId: string;
  filters: TransactionFilters;
  page: number;
  href: (patch: Record<string, string | number | undefined>) => string;
}) {
  const { rows, total, counts, tradeCount, pages } = await getTransactions(leagueId, filters, page);

  const tiles: { type: TransactionType; label: string; value: number }[] = [
    { type: "DRAFT", label: "Draft picks", value: counts.DRAFT },
    { type: "WAIVER", label: "Waiver claims", value: counts.WAIVER },
    { type: "ADD", label: "Free-agent adds", value: counts.ADD },
    { type: "DROP", label: "Drops", value: counts.DROP },
    { type: "TRADE", label: "Trades", value: tradeCount },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((t) => {
          const active = filters.type === t.type;
          return (
            <Link
              key={t.type}
              href={href({ type: active ? undefined : t.type.toLowerCase(), page: undefined })}
              className={`rounded-2xl border px-5 py-4 transition-colors ${
                active ? "bg-slate-800 border-white/20" : "bg-slate-900 border-white/8 hover:border-white/15"
              }`}
            >
              <span className="block text-2xl font-black text-white tabular-nums">{t.value.toLocaleString()}</span>
              <span className="block text-xs font-black uppercase tracking-widest text-slate-500 mt-1">{t.label}</span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-white/8 rounded-2xl p-12 text-center">
          <p className="text-slate-600 font-bold text-sm">No moves match these filters.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-white/8">
                <tr>
                  {["Date", "Type", "Player", "From", "", "To"].map((h, i) => (
                    <th key={i} className="px-5 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-white/3 transition-colors align-top">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="block text-sm font-bold text-white">
                        {m.processedAt ? formatMoveDate(m.processedAt) : m.season.year}
                      </span>
                      <span className="block text-xs font-medium text-slate-500">
                        {weekLabel(m.weekNumber)}
                        {m.processedAt && ` · ${formatMoveTime(m.processedAt)}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <TypeBadge type={m.type} />
                      {m.type === "DRAFT" && m.draftRound && (
                        <span className="block text-xs font-medium text-slate-500 mt-1">
                          Rd {m.draftRound} · #{m.draftPick}
                        </span>
                      )}
                      {m.type === "TRADE" && m.tradeGroup && (
                        <Link
                          href={href({ view: "trades", season: m.season.year, type: undefined, member: undefined, q: m.player.name, page: undefined })}
                          className="block text-xs font-bold text-slate-500 hover:text-yellow-400 mt-1"
                        >
                          See trade →
                        </Link>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <PlayerLink player={m.player} leagueId={leagueId} />
                      {m.note && <span className="block text-xs font-medium text-slate-500 mt-0.5 max-w-xs">{m.note}</span>}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <TeamCell team={m.fromTeam} leagueId={leagueId} empty={m.type === "DRAFT" ? "Draft" : m.type === "WAIVER" ? "Waivers" : "Free agency"} />
                    </td>
                    <td className="py-3.5 text-slate-600 font-black">→</td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <TeamCell team={m.toTeam} leagueId={leagueId} empty={m.type === "DROP" ? "Waivers" : "Free agency"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAGINATION ─────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="text-slate-500">
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()} moves
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href({ page: page - 1 })} className="px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white">
                ← Newer
              </Link>
            )}
            {page < pages && (
              <Link href={href({ page: page + 1 })} className="px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white">
                Older →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Trades ──────────────────────────────────────────────────────────────────

async function TradesList({ leagueId, filters }: { leagueId: string; filters: TransactionFilters }) {
  const trades = await getTrades(leagueId, filters);

  if (!trades.length)
    return (
      <div className="border-2 border-dashed border-white/8 rounded-2xl p-12 text-center">
        <p className="text-slate-600 font-bold text-sm">No trades match these filters.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {trades.length} trade{trades.length === 1 ? "" : "s"}
      </p>
      {trades.map((t) => (
        <div key={`${t.year}-${t.group}`} className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 border-b border-white/5 text-xs font-bold text-slate-500">
            <span className="font-black text-yellow-400">{t.year}</span>
            <span>{weekLabel(t.week)}</span>
            {t.processedAt ? <span>{formatMoveDate(t.processedAt)}</span> : <span>Exact date not recorded</span>}
          </div>
          <div className={`grid gap-px bg-white/5 ${t.sides.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {t.sides.map((s) => (
              <div key={s.teamId} className="bg-slate-900 px-6 py-5">
                <Link href={`/dashboard/leagues/${leagueId}/members/${s.memberId}`} className="font-black text-white hover:text-emerald-400 transition-colors">
                  {s.memberName}
                </Link>
                <span className="block text-xs font-medium text-slate-500 mb-3">{s.teamName}</span>
                <span className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">Receives</span>
                {s.receives.length ? (
                  <ul className="space-y-1.5">
                    {s.receives.map((p) => (
                      <li key={p.playerId} className="text-sm">
                        <Link href={`/dashboard/leagues/${leagueId}/players/${p.playerId}`} className="font-bold text-white hover:text-emerald-400 transition-colors">
                          {p.name}
                        </Link>
                        <span className="ml-1.5 text-xs font-bold text-slate-500">{p.position}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm font-medium text-slate-600">Not visible in weekly rosters</p>
                )}
              </div>
            ))}
          </div>
          {t.oneSided && (
            <p className="px-6 py-3 border-t border-white/5 text-xs font-medium text-slate-500">
              Only one side of this trade shows up in the weekly rosters. Whatever came back left the roster before the next week, or the trade was reversed.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
  all,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  all: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-10 min-w-40 rounded-xl bg-slate-900 border border-white/10 px-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50"
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
