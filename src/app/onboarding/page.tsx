import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white px-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Welcome */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold">
            Welcome to TheLeague! 🏈
          </h1>
          <p className="text-xl text-gray-300">
            Let's get your fantasy football history preserved forever.
          </p>
        </div>

        {/* Step-by-step Guide */}
        <div className="bg-gray-800 rounded-xl p-8 text-left space-y-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Get Started in 3 Easy Steps
          </h2>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Your Platform</h3>
              <p className="text-gray-300 text-sm">
                We support ESPN, Sleeper, Yahoo, and Fleaflicker. Pick the platform where your league lives.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Import Your League</h3>
              <p className="text-gray-300 text-sm">
                Enter your league ID and let us pull all your historical data. Takes just a few minutes.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Explore Your History</h3>
              <p className="text-gray-300 text-sm">
                View all-time standings, record books, member stats, and generate newsletters. All in one place.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Link href="/dashboard/leagues/import">
            <button className="w-full md:w-auto px-12 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg shadow-lg transition-all">
              Import Your First League 🚀
            </button>
          </Link>
          <p className="text-sm text-gray-400">
            <Link href="/dashboard" className="underline hover:text-white">
              Skip for now
            </Link>
            {" "}— you can always import later
          </p>
        </div>

        {/* Help Section */}
        <div className="pt-8 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-4">
            Need help? We've got you covered:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/docs/espn" className="text-blue-400 hover:underline">
              📘 ESPN Import Guide
            </Link>
            <Link href="/docs/sleeper" className="text-blue-400 hover:underline">
              📗 Sleeper Import Guide
            </Link>
            <Link href="/docs/yahoo" className="text-blue-400 hover:underline">
              📙 Yahoo Import Guide
            </Link>
            <Link href="/docs/fleaflicker" className="text-blue-400 hover:underline">
              📕 Fleaflicker Import Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
