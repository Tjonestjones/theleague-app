"use client";

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Props {
  weekScores: number[];
  seasons: Array<{
    year: number;
    wins: number;
    losses: number;
    pointsFor: number;
  }>;
}

export function MemberCharts({ weekScores, seasons }: Props) {
  // Week-by-week scoring trend
  const weekData = weekScores.map((score, i) => ({
    week: i + 1,
    score: parseFloat(score.toFixed(1)),
  }));

  // Season performance bars
  const seasonData = [...seasons].reverse().map((s) => ({
    year: s.year.toString(),
    wins: s.wins,
    losses: s.losses,
    pointsFor: parseFloat(s.pointsFor.toFixed(0)),
  }));

  if (weekScores.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* Scoring Trend */}
      <div>
        <h2 className="text-xl font-semibold mb-4">📈 Scoring Trend</h2>
        <div className="border rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" label={{ value: "Game #", position: "insideBottom", offset: -5 }} />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Season Wins/Losses */}
      {seasonData.length > 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 Season Records</h2>
          <div className="border rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seasonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="wins" fill="#22c55e" name="Wins" />
                <Bar dataKey="losses" fill="#ef4444" name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Season Points */}
      {seasonData.length > 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">💰 Total Points by Season</h2>
          <div className="border rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seasonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pointsFor" fill="#2563eb" name="Points For" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
