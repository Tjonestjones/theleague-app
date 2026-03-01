import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const steps = [
    {
      num: 1,
      icon: "🎯",
      title: "Choose Your Platform",
      desc: "We support ESPN, Sleeper, Yahoo, and Fleaflicker. Pick the platform where your league lives.",
      color: "from-red-600 to-red-700",
      border: "border-red-500/30",
    },
    {
      num: 2,
      icon: "📥",
      title: "Import Your League",
      desc: "Enter your league ID and let us pull all your historical data. Takes just a few minutes.",
      color: "from-emerald-600 to-green-600",
      border: "border-emerald-500/30",
    },
    {
      num: 3,
      icon: "🏆",
      title: "Explore Your History",
      desc: "View all-time standings, record books, member stats, and generate newsletters. All in one place.",
      color: "from-yellow-600 to-amber-600",
      border: "border-yellow-500/30",
    },
  ];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-900 opacity-90"></div>
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.05) 2px, transparent 2px),
                           linear-gradient(90deg, rgba(255,255,255,.05) 2px, transparent 2px)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      <div className="max-w-3xl w-full relative z-10 space-y-10">
        {/* Welcome */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-full px-6 py-3 mb-8 shadow-2xl">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-white font-bold text-sm tracking-wider uppercase">Welcome aboard!</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-black text-white tracking-tighter mb-6 drop-shadow-2xl">
            Welcome to<br/>
            <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
              TheLeague
            </span>
            ! 🏈
          </h1>
          <p className="text-2xl text-white/90 font-semibold">
            Let&apos;s get your fantasy football history preserved forever.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-10 shadow-2xl space-y-8">
          <h2 className="text-3xl font-black text-white text-center mb-8">
            Get Started in 3 Easy Steps
          </h2>

          {steps.map((step) => (
            <div key={step.num} className="flex gap-6 items-start">
              <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-xl border-2 ${step.border}`}>
                <span className="text-3xl">{step.icon}</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-2">{step.title}</h3>
                <p className="text-white/70 font-semibold leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-6">
          <Link href="/dashboard/leagues/import">
            <button className="group relative px-16 py-7 bg-white text-emerald-700 rounded-2xl font-black text-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110 hover:-rotate-1">
              <span className="relative z-10">Import Your First League 🚀</span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="absolute inset-0 flex items-center justify-center z-0 font-black text-2xl text-transparent group-hover:text-white transition-all duration-300">
                Import Your First League 🚀
              </span>
            </button>
          </Link>
          <p className="text-white/60 font-semibold">
            <Link href="/dashboard" className="underline hover:text-white transition-colors">
              Skip for now
            </Link>
            {" "}— you can always import later
          </p>
        </div>

        {/* Help Links */}
        <div className="pt-8 border-t border-white/20 text-center">
          <p className="text-white/50 font-semibold mb-4">Need help? We&apos;ve got you covered:</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: "📘", label: "ESPN Guide", href: "/docs/espn" },
              { icon: "📗", label: "Sleeper Guide", href: "/docs/sleeper" },
              { icon: "📙", label: "Yahoo Guide", href: "/docs/yahoo" },
              { icon: "📕", label: "Fleaflicker Guide", href: "/docs/fleaflicker" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white/80 font-bold text-sm hover:bg-white/20 hover:text-white transition-all">
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
