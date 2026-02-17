"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateLeaguePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sport: "NFL",
    visibility: "PRIVATE",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create league");
        return;
      }

      router.push(`/dashboard/leagues/${data.league.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a New League</CardTitle>
          <CardDescription>
            Set up your fantasy football league and start importing your history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">League Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Sunday Night Legends"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="A brief description of your league"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <select
                id="sport"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              >
                <option value="NFL">NFL Fantasy Football</option>
                <option value="NBA">NBA Fantasy Basketball</option>
                <option value="MLB">MLB Fantasy Baseball</option>
                <option value="NHL">NHL Fantasy Hockey</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              >
                <option value="PRIVATE">Private – Members only</option>
                <option value="PUBLIC">Public – Anyone can view</option>
                <option value="UNLISTED">Unlisted – Accessible via link</option>
              </select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create League"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
