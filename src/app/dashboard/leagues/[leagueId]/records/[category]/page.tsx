import { notFound, redirect } from "next/navigation";
import { RECORD_CATEGORIES, categoryRecords } from "@/lib/record-book/catalog";

// /records/<category> opens the category's first record
export default async function RecordCategoryPage({
  params,
}: {
  params: Promise<{ leagueId: string; category: string }>;
}) {
  const { leagueId, category } = await params;
  const cat = RECORD_CATEGORIES.find((c) => c.id === category);
  if (!cat) notFound();
  redirect(`/dashboard/leagues/${leagueId}/records/${cat.id}/${categoryRecords(cat)[0].id}`);
}
