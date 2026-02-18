"use client";

import { useState } from "react";
import Link from "next/link";

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

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Season-by-Season</h2>

      {/* Year Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {seasons.map((s) => (
          <button
            key={s.year}
            onClick={() => setActiveYear(s.year)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeYear === s.year
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {s.year}
          </button>
        ))}
      </div>

      {/* Season Table */}
      {activeSeason && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500">
            {activeSeason.year} Season • {activeSeason.platform ?? "Manual"} • {activeSeason.teams.length} teams
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-t">
              <tr>
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Team</th>
                <th className="text-left px-4 py-3 font-medium">Owner</th>
                <th className="text-center px-4 py-3 font-medium">W</th>
                <th className="text-center px-4 py-3 font-medium">L</th>
                <th className="text-center px-4 py-3 font-medium">T</th>
                <th className="text-right px-4 py-3 font-medium">PF</th>
                <th className="text-right px-4 py-3 font-medium">PA</th>
                <th className="text-right px-4 py-3 font-medium">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeSeason.teams.map((t, i) => (
                <tr key={t.teamId} className={`hover:bg-gray-50 ${i === 0 ? "bg-yellow-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {i === 0 ? "🏆" : i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{t.teamName}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/leagues/${leagueId}/members/${t.memberId}`} className="text-blue-600 hover:underline">
                      {t.memberName}
                    </Link>
                  </td>
                  <td className="text-center px-4 py-3 text-green-600 font-medium">{t.wins}</td>
                  <td className="text-center px-4 py-3 text-red-600">{t.losses}</td>
                  <td className="text-center px-4 py-3 text-gray-500">{t.ties}</td>
                  <td className="text-right px-4 py-3">{t.pointsFor.toFixed(1)}</td>
                  <td className="text-right px-4 py-3">{t.pointsAgainst.toFixed(1)}</td>
                  <td className={`text-right px-4 py-3 font-medium ${
                    t.pointsFor - t.pointsAgainst > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {(t.pointsFor - t.pointsAgainst) > 0 ? "+" : ""}{(t.pointsFor - t.pointsAgainst).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
