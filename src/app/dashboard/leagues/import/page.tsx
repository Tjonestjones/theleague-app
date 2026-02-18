"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ImportPlatformSelect() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("leagueId");

  const platforms = [
    {
      name: "ESPN",
      slug: "import-espn",
      icon: "🏈",
      desc: "Requires ESPN cookies (espn_s2 + SWID)",
      auth: "Cookie-based",
    },
    {
      name: "Sleeper",
      slug: "import-sleeper",
      icon: "😴",
      desc: "No authentication needed — just your league ID",
      auth: "Public API",
    },
    {
      name: "Yahoo",
      slug: "import-yahoo",
      icon: "🟣",
      desc: "Requires Yahoo OAuth login",
      auth: "OAuth 2.0",
    },
    {
      name: "Fleaflicker",
      slug: "import-fleaflicker",
      icon: "🪲",
      desc: "No authentication needed — just your league ID",
      auth: "Public API",
    },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Import League Data</h1>
      <p className="text-gray-500 mb-8">Choose your fantasy football platform to import from.</p>

      {!leagueId && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
          ⚠️ No league selected. <Link href="/dashboard/leagues/create" className="underline font-medium">Create a league first</Link>.
        </div>
      )}

      <div className="grid gap-4">
        {platforms.map((p) => (
          <Link
            key={p.slug}
            href={`/dashboard/leagues/${p.slug}${leagueId ? `?leagueId=${leagueId}` : ""}`}
          >
            <div className="border rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{p.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.desc}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {p.auth}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
