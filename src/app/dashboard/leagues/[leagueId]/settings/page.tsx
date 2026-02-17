"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeagueSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "PRIVATE",
  });

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.league) {
          setFormData({
            name: data.league.name,
            description: data.league.description ?? "",
            visibility: data.league.visibility,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update league");
        return;
      }

      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>League Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              >
                <option value="PRIVATE">Private</option>
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
              </select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/leagues/${leagueId}`)}
              >
                Back to League
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
