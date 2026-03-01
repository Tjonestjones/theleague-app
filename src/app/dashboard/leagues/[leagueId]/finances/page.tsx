"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
    DUES: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PAYOUT: "bg-green-500/20 text-green-400 border-green-500/30",
    FINE: "bg-red-500/20 text-red-400 border-red-500/30",
    OTHER: "bg-slate-700/50 text-slate-400 border-slate-600/30",
  };

  const statusColors: Record<string, string> = {
    PAID: "bg-green-500/20 text-green-400 border-green-500/30",
    UNPAID: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    WAIVED: "bg-slate-700/50 text-slate-500 border-slate-600/30",
  };

  const summaryCards = summary ? [
    { label: "Total Dues", value: `$${summary.totalDues.toFixed(2)}`, color: "emerald", icon: "💰" },
    { label: "Collected", value: `$${summary.totalCollected.toFixed(2)}`, color: "green", icon: "✅" },
    { label: "Outstanding", value: `$${summary.totalOwed.toFixed(2)}`, color: "yellow", icon: "⏳" },
    { label: "Payouts", value: `$${summary.totalPayouts.toFixed(2)}`, color: "blue", icon: "💸" },
    { label: "Fines", value: `$${summary.totalFines.toFixed(2)}`, color: "red", icon: "⚠️" },
  ] : [];

  const colorClasses: Record<string, string> = {
    emerald: "from-emerald-900/30 to-green-900/30 border-emerald-500/20 hover:border-emerald-500/50",
    green: "from-green-900/30 to-emerald-900/30 border-green-500/20 hover:border-green-500/50",
    yellow: "from-yellow-900/30 to-amber-900/30 border-yellow-500/20 hover:border-yellow-500/50",
    blue: "from-blue-900/30 to-indigo-900/30 border-blue-500/20 hover:border-blue-500/50",
    red: "from-red-900/30 to-orange-900/30 border-red-500/20 hover:border-red-500/50",
  };

  const textColors: Record<string, string> = {
    emerald: "text-emerald-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    red: "text-red-400",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">💰</div>
          <p className="text-xl text-slate-400 font-semibold">Loading finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 md:p-12 space-y-10">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-emerald-700/10 to-green-900/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-green-500/30 rounded-3xl p-10 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <Link href={`/dashboard/leagues/${leagueId}`} className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-bold mb-4 transition-colors">
                <span className="text-2xl">←</span>
                <span>Back to League</span>
              </Link>
              <h1 className="text-6xl md:text-7xl font-black tracking-tight">💰 Finances</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuesGen(!showDuesGen)}
                className="px-6 py-3 bg-blue-500/20 border-2 border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/30 hover:border-blue-500/50 font-bold transition-all"
              >
                Generate Dues
              </button>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="group relative px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:scale-105"
              >
                + Add Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-green-500/20 border-2 border-green-500/30 rounded-2xl text-green-400 font-bold">{message}</div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className={`group relative bg-gradient-to-br ${colorClasses[card.color]} backdrop-blur-xl rounded-2xl p-6 text-center border-2 transition-all duration-500 transform hover:scale-105 shadow-xl`}>
              <span className="text-3xl block mb-2">{card.icon}</span>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">{card.label}</p>
              <p className={`text-3xl font-black ${textColors[card.color]}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Generate Dues Form */}
      {showDuesGen && (
        <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-xl border-2 border-blue-500/30 rounded-2xl p-6">
          <h3 className="font-black text-xl text-blue-400 mb-4">Generate Dues for All Members</h3>
          <form onSubmit={handleGenerateDues} className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={duesForm.amount}
                onChange={(e) => setDuesForm({ ...duesForm, amount: e.target.value })}
                placeholder="50.00"
                required
                className="h-12 w-36 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Year</label>
              <input
                type="number"
                value={duesForm.year}
                onChange={(e) => setDuesForm({ ...duesForm, year: e.target.value })}
                required
                className="h-12 w-28 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
              <input
                type="date"
                value={duesForm.dueDate}
                onChange={(e) => setDuesForm({ ...duesForm, dueDate: e.target.value })}
                className="h-12 w-44 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
            <button type="submit" className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-blue-500/50 shadow-lg transition-all">
              Generate
            </button>
            <button type="button" onClick={() => setShowDuesGen(false)} className="h-12 px-6 bg-slate-700/50 border-2 border-slate-600/30 text-slate-400 rounded-xl font-bold hover:bg-slate-600/50 transition-all">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Add Entry Form */}
      {showAdd && (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/30 rounded-2xl p-6">
          <h3 className="font-black text-xl text-emerald-400 mb-4">Add Finance Entry</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Type</label>
              <select
                className="h-12 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                required
                className="h-12 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Year</label>
              <input
                type="number"
                value={newEntry.year}
                onChange={(e) => setNewEntry({ ...newEntry, year: e.target.value })}
                required
                className="h-12 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Member</label>
              <select
                className="h-12 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Description</label>
              <input
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="Optional note"
                className="h-12 w-full rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:shadow-emerald-500/50 shadow-lg transition-all">
                Add
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="h-12 px-4 bg-slate-700/50 border-2 border-slate-600/30 text-slate-400 rounded-xl font-bold hover:bg-slate-600/50 transition-all">
                ✕
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select
          className="h-10 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="">All Years</option>
          {[...new Set(finances.map((f) => f.year))].sort((a, b) => b - a).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 px-4 text-white font-bold focus:border-emerald-500/50 focus:outline-none transition-colors"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="DUES">Dues</option>
          <option value="PAYOUT">Payouts</option>
          <option value="FINE">Fines</option>
          <option value="OTHER">Other</option>
        </select>
        <span className="text-sm text-slate-500 font-bold">{finances.length} entries</span>
      </div>

      {/* Finance Table */}
      {finances.length === 0 ? (
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-dashed border-green-500/30 rounded-3xl p-16 text-center shadow-2xl">
          <div className="text-9xl mb-6">💰</div>
          <h3 className="text-4xl font-black mb-4 text-white">No Finance Entries Yet</h3>
          <p className="text-xl text-slate-400 font-semibold">Generate dues or add individual entries above.</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-green-500/20 shadow-2xl">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b-2 border-green-500/20">
              <tr>
                <th className="text-left px-6 py-5 font-black text-green-400 uppercase tracking-wider text-sm">Type</th>
                <th className="text-left px-6 py-5 font-black text-green-400 uppercase tracking-wider text-sm">Member</th>
                <th className="text-left px-6 py-5 font-black text-green-400 uppercase tracking-wider text-sm">Description</th>
                <th className="text-right px-6 py-5 font-black text-green-400 uppercase tracking-wider text-sm">Amount</th>
                <th className="text-center px-6 py-5 font-black text-green-400 uppercase tracking-wider text-sm">Year</th>
                <th className="text-center px-6 py-5 font-black text-green-400 uppercase tracking-wider text-sm">Status</th>
                <th className="text-center px-6 py-5 font-black text-green-400 uppercase tracking-wider text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {finances.map((f) => (
                <tr key={f.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`text-xs px-3 py-1.5 rounded-full font-black uppercase tracking-wider border ${typeColors[f.type] ?? typeColors.OTHER}`}>
                      {f.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{f.memberName}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{f.description ?? "—"}</td>
                  <td className="text-right px-6 py-4 font-black text-white text-lg">
                    {f.type === "PAYOUT" ? "-" : ""}${f.amount.toFixed(2)}
                  </td>
                  <td className="text-center px-6 py-4 font-bold text-white">{f.year}</td>
                  <td className="text-center px-6 py-4">
                    <span className={`text-xs px-3 py-1.5 rounded-full font-black uppercase tracking-wider border ${statusColors[f.status] ?? ""}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="text-center px-6 py-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => togglePaid(f.id, f.status)}
                        className="px-3 py-1.5 bg-slate-700/50 border border-slate-600/30 rounded-lg hover:bg-slate-600/50 transition-all text-sm font-bold"
                        title={f.status === "PAID" ? "Mark unpaid" : "Mark paid"}
                      >
                        {f.status === "PAID" ? "↩️" : "✅"}
                      </button>
                      <button
                        onClick={() => deleteEntry(f.id)}
                        className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all text-sm font-bold text-red-400"
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
