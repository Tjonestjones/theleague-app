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
      <div>
        <Link href={`/dashboard/leagues/${leagueId}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to {league.name}
        </Link>
        <h1 className="text-3xl font-bold mt-1">🏆 Record Book</h1>
        <p className="text-gray-500 mt-1">{records.length} records across {categories.size} categories</p>
      </div>

      {records.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-xl font-semibold mb-2">No records yet</p>
          <p className="text-gray-500">Import some seasons and the record book will populate automatically.</p>
        </div>
      ) : (
        Array.from(categories.entries()).map(([category, recs]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4">
              {categoryIcons[category] ?? "📊"} {category}
            </h2>
            <div className="grid gap-3">
              {recs.map((r, i) => (
                <div key={i} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{r.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{r.detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{r.value}</p>
                      <p className="text-sm font-medium">{r.holder}</p>
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
