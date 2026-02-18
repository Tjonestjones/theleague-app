import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Yahoo OAuth 2.0 - Step 1: Redirect user to Yahoo for authorization
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Yahoo OAuth not configured. Set YAHOO_CLIENT_ID in .env.local" },
      { status: 500 }
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/yahoo/callback`;
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");

  const authUrl = new URL("https://api.login.yahoo.com/oauth2/request_auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "fspt-r");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
