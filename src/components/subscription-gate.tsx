import { getLeagueAccess } from "@/lib/auth";
import Link from "next/link";
import { UpgradeButton } from "./upgrade-button";

interface Props {
  leagueId: string;
  leagueName?: string;
  children: React.ReactNode;
}

/**
 * Server component — wraps any league sub-page.
 * Renders children if the league has an active subscription or valid trial.
 * Shows a full-page upgrade wall otherwise.
 */
export async function SubscriptionGate({ leagueId, leagueName, children }: Props) {
  const access = await getLeagueAccess(leagueId);

  if (!access.ok) {
    return <UpgradeWall leagueId={leagueId} leagueName={leagueName} reason={access.reason} />;
  }

  return <>{children}</>;
}

// ── Trial banner (rendered inside the page, not as a gate) ───────────────────

interface BannerProps {
  leagueId: string;
  daysLeft: number;
}

export function TrialBanner({ leagueId, daysLeft }: BannerProps) {
  const urgent = daysLeft <= 2;
  return (
    <div className={`flex items-center justify-between gap-4 px-6 py-3 text-sm font-bold border-b ${
      urgent
        ? "bg-red-500/8 border-red-500/20 text-red-400"
        : "bg-yellow-500/8 border-yellow-500/20 text-yellow-400"
    }`}>
      <span>
        {urgent
          ? `Trial expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — subscribe to keep access.`
          : `${daysLeft} days left in your free trial.`}
      </span>
      <UpgradeButton leagueId={leagueId} size="sm" />
    </div>
  );
}

// ── Upgrade wall ─────────────────────────────────────────────────────────────

function UpgradeWall({
  leagueId,
  leagueName,
  reason,
}: {
  leagueId: string;
  leagueName?: string;
  reason: "expired" | "canceled";
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-black tracking-tight mb-2">
          {reason === "canceled" ? "Subscription Canceled" : "Trial Ended"}
        </h1>
        {leagueName && (
          <p className="text-slate-500 text-sm font-medium mb-6">{leagueName}</p>
        )}

        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          {reason === "canceled"
            ? "Your subscription has been canceled. Reactivate to restore full access to your league history, record book, and all features."
            : "Your 7-day free trial has ended. Subscribe to keep your league data and unlock all features."}
        </p>

        {/* Pricing card */}
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 mb-6 text-left">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">TheLeague Pro</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-white">$36</span>
                <span className="text-slate-500 font-medium mb-1">/ year</span>
              </div>
            </div>
            <div className="h-1 w-8 rounded-full bg-emerald-500" />
          </div>
          <ul className="space-y-2">
            {[
              "Full league history, all seasons",
              "50+ record book entries",
              "Member stats & head-to-head",
              "Finances, newsletter, public page",
              "Unlimited imports",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400 font-medium">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <UpgradeButton leagueId={leagueId} size="lg" />

        <Link
          href="/dashboard"
          className="block mt-4 text-sm font-bold text-slate-600 hover:text-slate-400 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
