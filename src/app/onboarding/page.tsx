import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="text-5xl">🏈</div>
        <h1 className="text-3xl font-bold">Welcome to TheLeague!</h1>
        <p className="text-gray-500 text-lg">
          Hey{user.firstName ? ` ${user.firstName}` : ""}! You&apos;re all set up. Let&apos;s get your league imported.
        </p>

        <div className="space-y-3 pt-4">
          <Link href="/dashboard/leagues/create">
            <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg">
              Create Your First League
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="w-full px-6 py-3 border rounded-lg hover:bg-gray-100 font-medium">
              Go to Dashboard
            </button>
          </Link>
        </div>

        <div className="pt-6 text-sm text-gray-400">
          <p>7-day free trial • $36/year after trial • Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
