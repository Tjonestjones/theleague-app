import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// POST — create a Stripe Checkout session for $36/year subscription
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const { leagueId } = await req.json();
    if (!leagueId) {
      return NextResponse.json({ error: "leagueId required" }, { status: 400 });
    }

    // Dynamic import to avoid errors when Stripe isn't installed
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TheLeague Pro — Annual",
              description: "Full league management, history, records, and public website",
            },
            unit_amount: 3600, // $36.00
            recurring: { interval: "year" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        leagueId,
      },
      success_url: `${req.nextUrl.origin}/dashboard/leagues/${leagueId}?subscribed=true`,
      cancel_url: `${req.nextUrl.origin}/dashboard/leagues/${leagueId}?subscribed=false`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: user.id, leagueId },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
