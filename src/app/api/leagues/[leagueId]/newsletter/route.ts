import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

// POST — generate a weekly newsletter for the league
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leagueId } = await params;
    await requireRole(leagueId, user.id, ["COMMISSIONER", "CO_COMMISSIONER"]);

    const body = await req.json();
    const { seasonId, weekNumber } = body;

    if (!seasonId || !weekNumber) {
      return NextResponse.json({ error: "seasonId and weekNumber required" }, { status: 400 });
    }

    // Fetch league info
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { name: true },
    });

    // Fetch the week's matchups
    const week = await prisma.week.findUnique({
      where: { seasonId_weekNumber: { seasonId, weekNumber: parseInt(weekNumber) } },
      include: {
        matchups: {
          where: { status: "COMPLETED" },
          include: {
            homeTeam: { include: { member: { select: { displayName: true } } } },
            awayTeam: { include: { member: { select: { displayName: true } } } },
          },
        },
      },
    });

    if (!week || week.matchups.length === 0) {
      return NextResponse.json({ error: "No completed matchups found for this week" }, { status: 404 });
    }

    // Fetch season standings so far
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { year: true },
    });

    // Build newsletter content
    const matchups = week.matchups;

    // Sort matchups by total score (most exciting first)
    matchups.sort((a, b) =>
      ((b.homeScore ?? 0) + (b.awayScore ?? 0)) - ((a.homeScore ?? 0) + (a.awayScore ?? 0))
    );

    // Find highlights
    let highScore = { score: 0, name: "", team: "" };
    let lowScore = { score: Infinity, name: "", team: "" };
    let biggestBlowout = { margin: 0, winner: "", loser: "", score: "" };
    let closestGame = { margin: Infinity, winner: "", loser: "", score: "" };

    for (const m of matchups) {
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;

      // High/low scores
      if (hs > highScore.score) highScore = { score: hs, name: m.homeTeam.member.displayName, team: m.homeTeam.name };
      if (as_ > highScore.score) highScore = { score: as_, name: m.awayTeam.member.displayName, team: m.awayTeam.name };
      if (hs < lowScore.score) lowScore = { score: hs, name: m.homeTeam.member.displayName, team: m.homeTeam.name };
      if (as_ < lowScore.score) lowScore = { score: as_, name: m.awayTeam.member.displayName, team: m.awayTeam.name };

      // Blowout / closest
      const margin = Math.abs(hs - as_);
      const winner = hs > as_ ? m.homeTeam : m.awayTeam;
      const loser = hs > as_ ? m.awayTeam : m.homeTeam;
      const winScore = Math.max(hs, as_);
      const loseScore = Math.min(hs, as_);

      if (margin > biggestBlowout.margin) {
        biggestBlowout = { margin, winner: winner.member.displayName, loser: loser.member.displayName, score: `${winScore.toFixed(1)}-${loseScore.toFixed(1)}` };
      }
      if (margin < closestGame.margin && margin > 0) {
        closestGame = { margin, winner: winner.member.displayName, loser: loser.member.displayName, score: `${winScore.toFixed(1)}-${loseScore.toFixed(1)}` };
      }
    }

    // Generate markdown newsletter
    let newsletter = `# ${league?.name ?? "League"} — Week ${weekNumber} Recap\n`;
    newsletter += `### ${season?.year ?? ""} Season\n\n`;
    newsletter += `---\n\n`;

    // Scoreboard
    newsletter += `## 📊 Scoreboard\n\n`;
    for (const m of matchups) {
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      const homeWin = hs > as_;
      newsletter += `${homeWin ? "**" : ""}${m.homeTeam.name} (${m.homeTeam.member.displayName})${homeWin ? "**" : ""} ${hs.toFixed(1)}`;
      newsletter += ` — `;
      newsletter += `${!homeWin ? "**" : ""}${m.awayTeam.name} (${m.awayTeam.member.displayName})${!homeWin ? "**" : ""} ${as_.toFixed(1)}\n\n`;
    }

    // Highlights
    newsletter += `## 🌟 Week ${weekNumber} Highlights\n\n`;
    newsletter += `🔥 **High Score:** ${highScore.name} (${highScore.team}) — ${highScore.score.toFixed(1)} pts\n\n`;
    if (lowScore.score < Infinity) {
      newsletter += `💀 **Low Score:** ${lowScore.name} (${lowScore.team}) — ${lowScore.score.toFixed(1)} pts\n\n`;
    }
    newsletter += `💪 **Biggest Win:** ${biggestBlowout.winner} crushed ${biggestBlowout.loser} (${biggestBlowout.score})\n\n`;
    if (closestGame.margin < Infinity) {
      newsletter += `😰 **Closest Game:** ${closestGame.winner} edged ${closestGame.loser} by ${closestGame.margin.toFixed(1)} pts (${closestGame.score})\n\n`;
    }

    newsletter += `---\n\n`;
    newsletter += `*Generated by TheLeague*\n`;

    // Also generate HTML version
    let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">`;
    html += `<h1 style="color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">${league?.name ?? "League"} — Week ${weekNumber} Recap</h1>`;
    html += `<p style="color: #666;">${season?.year ?? ""} Season</p>`;

    html += `<h2>📊 Scoreboard</h2>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    for (const m of matchups) {
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      const homeWin = hs > as_;
      html += `<tr style="border-bottom: 1px solid #eee;">`;
      html += `<td style="padding: 8px; ${homeWin ? "font-weight: bold;" : ""}">${m.homeTeam.name}</td>`;
      html += `<td style="padding: 8px; text-align: right; ${homeWin ? "color: #22c55e; font-weight: bold;" : ""}">${hs.toFixed(1)}</td>`;
      html += `<td style="padding: 8px; text-align: center;">—</td>`;
      html += `<td style="padding: 8px; text-align: left; ${!homeWin ? "color: #22c55e; font-weight: bold;" : ""}">${as_.toFixed(1)}</td>`;
      html += `<td style="padding: 8px; ${!homeWin ? "font-weight: bold;" : ""}">${m.awayTeam.name}</td>`;
      html += `</tr>`;
    }
    html += `</table>`;

    html += `<h2>🌟 Highlights</h2>`;
    html += `<ul>`;
    html += `<li>🔥 <strong>High Score:</strong> ${highScore.name} — ${highScore.score.toFixed(1)} pts</li>`;
    if (lowScore.score < Infinity) html += `<li>💀 <strong>Low Score:</strong> ${lowScore.name} — ${lowScore.score.toFixed(1)} pts</li>`;
    html += `<li>💪 <strong>Biggest Win:</strong> ${biggestBlowout.winner} over ${biggestBlowout.loser} (${biggestBlowout.score})</li>`;
    if (closestGame.margin < Infinity) html += `<li>😰 <strong>Closest:</strong> ${closestGame.winner} by ${closestGame.margin.toFixed(1)} (${closestGame.score})</li>`;
    html += `</ul>`;

    html += `<p style="color: #999; font-size: 12px; margin-top: 30px;">Generated by TheLeague</p>`;
    html += `</div>`;

    return NextResponse.json({
      newsletter,
      html,
      highlights: {
        highScore,
        lowScore: lowScore.score < Infinity ? lowScore : null,
        biggestBlowout,
        closestGame: closestGame.margin < Infinity ? closestGame : null,
      },
      matchupCount: matchups.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    console.error("Newsletter generation error:", error);
    return NextResponse.json({ error: "Failed to generate newsletter" }, { status: 500 });
  }
}
