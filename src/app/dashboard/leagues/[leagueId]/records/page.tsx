import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRecordBook } from "@/lib/records";
import Link from "next/link";

export default async function RecordBookPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true },
  });

  if (!league) return <div>League not found</div>;

  const records = await getRecordBook(leagueId);

  // Group by category
  const categories: Map<string, typeof records> = new Map();
  for (const r of records) {
    if (!categories.has(r.category)) categories.set(r.category, []);
    categories.get(r.category)!.push(r);
  }

  const categoryIcons: Record<string, string> = {
    Scoring: "🎯",
    Matchups: "⚔️",
    Season: "📅",
    Streaks: "🔥",
    "All-Time": "🏆",
    "Top Scores": "📈",
    "Bottom Scores": "📉",
    Luck: "🍀",
  };

  return (
    <div className="space-y-8">
      {/* Header - ESPN Style */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary p-6 rounded-lg">
        <Link href={`/dashboard/leagues/${leagueId}`} className="text-sm font-semibold text-primary hover:text-accent transition-colors">
          ← Back to {league.name}
        </Link>
        <h1 className="text-4xl font-bold mt-2">🏆 Record Book</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          <span className="font-bold text-foreground">{records.length}</span> records across <span className="font-bold text-foreground">{categories.size}</span> categories
        </p>
      </div>

      {records.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-16 text-center">
          <span className="text-6xl mb-4 block">📊</span>
          <p className="text-2xl font-bold mb-3">No records yet</p>
          <p className="text-muted-foreground text-lg">Import some seasons and the record book will populate automatically.</p>
        </div>
      ) : (
        Array.from(categories.entries()).map(([category, recs]) => (
          <div key={category} className="space-y-4">
            {/* Category Header with Icon Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{categoryIcons[category] ?? "📊"}</span>
              <h2 className="text-2xl font-bold text-foreground">{category}</h2>
              <span className="text-sm font-semibold text-muted-foreground">({recs.length})</span>
            </div>
            
            {/* Records Grid - ESPN Style Cards */}
            <div className="grid gap-4">
              {recs.map((r, i) => (
                <div key={i} className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all group">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{r.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{r.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-5xl font-bold text-primary mb-2">{r.value}</p>
                      <p className="text-sm font-bold text-foreground bg-muted px-3 py-1 rounded-full inline-block">{r.holder}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
