"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

interface SeasonData {
  year: number;
  platform: string | null;
  teams: Array<{
    teamId: string;
    teamName: string;
    memberName: string;
    memberId: string;
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
  }>;
}

export function SeasonTabs({ seasons, leagueId }: { seasons: SeasonData[]; leagueId: string }) {
  const [activeYear, setActiveYear] = useState(seasons[0]?.year);
  const activeSeason = seasons.find((s) => s.year === activeYear);

  const headers: Array<[string, string]> = [
    ["#", "text-left w-10"], ["Team", "text-left"], ["Owner", "text-left"],
    ["W", "text-center"], ["L", "text-center"], ["T", "text-center"],
    ["PF", "text-right"], ["PA", "text-right"], ["Diff", "text-right"],
  ];

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-6">
        Season-by-Season
      </h2>

      {/* Year Tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {seasons.map((s) => (
          <button
            key={s.year}
            onClick={() => setActiveYear(s.year)}
            aria-pressed={activeYear === s.year}
            className={`px-4 py-2 text-sm font-semibold rounded-md border transition-colors ${
              activeYear === s.year
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-slate-900 border-white/8 text-slate-400 hover:text-white hover:border-white/20"
            }`}
          >
            {s.year}
          </button>
        ))}
      </div>

      {/* Season Table */}
      {activeSeason && (
        <div className="bg-slate-900 border border-white/8 rounded-lg overflow-x-auto">
          <div className="px-5 py-3 text-xs font-medium text-slate-500 border-b border-white/8">
            {activeSeason.year} Season · {activeSeason.platform ?? "Manual"} · {activeSeason.teams.length} teams
          </div>
          <table className="w-full text-sm tabular-nums">
            <thead className="border-b border-white/8">
              <tr>
                {headers.map(([h, align]) => (
                  <th
                    key={h}
                    className={`px-5 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500 ${align}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeSeason.teams.map((t, i) => {
                const diff = t.pointsFor - t.pointsAgainst;
                return (
                  <tr
                    key={t.teamId}
                    className={`transition-colors hover:bg-white/3 ${i === 0 ? "bg-yellow-500/5" : ""}`}
                  >
                    <td className="px-5 py-4 font-semibold text-slate-500">
                      {i === 0 ? <Trophy className="w-4 h-4 text-yellow-400" aria-label="Champion" /> : i + 1}
                    </td>
                    <td className={`px-5 py-4 font-semibold ${i === 0 ? "text-yellow-300" : "text-white"}`}>
                      {t.teamName}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/leagues/${leagueId}/members/${t.memberId}`}
                        className="text-slate-300 hover:text-emerald-400 transition-colors"
                      >
                        {t.memberName}
                      </Link>
                    </td>
                    <td className="text-center px-5 py-4 font-semibold text-emerald-400">{t.wins}</td>
                    <td className="text-center px-5 py-4 font-semibold text-red-400">{t.losses}</td>
                    <td className="text-center px-5 py-4 text-slate-600">{t.ties}</td>
                    <td className="text-right px-5 py-4 font-semibold text-white">{t.pointsFor.toFixed(1)}</td>
                    <td className="text-right px-5 py-4 text-slate-400">{t.pointsAgainst.toFixed(1)}</td>
                    <td className={`text-right px-5 py-4 font-semibold ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
