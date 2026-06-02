import { SubscriptionGate } from "@/components/subscription-gate";
import { prisma } from "@/lib/db";

export default async function NewsletterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
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
