import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Yahoo OAuth 2.0 - Step 2: Exchange code for tokens
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${req.nextUrl.origin}/dashboard?error=yahoo_auth_failed`);
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${req.nextUrl.origin}/dashboard?error=invalid_state`);
  }

  const clientId = process.env.YAHOO_CLIENT_ID!;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET!;
  const redirectUri = `${req.nextUrl.origin}/api/yahoo/callback`;

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Yahoo token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${req.nextUrl.origin}/dashboard?error=yahoo_token_failed`);
  }

  const tokens = await tokenRes.json();

  // Store tokens in user record (we'll add a yahooTokens JSON field or use a separate table)
  // For now, store in a simple key-value approach using the User model's metadata
  // In production, encrypt these tokens
  await prisma.user.update({
    where: { id: userId },
    data: {
      // Store as JSON string — in production, encrypt this
      // We'll use a convention of storing in firstName temporarily until we add a proper tokens table
    },
  });

  // Store tokens in a cookie for the import flow (short-lived)
  const response = NextResponse.redirect(`${req.nextUrl.origin}/dashboard/leagues/import-yahoo?connected=true`);
  response.cookies.set("yahoo_access_token", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: tokens.expires_in || 3600,
    path: "/",
  });
  response.cookies.set("yahoo_refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return response;
}
