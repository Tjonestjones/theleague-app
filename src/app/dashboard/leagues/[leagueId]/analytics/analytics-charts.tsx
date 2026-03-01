"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

interface TeamWeekData {
  weekNumber: number;
  actualPoints: number;
  maxPotentialPoints: number;
  efficiency: number;
}

interface TeamData {
  teamId: string;
  teamName: string;
  memberName: string;
  memberId: string;
  weeks: TeamWeekData[];
  avgActual: number;
  avgMax: number;
  avgEfficiency: number;
  totalPointsLeft: number;
}

interface SeasonOption {
  id: string;
  year: number;
}

interface AnalyticsResponse {
  seasons: SeasonOption[];
  selectedSeasonId: string;
  analytics: TeamData[];
}

const TEAM_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#a855f7",
  "#22c55e", "#6366f1", "#eab308", "#f43f5e", "#0ea5e9",
];

export function AnalyticsCharts({ leagueId }: { leagueId: string }) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = all weeks

  const fetchData = useCallback(async (seasonId?: string) => {
    setLoading(true);
    const params = seasonId ? `?seasonId=${seasonId}` : "";
    const res = await fetch(`/api/leagues/${leagueId}/analytics${params}`);
    const json: AnalyticsResponse = await res.json();
    setData(json);
    setSelectedSeason(json.selectedSeasonId);
    setLoading(false);
  }, [leagueId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeason(seasonId);
    setSelectedTeam("all");
    setSelectedWeek(0);
    fetchData(seasonId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">📊</div>
          <p className="text-xl text-slate-400 font-semibold">Crunching numbers...</p>
        </div>
      </div>
    );
  }

  if (!data || data.analytics.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-cyan-500/30 rounded-3xl p-16 text-center shadow-2xl">
        <div className="text-9xl mb-6">📊</div>
        <h3 className="text-4xl font-black mb-4 text-white">No Analytics Data</h3>
        <p className="text-xl text-slate-400 font-semibold max-w-2xl mx-auto">
          Analytics require roster data with player points. Import a season with full roster details to see efficiency graphs.
        </p>
      </div>
    );
  }

  const analytics = data.analytics;
  const maxWeeks = Math.max(...analytics.flatMap((t) => t.weeks.map((w) => w.weekNumber)));

  // ===== CHART 1: Efficiency Rankings (all teams) =====
  const efficiencyRanking = analytics.map((t, i) => ({
    name: t.memberName,
    efficiency: Math.round(t.avgEfficiency * 1000) / 10,
    avgActual: Math.round(t.avgActual * 10) / 10,
    avgMax: Math.round(t.avgMax * 10) / 10,
    pointsLeft: Math.round(t.totalPointsLeft * 10) / 10,
    fill: TEAM_COLORS[i % TEAM_COLORS.length],
  }));

  // ===== CHART 2: Per-week all teams comparison =====
  const weeklyComparison = [];
  const weekNum = selectedWeek || 1;
  if (selectedWeek > 0) {
    // Single week view
    for (const team of analytics) {
      const w = team.weeks.find((wk) => wk.weekNumber === selectedWeek);
      if (w) {
        weeklyComparison.push({
          name: team.memberName,
          actual: Math.round(w.actualPoints * 10) / 10,
          wasted: Math.round((w.maxPotentialPoints - w.actualPoints) * 10) / 10,
        });
      }
    }
  }

  // ===== CHART 3: Individual team across weeks =====
  const selectedTeamData = selectedTeam !== "all"
    ? analytics.find((t) => t.teamId === selectedTeam)
    : null;

  const teamWeeklyData = selectedTeamData
    ? selectedTeamData.weeks.map((w) => ({
        week: `Wk ${w.weekNumber}`,
        actual: Math.round(w.actualPoints * 10) / 10,
        wasted: Math.round((w.maxPotentialPoints - w.actualPoints) * 10) / 10,
        max: Math.round(w.maxPotentialPoints * 10) / 10,
        efficiency: Math.round(w.efficiency * 1000) / 10,
      }))
    : [];

  // ===== CHART 4: Points left on bench (total) =====
  const benchData = analytics
    .map((t, i) => ({
      name: t.memberName,
      pointsLeft: Math.round(t.totalPointsLeft * 10) / 10,
      fill: TEAM_COLORS[i % TEAM_COLORS.length],
    }))
    .sort((a, b) => b.pointsLeft - a.pointsLeft);

  // ===== CHART 5: Radar chart =====
  const radarData = analytics.slice(0, 6).map((t) => ({
    name: t.memberName,
    avgScore: t.avgActual,
    efficiency: t.avgEfficiency * 100,
    consistency: 100 - (t.weeks.length > 1
      ? Math.sqrt(t.weeks.reduce((s, w) => s + Math.pow(w.actualPoints - t.avgActual, 2), 0) / t.weeks.length) / t.avgActual * 100
      : 0),
    maxPotential: t.avgMax,
  }));

  return (
    <div className="space-y-12">
      {/* Controls */}
      <div className="flex gap-4 items-center flex-wrap">
        {data.seasons.length > 1 && (
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Season</label>
            <select
              value={selectedSeason}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="h-12 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-cyan-500/50 focus:outline-none transition-colors"
            >
              {data.seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.year}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Team</label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="h-12 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-cyan-500/50 focus:outline-none transition-colors"
          >
            <option value="all">All Teams</option>
            {analytics.map((t) => (
              <option key={t.teamId} value={t.teamId}>{t.memberName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Week</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="h-12 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-cyan-500/50 focus:outline-none transition-colors"
          >
            <option value={0}>All Weeks</option>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Efficiency Rankings */}
      <div>
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 bg-cyan-500/20 border-2 border-cyan-500/30 rounded-full px-6 py-3 mb-4">
            <span className="text-3xl">🎯</span>
            <span className="font-black text-cyan-400 uppercase tracking-wider">Lineup Efficiency</span>
          </div>
          <h2 className="text-5xl font-black text-white">Who Sets the Best Lineup?</h2>
          <p className="text-xl text-slate-400 font-semibold mt-2">Actual points as a percentage of max potential points</p>
        </div>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-cyan-500/20 shadow-2xl">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={efficiencyRanking} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: "#94a3b8", fontWeight: 700 }} unit="%" />
              <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: "#e2e8f0", fontWeight: 700 }} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #06b6d4", borderRadius: "12px", fontWeight: 700 }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value) => [`${value}%`, "Efficiency"]}
              />
              <Bar dataKey="efficiency" radius={[0, 8, 8, 0]}>
                {efficiencyRanking.map((entry, idx) => (
                  <rect key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-Team Breakdown (when a team is selected) */}
      {selectedTeamData && (
        <div>
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full px-6 py-3 mb-4">
              <span className="text-3xl">📈</span>
              <span className="font-black text-emerald-400 uppercase tracking-wider">Player Breakdown</span>
            </div>
            <h2 className="text-5xl font-black text-white">{selectedTeamData.memberName}</h2>
            <p className="text-xl text-slate-400 font-semibold mt-2">
              Avg: <span className="text-emerald-400 font-black">{selectedTeamData.avgActual.toFixed(1)}</span> pts |
              Max: <span className="text-cyan-400 font-black">{selectedTeamData.avgMax.toFixed(1)}</span> pts |
              Efficiency: <span className="text-yellow-400 font-black">{(selectedTeamData.avgEfficiency * 100).toFixed(1)}%</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-emerald-500/20 shadow-2xl">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={teamWeeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" stroke="#64748b" tick={{ fill: "#94a3b8", fontWeight: 700 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontWeight: 700 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #10b981", borderRadius: "12px", fontWeight: 700 }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontWeight: 700 }} />
                <Bar dataKey="actual" name="Actual Points" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wasted" name="Points Left on Bench" fill="#10b981" fillOpacity={0.25} radius={[4, 4, 0, 0]} stackId="stack" />
                <Line dataKey="efficiency" name="Efficiency %" stroke="#f59e0b" strokeWidth={3} yAxisId={1} dot={{ r: 5, fill: "#f59e0b" }} />
                <YAxis yAxisId={1} orientation="right" domain={[0, 100]} stroke="#f59e0b" tick={{ fill: "#f59e0b", fontWeight: 700 }} unit="%" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Week Comparison (when a week is selected) */}
      {selectedWeek > 0 && weeklyComparison.length > 0 && (
        <div>
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 bg-orange-500/20 border-2 border-orange-500/30 rounded-full px-6 py-3 mb-4">
              <span className="text-3xl">⚔️</span>
              <span className="font-black text-orange-400 uppercase tracking-wider">Week {selectedWeek}</span>
            </div>
            <h2 className="text-5xl font-black text-white">Week {selectedWeek} Breakdown</h2>
            <p className="text-xl text-slate-400 font-semibold mt-2">Actual points (solid) vs wasted potential (faded)</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-orange-500/20 shadow-2xl">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={weeklyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#e2e8f0", fontWeight: 700 }} angle={-25} textAnchor="end" height={80} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontWeight: 700 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #f97316", borderRadius: "12px", fontWeight: 700 }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontWeight: 700 }} />
                <Bar dataKey="actual" name="Actual Points" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="wasted" name="Wasted Potential" stackId="a" fill="#10b981" fillOpacity={0.25} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Points Left on Bench */}
      <div>
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 bg-red-500/20 border-2 border-red-500/30 rounded-full px-6 py-3 mb-4">
            <span className="text-3xl">🪑</span>
            <span className="font-black text-red-400 uppercase tracking-wider">Bench Analysis</span>
          </div>
          <h2 className="text-5xl font-black text-white">Total Points Left on Bench</h2>
          <p className="text-xl text-slate-400 font-semibold mt-2">Who leaves the most points sitting on the bench all season?</p>
        </div>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-red-500/20 shadow-2xl">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={benchData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#64748b" tick={{ fill: "#94a3b8", fontWeight: 700 }} />
              <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: "#e2e8f0", fontWeight: 700 }} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "2px solid #ef4444", borderRadius: "12px", fontWeight: 700 }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value) => [`${value} pts`, "Points Wasted"]}
              />
              <Bar dataKey="pointsLeft" name="Points Wasted" radius={[0, 8, 8, 0]}>
                {benchData.map((entry, idx) => (
                  <rect key={idx} fill={TEAM_COLORS[idx % TEAM_COLORS.length]} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stat Cards Summary */}
      <div>
        <div className="mb-6">
          <h2 className="text-5xl font-black text-white">Team Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analytics.map((team, i) => (
            <div
              key={team.teamId}
              className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border-2 border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-500 transform hover:scale-[1.02] shadow-xl cursor-pointer"
              onClick={() => setSelectedTeam(team.teamId)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black text-slate-500">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }}
                ></span>
              </div>
              <h3 className="font-black text-xl text-white mb-1 group-hover:text-cyan-400 transition-colors">
                {team.memberName}
              </h3>
              <p className="text-sm text-slate-500 font-semibold mb-4">{team.teamName}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Efficiency</p>
                  <p className="text-2xl font-black text-cyan-400">{(team.avgEfficiency * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Avg Score</p>
                  <p className="text-2xl font-black text-emerald-400">{team.avgActual.toFixed(1)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Avg Max</p>
                  <p className="text-2xl font-black text-white">{team.avgMax.toFixed(1)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Pts Wasted</p>
                  <p className="text-2xl font-black text-red-400">{team.totalPointsLeft.toFixed(0)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
