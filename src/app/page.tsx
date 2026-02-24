import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold tracking-tight mb-6">
          Your League&apos;s History,{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Forever</span> 🏈
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Import your fantasy football league from ESPN, Sleeper, Yahoo, or Fleaflicker.
          Get all-time standings, a record book, career stats, and a beautiful public league page.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <SignedOut>
            <Link href="/sign-up">
              <button className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-accent font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                Start Free Trial
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="px-8 py-4 border-2 border-border rounded-lg hover:bg-muted font-medium text-lg transition-colors">
                Sign In
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <button className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-accent font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                Go to Dashboard
              </button>
            </Link>
          </SignedIn>
        </div>
        <p className="text-sm text-muted-foreground mt-4">7-day free trial • $36/year • No credit card required to start</p>
      </section>

      {/* Screenshots / Demo Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-4">See TheLeague in Action</h2>
          <p className="text-center text-muted-foreground mb-12">ESPN-quality tools for your league history</p>
          
          <div className="space-y-16">
            {/* Dashboard Preview */}
            <div className="bg-card rounded-xl p-8 shadow-lg border-2 border-border hover:border-primary/50 transition-colors">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 text-xs font-bold text-primary-foreground bg-primary rounded-full uppercase tracking-wide">Dashboard</span>
                <h3 className="text-3xl font-bold mt-3">Your League Command Center</h3>
              </div>
              <div className="bg-muted rounded-lg aspect-video flex items-center justify-center border-2 border-border">
                <span className="text-6xl">📸</span>
              </div>
              <p className="mt-6 text-muted-foreground text-lg">
                View all your leagues, quick stats, and recent activity at a glance. ESPN-inspired layout with your data.
              </p>
            </div>

            {/* Record Book Preview */}
            <div className="bg-card rounded-xl p-8 shadow-lg border-2 border-border hover:border-primary/50 transition-colors">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 text-xs font-bold text-primary-foreground bg-accent rounded-full uppercase tracking-wide">Record Book</span>
                <h3 className="text-3xl font-bold mt-3">50+ Automated Records</h3>
              </div>
              <div className="bg-muted rounded-lg aspect-video flex items-center justify-center border-2 border-border">
                <span className="text-6xl">🏆</span>
              </div>
              <p className="mt-6 text-muted-foreground text-lg">
                Highest scores, longest streaks, biggest blowouts, and more—automatically tracked forever with ESPN-style stats.
              </p>
            </div>

            {/* Public League Page Preview */}
            <div className="bg-card rounded-xl p-8 shadow-lg border-2 border-border hover:border-primary/50 transition-colors">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 text-xs font-bold text-primary-foreground bg-primary rounded-full uppercase tracking-wide">Public League Page</span>
                <h3 className="text-3xl font-bold mt-3">Beautiful League Website</h3>
              </div>
              <div className="bg-muted rounded-lg aspect-video flex items-center justify-center border-2 border-border">
                <span className="text-6xl">🌐</span>
              </div>
              <p className="mt-6 text-muted-foreground text-lg">
                A shareable public page with standings, champions, and records—no login required. Your league, your brand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-4">Everything Your League Needs</h2>
          <p className="text-center text-muted-foreground mb-12">Professional-grade tools inspired by ESPN Fantasy</p>
          <div className="grid md:grid-cols-3 gap-6">
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
              <div key={feature.title} className="bg-card rounded-xl p-6 border-2 border-border hover:border-primary/50 hover:shadow-lg transition-all group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
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
      <section className="bg-muted/30 py-20">
        <div className="max-w-md mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground mb-8">One league, one price, unlimited history</p>
          <div className="bg-card rounded-2xl p-8 border-4 border-primary shadow-2xl">
            <div className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold mb-4">
              THE LEAGUE PRO
            </div>
            <p className="text-6xl font-bold mb-2 text-primary">$36</p>
            <p className="text-muted-foreground mb-8 text-lg">/year per league</p>
            <ul className="text-left space-y-3 mb-8">
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
                <li key={item} className="flex items-center gap-3 text-foreground">
                  <span className="text-primary text-xl font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <SignedOut>
              <Link href="/sign-up">
                <button className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-accent font-bold text-lg shadow-lg hover:shadow-xl transition-all">
                  Start Free Trial
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-accent font-bold text-lg shadow-lg hover:shadow-xl transition-all">
                  Go to Dashboard
                </button>
              </Link>
            </SignedIn>
            <p className="text-xs text-muted-foreground mt-4">Commissioner pays for the whole league. That&apos;s it.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-b from-background to-muted/30">
        <h2 className="text-4xl font-bold mb-4">Ready to Preserve Your Legacy?</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">Your league deserves better than a forgotten ESPN page. Build something that lasts forever.</p>
        <SignedOut>
          <Link href="/sign-up">
            <button className="px-10 py-5 bg-primary text-primary-foreground rounded-lg hover:bg-accent font-bold text-xl shadow-2xl hover:shadow-primary/50 transition-all">
              Get Started Free →
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
