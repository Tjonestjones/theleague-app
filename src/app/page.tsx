import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-2xl font-bold">
            TheLegue 🏈
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium hover:underline">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Your Fantasy Football Legacy,
            <br />
            <span className="text-primary">Forever.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Import your league history from Sleeper, ESPN, Yahoo, or Fleaflicker.
            Unlock powerful analytics, comprehensive record books, and never lose
            a season again.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/sign-up">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            7-day free trial • $36/year after • No credit card required
          </p>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything You Need to Preserve Your League
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                title="Multi-Platform Import"
                description="Seamlessly import data from Sleeper, ESPN, Yahoo, and Fleaflicker. All your history in one place."
                icon="📊"
              />
              <FeatureCard
                title="Comprehensive Record Book"
                description="50+ automated stats and records. Highest scores, win streaks, draft analysis, and more."
                icon="📖"
              />
              <FeatureCard
                title="Advanced Analytics"
                description="Track player performance, head-to-head history, and league trends over time."
                icon="📈"
              />
              <FeatureCard
                title="League Website"
                description="Build a custom public homepage for your league with drag-and-drop editing."
                icon="🌐"
              />
              <FeatureCard
                title="Automatic Syncs"
                description="Stay up-to-date with weekly background syncs during the season."
                icon="🔄"
              />
              <FeatureCard
                title="Commissioner Tools"
                description="Manage members, track finances, and keep your league organized."
                icon="⚙️"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-6 text-3xl font-bold">
              Ready to Build Your Legacy?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
              Join commissioners who trust TheLegue to preserve their
              league history forever.
            </p>
            <Button asChild size="lg">
              <Link href="/sign-up">Start Your Free Trial</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 TheLegue. Created by Thomas Jones.</p>
          <p className="mt-2">
            Not affiliated with NFL, ESPN, Yahoo, Sleeper, or Fleaflicker.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
