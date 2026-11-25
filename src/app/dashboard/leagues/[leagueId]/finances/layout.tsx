import { SubscriptionGate } from "@/components/subscription-gate";
import { prisma } from "@/lib/db";
import { requireLeagueMember } from "@/lib/auth";

export default async function FinancesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  await requireLeagueMember(leagueId);
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true },
  });

  return (
    <SubscriptionGate leagueId={leagueId} leagueName={league?.name}>
      {children}
    </SubscriptionGate>
  );
}
