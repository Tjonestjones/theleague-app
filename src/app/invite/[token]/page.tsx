"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<"loading" | "ready" | "accepting" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [leagueName, setLeagueName] = useState("");

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setError(data.error);
        } else {
          setLeagueName(data.leagueName);
          setStatus("ready");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Failed to load invite");
      });
  }, [token]);

  const handleAccept = async () => {
    setStatus("accepting");
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error || "Failed to accept invite");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        router.push(`/dashboard/leagues/${data.leagueId}`);
      }, 1500);
    } catch {
      setStatus("error");
      setError("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🏈 League Invitation</CardTitle>
          {status === "ready" && (
            <CardDescription>You&apos;ve been invited to join <strong>{leagueName}</strong></CardDescription>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && <p className="text-gray-500">Loading invite...</p>}

          {status === "ready" && (
            <div className="space-y-4">
              <p className="text-gray-600">Click below to accept and join the league.</p>
              <Button onClick={handleAccept} className="w-full">
                Accept Invitation
              </Button>
            </div>
          )}

          {status === "accepting" && <p className="text-gray-500">Joining league...</p>}

          {status === "success" && (
            <div className="text-green-600">
              <p className="text-lg font-medium">🎉 Welcome to {leagueName}!</p>
              <p className="text-sm mt-1">Redirecting to your league...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-red-600">{error}</p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
