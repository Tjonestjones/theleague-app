// Yahoo Fantasy Sports API helper

const YAHOO_API = "https://fantasysports.yahooapis.com/fantasy/v2";

// NFL game keys by year
const NFL_GAME_KEYS: Record<number, string> = {
  2024: "449",
  2023: "423",
  2022: "414",
  2021: "406",
  2020: "399",
  2019: "390",
  2018: "380",
  2017: "371",
  2016: "359",
  2015: "348",
};

export function getGameKey(year: number): string | null {
  return NFL_GAME_KEYS[year] ?? null;
}

export function getLeagueKey(year: number, leagueId: string): string | null {
  const gameKey = getGameKey(year);
  if (!gameKey) return null;
  return `${gameKey}.l.${leagueId}`;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  const clientId = process.env.YAHOO_CLIENT_ID!;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET!;

  const res = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function yahooFetch(
  path: string,
  accessToken: string,
  refreshToken?: string
): Promise<{ data: Record<string, unknown>; newAccessToken?: string } | null> {
  const url = `${YAHOO_API}${path}?format=json`;

  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // If token expired, try refreshing
  if (res.status === 401 && refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    if (!newTokens) return null;

    res = await fetch(url, {
      headers: { Authorization: `Bearer ${newTokens.access_token}` },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { data, newAccessToken: newTokens.access_token };
  }

  if (!res.ok) return null;
  const data = await res.json();
  return { data };
}
