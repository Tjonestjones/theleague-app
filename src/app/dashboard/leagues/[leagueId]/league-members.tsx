"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MemberData {
  id: string;
  displayName: string;
  email: string;
  role: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

export function LeagueMembers({
  leagueId,
  members,
  isCommissioner,
}: {
  leagueId: string;
  members: MemberData[];
  isCommissioner: boolean;
}) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInviteUrl("");

    try {
      const res = await fetch(`/api/leagues/${leagueId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create invite");
        return;
      }

      setInviteUrl(data.inviteUrl);
      setEmail("");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      COMMISSIONER: "bg-yellow-100 text-yellow-800",
      CO_COMMISSIONER: "bg-blue-100 text-blue-800",
      MEMBER: "bg-gray-100 text-gray-700",
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${colors[role] ?? colors.MEMBER}`}>
        {role.replace("_", " ")}
      </span>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Members</h2>

      <div className="border rounded-lg divide-y">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {m.imageUrl ? (
                <img src={m.imageUrl} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                  {m.displayName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium">{m.displayName}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
            </div>
            {roleBadge(m.role)}
          </div>
        ))}
      </div>

      {isCommissioner && (
        <div className="mt-6 border rounded-lg p-4">
          <h3 className="font-medium mb-3">Invite a Member</h3>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="member@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? "..." : "Generate Invite Link"}
            </Button>
          </form>

          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}

          {inviteUrl && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700 mb-2">Invite link generated! Share it with the member:</p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-sm" />
                <Button variant="outline" onClick={copyLink} type="button">
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
