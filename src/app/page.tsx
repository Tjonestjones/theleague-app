import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero - MASSIVE Impact Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-900 opacity-90"></div>
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.05) 2px, transparent 2px),
                             linear-gradient(90deg, rgba(255,255,255,.05) 2px, transparent 2px)`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 text-[200px] opacity-10 animate-pulse">🏈</div>
          <div className="absolute bottom-20 right-10 text-[200px] opacity-10 animate-pulse delay-500">🏆</div>
          <div className="absolute top-1/2 left-1/4 text-[150px] opacity-5 animate-bounce">📊</div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-full px-6 py-3 mb-8 shadow-2xl">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-white font-bold text-sm tracking-wider uppercase">The Future of Fantasy League History</span>
          </div>
          
          <h1 className="text-8xl md:text-9xl font-black tracking-tighter mb-8 text-white leading-none drop-shadow-2xl">
            Your League&apos;s<br/>
            <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-500 bg-clip-text text-transparent animate-pulse">
              LEGACY
            </span>
            <br/>Lives Forever
          </h1>
          
          <p className="text-3xl text-white/95 max-w-3xl mx-auto mb-12 font-semibold leading-relaxed drop-shadow-lg">
            Stop losing your fantasy football history to ESPN&apos;s memory dumps. 
            <span className="text-yellow-300"> Import, preserve, and showcase</span> every season, 
            every record, every champion—forever.
          </p>
          
          <div className="flex gap-6 justify-center flex-wrap mb-8">
            <SignedOut>
              <Link href="/sign-up">
                <button className="group relative px-12 py-6 bg-white text-emerald-700 rounded-2xl font-black text-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110 hover:-rotate-1">
                  <span className="relative z-10">Start Free Trial</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="absolute inset-0 flex items-center justify-center z-0 font-black text-2xl text-transparent group-hover:text-white transition-all duration-300">
                    Start Free Trial
                  </span>
                </button>
              </Link>
              <Link href="/sign-in">
                <button className="px-12 py-6 border-4 border-white/40 backdrop-blur-xl rounded-2xl hover:bg-white/20 font-black text-2xl text-white transition-all duration-300 transform hover:scale-105">
                  Sign In
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="group relative px-12 py-6 bg-white text-emerald-700 rounded-2xl font-black text-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110 hover:-rotate-1">
                  <span className="relative z-10">Open Dashboard</span>
                </button>
              </Link>
            </SignedIn>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-white/90 font-bold text-lg">
            <div className="flex items-center gap-2">
              <span className="text-3xl">✓</span>
              <span>7-Day Free Trial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">✓</span>
              <span>$36/Year</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">✓</span>
              <span>No Credit Card</span>
            </div>
          </div>
          
          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-8 h-12 border-4 border-white/40 rounded-full flex items-start justify-center pt-2">
              <div className="w-2 h-3 bg-white/60 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots / Demo Section */}
      <section className="py-32 bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <span className="inline-block px-6 py-2 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full text-emerald-400 font-bold text-sm uppercase tracking-wider mb-6">
              Product Showcase
            </span>
            <h2 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
              See TheLeague in Action
            </h2>
            <p className="text-2xl text-slate-400 max-w-3xl mx-auto font-semibold">
              ESPN-quality tools built specifically for preserving your league&apos;s legacy
            </p>
          </div>
          
          <div className="space-y-16">
            {/* Dashboard Preview */}
            <div className="group relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-10 border-2 border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-500 transform hover:scale-105 hover:-rotate-1 shadow-2xl hover:shadow-emerald-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 mb-8">
                <div className="inline-flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-5 py-2 mb-4">
                  <span className="text-2xl">📊</span>
                  <span className="font-black text-emerald-400 uppercase tracking-wider text-sm">Dashboard</span>
                </div>
                <h3 className="text-5xl font-black text-white mb-3 group-hover:text-emerald-400 transition-colors">
                  Your League Command Center
                </h3>
                <p className="text-slate-400 text-xl font-semibold">
                  View all your leagues, quick stats, and recent activity at a glance
                </p>
              </div>
              
              <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl aspect-video flex items-center justify-center border-4 border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)]"></div>
                <span className="text-9xl relative z-10 group-hover:scale-110 transition-transform">📸</span>
              </div>
            </div>

            {/* Record Book Preview */}
            <div className="group relative bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-xl rounded-3xl p-10 border-2 border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500 transform hover:scale-105 hover:rotate-1 shadow-2xl hover:shadow-yellow-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 mb-8">
                <div className="inline-flex items-center gap-3 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-5 py-2 mb-4">
                  <span className="text-2xl">🏆</span>
                  <span className="font-black text-yellow-400 uppercase tracking-wider text-sm">Record Book</span>
                </div>
                <h3 className="text-5xl font-black text-white mb-3 group-hover:text-yellow-400 transition-colors">
                  50+ Automated Records
                </h3>
                <p className="text-slate-400 text-xl font-semibold">
                  Highest scores, longest streaks, biggest blowouts—all tracked forever
                </p>
              </div>
              
              <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl aspect-video flex items-center justify-center border-4 border-yellow-500/20 group-hover:border-yellow-500/40 transition-colors overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(234,179,8,0.1),transparent)]"></div>
                <span className="text-9xl relative z-10 group-hover:scale-110 transition-transform">🏆</span>
              </div>
            </div>

            {/* Public League Page Preview */}
            <div className="group relative bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-xl rounded-3xl p-10 border-2 border-blue-500/20 hover:border-blue-500/50 transition-all duration-500 transform hover:scale-105 hover:-rotate-1 shadow-2xl hover:shadow-blue-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 mb-8">
                <div className="inline-flex items-center gap-3 bg-blue-500/20 border border-blue-500/30 rounded-full px-5 py-2 mb-4">
                  <span className="text-2xl">🌐</span>
                  <span className="font-black text-blue-400 uppercase tracking-wider text-sm">Public Page</span>
                </div>
                <h3 className="text-5xl font-black text-white mb-3 group-hover:text-blue-400 transition-colors">
                  Beautiful League Website
                </h3>
                <p className="text-slate-400 text-xl font-semibold">
                  A shareable public page—no login required. Your league, your brand
                </p>
              </div>
              
              <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl aspect-video flex items-center justify-center border-4 border-blue-500/20 group-hover:border-blue-500/40 transition-colors overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent)]"></div>
                <span className="text-9xl relative z-10 group-hover:scale-110 transition-transform">🌐</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 bg-gradient-to-b from-black via-emerald-950/20 to-black relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-black mb-6 text-white">
              Everything Your League Needs
            </h2>
            <p className="text-2xl text-slate-400 max-w-3xl mx-auto font-semibold">
              Professional-grade tools that ESPN wishes they had
            </p>
          </div>
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
            ].map((feature, index) => (
              <div key={feature.title} 
                   className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-xl rounded-2xl p-8 border-2 border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-emerald-500/20"
                   style={{animationDelay: `${index * 100}ms`}}>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="text-6xl mb-6 group-hover:scale-125 transition-transform duration-500 group-hover:rotate-12">
                    {feature.icon}
                  </div>
                  <h3 className="font-black text-2xl mb-3 text-white group-hover:text-emerald-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-base leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-32 bg-gradient-to-b from-black to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_50%)]"></div>
        
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          <span className="inline-block px-6 py-2 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-full text-emerald-400 font-bold text-sm uppercase tracking-wider mb-6">
            Platform Integrations
          </span>
          <h2 className="text-6xl md:text-7xl font-black mb-6 text-white">Import From Anywhere</h2>
          <p className="text-2xl text-slate-400 mb-16 font-semibold max-w-2xl mx-auto">
            Seamless imports from the 4 biggest fantasy football platforms
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: "ESPN", icon: "🏈", color: "from-red-600 to-red-700", borderColor: "border-red-500/30 hover:border-red-500" },
              { name: "Sleeper", icon: "😴", color: "from-blue-600 to-blue-700", borderColor: "border-blue-500/30 hover:border-blue-500" },
              { name: "Yahoo", icon: "🟣", color: "from-purple-600 to-purple-700", borderColor: "border-purple-500/30 hover:border-purple-500" },
              { name: "Fleaflicker", icon: "🪲", color: "from-amber-600 to-amber-700", borderColor: "border-amber-500/30 hover:border-amber-500" },
            ].map((p) => (
              <div key={p.name} className={`group relative bg-gradient-to-br ${p.color} rounded-3xl p-10 border-2 ${p.borderColor} transition-all duration-500 transform hover:scale-110 hover:-rotate-3 shadow-2xl`}>
                <div className="absolute inset-0 bg-black/40 rounded-3xl group-hover:bg-black/20 transition-colors"></div>
                <div className="relative z-10">
                  <span className="text-8xl block mb-4 group-hover:scale-125 transition-transform duration-500">{p.icon}</span>
                  <p className="font-black text-2xl text-white">{p.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(16,185,129,0.2) 0%, transparent 50%),
                             radial-gradient(circle at 80% 80%, rgba(52,211,153,0.2) 0%, transparent 50%)`,
          }}></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "30px 30px"
          }}></div>
        </div>
        
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <span className="inline-block px-6 py-2 bg-white/20 backdrop-blur-xl border-2 border-white/30 rounded-full text-white font-bold text-sm uppercase tracking-wider mb-8">
            Simple, Transparent Pricing
          </span>
          <h2 className="text-6xl md:text-7xl font-black mb-6 text-white drop-shadow-2xl">
            One Price.<br/>Unlimited History.
          </h2>
          <p className="text-2xl text-white/90 mb-12 font-semibold">
            No hidden fees. No per-user charges. Just your league&apos;s legacy, preserved forever.
          </p>
          
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
            
            {/* Card */}
            <div className="relative bg-white rounded-[2.5rem] p-12 shadow-2xl transform group-hover:scale-105 transition-all duration-500">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-full font-black mb-8 uppercase tracking-wider shadow-lg text-sm">
                <span className="text-xl">👑</span>
                THE LEAGUE PRO
              </div>
              
              <div className="mb-10">
                <div className="flex items-start justify-center gap-2 mb-3">
                  <span className="text-3xl font-black text-slate-600 mt-3">$</span>
                  <span className="text-9xl font-black bg-gradient-to-br from-emerald-600 to-green-600 bg-clip-text text-transparent leading-none">36</span>
                </div>
                <p className="text-2xl text-slate-600 font-bold">/year per league</p>
              </div>
            <ul className="text-left space-y-4 mb-10">
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
                <li key={item} className="flex items-center gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-lg">✓</span>
                  <span className="text-slate-700 text-lg font-semibold">{item}</span>
                </li>
              ))}
            </ul>
            
            <SignedOut>
              <Link href="/sign-up">
                <button className="w-full px-8 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl hover:from-emerald-700 hover:to-green-700 font-black text-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 mb-4">
                  Start Your Free Trial →
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="w-full px-8 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl hover:from-emerald-700 hover:to-green-700 font-black text-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 mb-4">
                  Open Dashboard →
                </button>
              </Link>
            </SignedIn>
            
            <p className="text-sm text-slate-500 font-semibold">
              Commissioner pays once. Entire league benefits. Forever.
            </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 text-center bg-gradient-to-b from-black via-slate-950 to-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="text-6xl md:text-7xl font-black mb-8 text-white leading-tight">
            Ready to Preserve<br/>
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Your Legacy?
            </span>
          </h2>
          <p className="text-2xl text-slate-400 mb-12 max-w-2xl mx-auto font-semibold leading-relaxed">
            Stop losing history to ESPN&apos;s memory dumps. Your league deserves a permanent home.
          </p>
          <SignedOut>
            <Link href="/sign-up">
              <button className="group relative px-16 py-7 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110 overflow-hidden">
                <span className="relative z-10">Start Building Your Legacy →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>
          </SignedOut>
          
          <p className="mt-8 text-slate-500 font-semibold text-lg">
            7-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-slate-800 py-12 text-center">
        <p className="text-slate-600 font-semibold">© 2026 TheLeague. Built with 🏈 by Thomas Jones.</p>
      </footer>
    </div>
  );
}
