"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface FinanceEntry {
  id: string;
  type: string;
  amount: number;
  year: number;
  memberId: string | null;
  memberName: string;
  description: string | null;
  status: string;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
}

interface Summary {
  totalDues: number;
  totalCollected: number;
  totalOwed: number;
  totalPayouts: number;
  totalFines: number;
}

interface MemberOption {
  id: string;
  name: string;
}

export default function FinancesPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [finances, setFinances] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDuesGen, setShowDuesGen] = useState(false);
  const [filterYear, setFilterYear] = useState("");
  const [filterType, setFilterType] = useState("");
  const [message, setMessage] = useState("");

  const [newEntry, setNewEntry] = useState({
    type: "DUES",
    amount: "",
    year: new Date().getFullYear().toString(),
    memberId: "",
    description: "",
  });

  const [duesForm, setDuesForm] = useState({
    amount: "",
    year: new Date().getFullYear().toString(),
    dueDate: "",
  });

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterYear) params.set("year", filterYear);
    if (filterType) params.set("type", filterType);

    const res = await fetch(`/api/leagues/${leagueId}/finances?${params}`);
    const data = await res.json();
    setFinances(data.finances || []);
    setSummary(data.summary || null);
    setMembers(data.members || []);
    setLoading(false);
  }, [leagueId, filterYear, filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/leagues/${leagueId}/finances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });
    if (res.ok) {
      setShowAdd(false);
      setNewEntry({ type: "DUES", amount: "", year: new Date().getFullYear().toString(), memberId: "", description: "" });
      fetchData();
    }
  };

  const handleGenerateDues = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await fetch(`/api/leagues/${leagueId}/finances/generate-dues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duesForm),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
      setShowDuesGen(false);
      fetchData();
    } else {
      setMessage(data.error || "Failed");
    }
  };

  const togglePaid = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PAID" ? "UNPAID" : "PAID";
    await fetch(`/api/leagues/${leagueId}/finances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/leagues/${leagueId}/finances/${id}`, { method: "DELETE" });
    fetchData();
  };

  const typeColors: Record<string, string> = {
    DUES: "bg-blue-100 text-blue-800",
    PAYOUT: "bg-green-100 text-green-800",
    FINE: "bg-red-100 text-red-800",
    OTHER: "bg-gray-100 text-gray-800",
  };

  const statusColors: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    UNPAID: "bg-yellow-100 text-yellow-700",
    WAIVED: "bg-gray-100 text-gray-500",
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading finances...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/leagues/${leagueId}`} className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to League
          </Link>
          <h1 className="text-3xl font-bold mt-1">💰 Finances</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDuesGen(!showDuesGen)}>
            Generate Dues
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)}>+ Add Entry</Button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">{message}</div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Total Dues</p>
            <p className="text-xl font-bold">${summary.totalDues.toFixed(2)}</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Collected</p>
            <p className="text-xl font-bold text-green-600">${summary.totalCollected.toFixed(2)}</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Outstanding</p>
            <p className="text-xl font-bold text-yellow-600">${summary.totalOwed.toFixed(2)}</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Payouts</p>
            <p className="text-xl font-bold text-blue-600">${summary.totalPayouts.toFixed(2)}</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Fines</p>
            <p className="text-xl font-bold text-red-600">${summary.totalFines.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Generate Dues Form */}
      {showDuesGen && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="font-semibold mb-3">Generate Dues for All Members</h3>
          <form onSubmit={handleGenerateDues} className="flex gap-3 items-end flex-wrap">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={duesForm.amount}
                onChange={(e) => setDuesForm({ ...duesForm, amount: e.target.value })}
                placeholder="50.00"
                required
                className="w-32"
              />
            </div>
            <div>
              <Label>Year</Label>
              <Input
                type="number"
                value={duesForm.year}
                onChange={(e) => setDuesForm({ ...duesForm, year: e.target.value })}
                required
                className="w-24"
              />
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={duesForm.dueDate}
                onChange={(e) => setDuesForm({ ...duesForm, dueDate: e.target.value })}
                className="w-40"
              />
            </div>
            <Button type="submit">Generate</Button>
            <Button type="button" variant="outline" onClick={() => setShowDuesGen(false)}>Cancel</Button>
          </form>
        </div>
      )}

      {/* Add Entry Form */}
      {showAdd && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">Add Finance Entry</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div>
              <Label>Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newEntry.type}
                onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
              >
                <option value="DUES">Dues</option>
                <option value="PAYOUT">Payout</option>
                <option value="FINE">Fine</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Year</Label>
              <Input
                type="number"
                value={newEntry.year}
                onChange={(e) => setNewEntry({ ...newEntry, year: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Member</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newEntry.memberId}
                onChange={(e) => setNewEntry({ ...newEntry, memberId: e.target.value })}
              >
                <option value="">League-wide</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="Optional note"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Add</Button>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>✕</Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          className="h-9 rounded-md border px-3 text-sm"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="">All Years</option>
          {[...new Set(finances.map((f) => f.year))].sort((a, b) => b - a).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border px-3 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="DUES">Dues</option>
          <option value="PAYOUT">Payouts</option>
          <option value="FINE">Fines</option>
          <option value="OTHER">Other</option>
        </select>
        <span className="text-sm text-gray-500">{finances.length} entries</span>
      </div>

      {/* Finance Table */}
      {finances.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-xl font-semibold mb-2">No finance entries yet</p>
          <p className="text-gray-500">Generate dues or add individual entries above.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Member</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-center px-4 py-3 font-medium">Year</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {finances.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${typeColors[f.type] ?? typeColors.OTHER}`}>
                      {f.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{f.memberName}</td>
                  <td className="px-4 py-3 text-gray-500">{f.description ?? "—"}</td>
                  <td className="text-right px-4 py-3 font-medium">
                    {f.type === "PAYOUT" ? "-" : ""}${f.amount.toFixed(2)}
                  </td>
                  <td className="text-center px-4 py-3">{f.year}</td>
                  <td className="text-center px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[f.status] ?? ""}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => togglePaid(f.id, f.status)}
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                        title={f.status === "PAID" ? "Mark unpaid" : "Mark paid"}
                      >
                        {f.status === "PAID" ? "↩️" : "✅"}
                      </button>
                      <button
                        onClick={() => deleteEntry(f.id)}
                        className="text-xs px-2 py-1 border rounded hover:bg-red-50 text-red-600"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
