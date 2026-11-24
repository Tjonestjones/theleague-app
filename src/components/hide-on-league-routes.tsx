"use client";

import { usePathname } from "next/navigation";

/** Routes like /dashboard/leagues/<id>/... render their own league sidebar. */
const NOT_LEAGUE_IDS = new Set(["create", "import", "import-espn", "import-sleeper", "import-yahoo", "import-fleaflicker"]);

export function isLeagueRoute(pathname: string) {
  const m = /^\/dashboard\/leagues\/([^/]+)/.exec(pathname);
  return !!m && !NOT_LEAGUE_IDS.has(m[1]);
}

export function HideOnLeagueRoutes({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isLeagueRoute(pathname)) return null;
  return <>{children}</>;
}
