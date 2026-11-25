import { requireLeagueMember } from "@/lib/auth";

// Settings is a client page; this server layout keeps non-members out.
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  await requireLeagueMember(leagueId);
  return <>{children}</>;
}
