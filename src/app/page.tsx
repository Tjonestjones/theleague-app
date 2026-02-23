import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold tracking-tight mb-6">
          Your League&apos;s History,{" "}
          <span className="text-blue-600">Forever</span> 🏈
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Import your fantasy football league from ESPN, Sleeper, Yahoo, or Fleaflicker.
          Get all-time standings, a record book, career stats, and a beautiful public league page.
        </p>
        <div className="flex gap-4 justify-center">
          <SignedOut>
            <Link href="/sign-up">
              <button className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg">
                Start Free Trial
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="px-8 py-4 border rounded-lg hover:bg-gray-50 font-medium text-lg">
                Sign In
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <button className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg">
                Go to Dashboard
              </button>
            </Link>
          </SignedIn>
        </div>
        <p className="text-sm text-gray-400 mt-4">7-day free trial • $36/year • No credit card required to start</p>
      </section>

      {/* Screenshots / Demo Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">See TheLeague in Action</h2>
          
          <div className="space-y-16">
            {/* Dashboard Preview */}
            <div className="bg-white rounded-xl p-8 shadow-lg border">
              <div className="mb-4">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Dashboard</span>
                <h3 className="text-2xl font-bold mt-1">Your League Command Center</h3>
              </div>
              <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center text-gray-400">
                📸 Dashboard Screenshot Coming Soon
              </div>
              <p className="mt-4 text-gray-600">
                View all your leagues, quick stats, and recent activity at a glance.
              </p>
            </div>

            {/* Record Book Preview */}
            <div className="bg-white rounded-xl p-8 shadow-lg border">
              <div className="mb-4">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Record Book</span>
                <h3 className="text-2xl font-bold mt-1">50+ Automated Records</h3>
              </div>
              <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center text-gray-400">
                📸 Record Book Screenshot Coming Soon
              </div>
              <p className="mt-4 text-gray-600">
                Highest scores, longest streaks, biggest blowouts, and more—automatically tracked forever.
              </p>
            </div>

            {/* Public League Page Preview */}
            <div className="bg-white rounded-xl p-8 shadow-lg border">
              <div className="mb-4">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Public League Page</span>
                <h3 className="text-2xl font-bold mt-1">Beautiful League Website</h3>
              </div>
              <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center text-gray-400">
                📸 League Page Screenshot Coming Soon
              </div>
              <p className="mt-4 text-gray-600">
                A shareable public page with standings, champions, and records—no login required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Everything Your League Needs</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📥",
                title: "One-Click Import",
                desc: "Import from ESPN, Sleeper, Yahoo, or Fleaflicker. All your history in minutes.",
              },
              {
                icon: "🏆",
                title: "Record Book",
                desc: "50+ automated records. Highest scores, longest streaks, biggest blowouts, and more.",
              },
              {
                icon: "📊",
                title: "All-Time Standings",
                desc: "See who really dominates with career stats, head-to-head records, and win percentages.",
              },
              {
                icon: "📈",
                title: "Charts & Analytics",
                desc: "Scoring trends, season comparisons, and performance visualizations for every member.",
              },
              {
                icon: "🌐",
                title: "Public League Page",
                desc: "A beautiful, shareable league website with standings, records, and season champions.",
              },
              {
                icon: "💰",
                title: "Finances & Dues",
                desc: "Track league dues, payouts, and fines. Generate dues for all members in one click.",
              },
              {
                icon: "📰",
                title: "Weekly Newsletters",
                desc: "Auto-generate weekly recap newsletters with highlights, scores, and trash talk ammo.",
              },
              {
                icon: "👥",
                title: "Member Management",
                desc: "Invite members, assign roles, and manage your league with commissioner tools.",
              },
              {
                icon: "🔒",
                title: "Your Data, Forever",
                desc: "We store your history permanently. Even if ESPN or Sleeper deletes it, you won't lose a thing.",
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-xl p-6 border hover:shadow-sm transition-shadow">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="font-semibold text-lg mt-3 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Import From Anywhere</h2>
          <p className="text-gray-500 mb-10">We support the 4 biggest fantasy football platforms.</p>
          <div className="flex gap-8 justify-center flex-wrap">
            {[
              { name: "ESPN", icon: "🏈" },
              { name: "Sleeper", icon: "😴" },
              { name: "Yahoo", icon: "🟣" },
              { name: "Fleaflicker", icon: "🪲" },
            ].map((p) => (
              <div key={p.name} className="text-center">
                <span className="text-4xl">{p.icon}</span>
                <p className="font-medium mt-2">{p.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-md mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8">Simple Pricing</h2>
          <div className="bg-white rounded-xl p-8 border-2 border-blue-600">
            <p className="text-sm text-blue-600 font-medium mb-2">THE LEAGUE PRO</p>
            <p className="text-5xl font-bold mb-1">$36</p>
            <p className="text-gray-500 mb-6">/year per league</p>
            <ul className="text-left space-y-3 mb-8 text-sm">
              {[
                "7-day free trial",
                "Unlimited seasons & history",
                "All 4 platform imports",
                "Full record book",
                "Public league website",
                "Finance tracking",
                "Newsletter generator",
                "Unlimited members",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {item}
                </li>
              ))}
            </ul>
            <SignedOut>
              <Link href="/sign-up">
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Start Free Trial
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Go to Dashboard
                </button>
              </Link>
            </SignedIn>
            <p className="text-xs text-gray-400 mt-3">Commissioner pays for the whole league. That&apos;s it.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Preserve Your Legacy?</h2>
        <p className="text-gray-500 mb-8">Your league deserves better than a forgotten ESPN page.</p>
        <SignedOut>
          <Link href="/sign-up">
            <button className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg">
              Get Started Free
            </button>
          </Link>
        </SignedOut>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-gray-400 text-sm">
        <p>© 2026 TheLeague. Created by Thomas Jones.</p>
      </footer>
    </div>
  );
}
