import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEra } from "@/lib/era";
import { LeagueSidebar } from "@/components/league-sidebar";

/** NFL season that is "live" right now: September onward belongs to this year. */
function currentNflSeason(now = new Date()) {
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const [user, league] = await Promise.all([
    getCurrentUser(),
    prisma.league.findUnique({ where: { id: leagueId }, select: { id: true, name: true } }),
  ]);

  // Unknown league or signed out: let the page render its own message/redirect.
  if (!league || !user) return <>{children}</>;

  const [era, membership] = await Promise.all([
    getEra(leagueId),
    prisma.member.findFirst({ where: { leagueId, userId: user.id }, select: { role: true } }),
  ]);

  return (
    <div className="md:flex min-h-screen">
      <LeagueSidebar
        leagueId={leagueId}
        leagueName={league.name}
        allYears={era.allYears}
        eraYears={era.years}
        eraFrom={era.from}
        eraTo={era.to}
        isCommissioner={membership?.role === "COMMISSIONER" || membership?.role === "CO_COMMISSIONER"}
        liveYear={currentNflSeason()}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
