"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { setEra } from "@/app/dashboard/leagues/[leagueId]/era-actions";

type NavItem = { label: string; href?: string; soon?: boolean; exact?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

export interface LeagueSidebarProps {
  leagueId: string;
  leagueName: string;
  allYears: number[];
  eraYears: number[];
  eraFrom: number;
  eraTo: number;
  isCommissioner: boolean;
  liveYear: number | null;
}

export function LeagueSidebar(props: LeagueSidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-white/8 bg-slate-950/95 backdrop-blur">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 text-slate-300 hover:text-white"
          aria-label="Open league menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-white truncate px-3">{props.leagueName}</span>
        <span className="w-9" />
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 border-r border-white/8 bg-slate-950 flex flex-col transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
          aria-label="Close league menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarBody {...props} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}

function SidebarBody({
  leagueId,
  leagueName,
  allYears,
  eraYears,
  eraFrom,
  eraTo,
  isCommissioner,
  liveYear,
  onNavigate,
}: LeagueSidebarProps & { onNavigate: () => void }) {
  const pathname = usePathname();
  const base = `/dashboard/leagues/${leagueId}`;

  const groups: NavGroup[] = [
    {
      items: [
        { label: "Overview", href: base, exact: true },
        liveYear
          ? { label: `Live ${liveYear}`, soon: true }
          : { label: "Live season", soon: true },
      ],
    },
    {
      title: "Seasons",
      items: [
        { label: "All-time standings", href: `${base}/history` },
        { label: "Matchups", href: `${base}/matchups` },
      ],
    },
    {
      title: "Activity",
      items: [
        { label: "Transactions", href: `${base}/transactions` },
        { label: "Trades", soon: true },
        { label: "Waivers & drops", soon: true },
      ],
    },
    {
      title: "Analysis",
      items: [
        { label: "Luck & all-play", soon: true },
        { label: "Close games", soon: true },
        { label: "Draft", soon: true },
        { label: "Availability", soon: true },
        { label: "Lineups", href: `${base}/analytics` },
        { label: "Records", href: `${base}/records` },
      ],
    },
    {
      title: "Recaps",
      items: [
        { label: "Weekly recap", href: `${base}/newsletter` },
        { label: "My recap", soon: true },
        { label: "Season Wrapped", soon: true },
        { label: "Trends", soon: true },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Managers", href: `${base}/members` },
        { label: "Rivalries", soon: true },
        { label: "Players", soon: true },
      ],
    },
    {
      title: "Admin",
      items: [
        { label: "Finances", href: `${base}/finances` },
        ...(isCommissioner ? [{ label: "Settings", href: `${base}/settings` }] : []),
      ],
    },
  ];

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <>
      <div className="px-5 pt-6 pb-5 border-b border-white/8">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 mb-5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <BrandMark className="w-6 h-6 text-[10px]" />
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <ArrowLeft className="w-3 h-3" /> All leagues
          </span>
        </Link>
        <Link href={base} onClick={onNavigate} className="block text-base font-semibold text-white tracking-tight leading-snug hover:text-emerald-400 transition-colors">
          {leagueName}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && (
              <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">{g.title}</p>
            )}
            <ul className="space-y-px">
              {g.items.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`block px-2 py-1.5 rounded-md text-sm transition-colors ${
                        isActive(item)
                          ? "bg-white/8 text-white font-medium"
                          : "text-slate-400 hover:text-white hover:bg-white/4"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="flex items-center justify-between px-2 py-1.5 text-sm text-slate-600 cursor-default">
                      {item.label}
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-700">Soon</span>
                    </span>
                  )}
                </li>
              ))}
              {g.title === "Seasons" && eraYears.length > 0 && (
                <li className="pt-1">
                  <div className="grid grid-cols-4 gap-1 px-1">
                    {eraYears.map((y) => {
                      const href = `${base}/seasons/${y}`;
                      const active = pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Link
                          key={y}
                          href={href}
                          onClick={onNavigate}
                          className={`text-center py-1 rounded text-xs tabular-nums transition-colors ${
                            active ? "bg-emerald-500 text-black font-semibold" : "text-slate-400 hover:text-white hover:bg-white/6"
                          }`}
                        >
                          {y}
                        </Link>
                      );
                    })}
                  </div>
                </li>
              )}
            </ul>
          </div>
        ))}
      </nav>

      <EraSelector leagueId={leagueId} allYears={allYears} from={eraFrom} to={eraTo} />
    </>
  );
}

function EraSelector({
  leagueId,
  allYears,
  from,
  to,
}: {
  leagueId: string;
  allYears: number[];
  from: number;
  to: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (allYears.length === 0) return null;
  const asc = [...allYears].sort((a, b) => a - b);
  const min = asc[0];
  const max = asc[asc.length - 1];
  const isAll = from === min && to === max;

  const apply = (f: number, t: number) =>
    start(async () => {
      const all = Math.min(f, t) === min && Math.max(f, t) === max;
      await setEra(leagueId, all ? null : f, all ? null : t);
      router.refresh();
    });

  const select =
    "w-full bg-slate-900 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white tabular-nums focus:outline-none focus:border-emerald-500/50";

  return (
    <div className={`px-4 py-4 border-t border-white/8 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Era</p>
        {!isAll && (
          <button onClick={() => apply(min, max)} className="text-[11px] text-emerald-400 hover:text-emerald-300">
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <select aria-label="Era start" className={select} value={from} onChange={(e) => apply(Number(e.target.value), Math.max(Number(e.target.value), to))}>
          {asc.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-slate-600 text-sm">–</span>
        <select aria-label="Era end" className={select} value={to} onChange={(e) => apply(Math.min(from, Number(e.target.value)), Number(e.target.value))}>
          {asc.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        {isAll ? "Showing every season" : `Stats limited to ${from === to ? from : `${from}–${to}`}`}
      </p>
    </div>
  );
}
