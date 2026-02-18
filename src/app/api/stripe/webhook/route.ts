import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST — handle Stripe webhook events
export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const body = await req.text();
    const sig = req.headers.get("stripe-signature")!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const leagueId = session.metadata?.leagueId;
        if (leagueId) {
          await prisma.league.update({
            where: { id: leagueId },
            data: {
              subscriptionStatus: "ACTIVE",
              trialEndsAt: null,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const leagueId = subscription.metadata?.leagueId;
        if (leagueId) {
          const status = subscription.status;
          let subStatus: "ACTIVE" | "EXPIRED" | "CANCELED" | "TRIAL" = "ACTIVE";
          if (status === "canceled" || status === "unpaid") subStatus = "CANCELED";
          else if (status === "past_due") subStatus = "EXPIRED";
          else if (status === "trialing") subStatus = "TRIAL";

          await prisma.league.update({
            where: { id: leagueId },
            data: { subscriptionStatus: subStatus },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const leagueId = (invoice as unknown as Record<string, Record<string, Record<string, string>>>)?.subscription_details?.metadata?.leagueId;
        if (leagueId) {
          await prisma.league.update({
            where: { id: leagueId },
            data: { subscriptionStatus: "EXPIRED" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
