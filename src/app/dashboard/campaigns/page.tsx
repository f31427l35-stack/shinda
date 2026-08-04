"use client";

import { useEffect, useState } from "react";
import { Plus, Trophy, Power } from "lucide-react";

type Campaign = {
  id: number;
  name: string;
  keyword: string;
  is_active: boolean;
  prize_description: string | null;
  entry_count: number;
  winner_count: number;
  created_at: string;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [prize, setPrize] = useState("");
  const [error, setError] = useState("");
  const [pickCount, setPickCount] = useState<Record<number, number>>({});
  const [pickResult, setPickResult] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/campaigns");
    const data = await res.json();
    setCampaigns(data.campaigns || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, keyword, prize_description: prize }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create campaign.");
      return;
    }
    setName("");
    setKeyword("");
    setPrize("");
    setShowForm(false);
    load();
  }

  async function toggleActive(c: Campaign) {
    await fetch(`/api/campaigns/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    load();
  }

  async function pickWinners(c: Campaign) {
    const count = pickCount[c.id] || 1;
    const res = await fetch(`/api/campaigns/${c.id}/pick-winners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPickResult((r) => ({ ...r, [c.id]: data.error || "Failed to pick winners." }));
      return;
    }
    setPickResult((r) => ({
      ...r,
      [c.id]: `Picked ${data.winners.length} winner(s): ${data.winners.map((w: any) => w.phone_number).join(", ")}`,
    }));
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-2xl font-semibold">Campaigns</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-amber-500 text-black text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={15} /> New campaign
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
          {error && <div className="bg-red-950 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-neutral-400 text-xs mb-1">Campaign name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none border border-neutral-700 focus:border-amber-500"
                placeholder="e.g. Weekend Giveaway" />
            </div>
            <div>
              <label className="block text-neutral-400 text-xs mb-1">Keyword (announced on air)</label>
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} required
                className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none border border-neutral-700 focus:border-amber-500"
                placeholder="e.g. WIN" />
            </div>
            <div>
              <label className="block text-neutral-400 text-xs mb-1">Prize description</label>
              <input value={prize} onChange={(e) => setPrize(e.target.value)}
                className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none border border-neutral-700 focus:border-amber-500"
                placeholder="e.g. Ksh 5,000 airtime" />
            </div>
          </div>
          <button type="submit" className="bg-amber-500 text-black text-sm font-medium px-4 py-2 rounded-lg">
            Create & activate
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-neutral-500">No campaigns yet. Create one to start taking USSD entries.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  <p className="text-neutral-500 text-sm">Keyword: <span className="text-amber-500 font-medium">{c.keyword}</span></p>
                  {c.prize_description && <p className="text-neutral-400 text-sm mt-1">{c.prize_description}</p>}
                </div>
                <button
                  onClick={() => toggleActive(c)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${
                    c.is_active ? "bg-green-950 text-green-400" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  <Power size={12} /> {c.is_active ? "Active" : "Inactive"}
                </button>
              </div>
              <div className="flex gap-6 text-sm text-neutral-400 mb-4">
                <span>{c.entry_count} entries</span>
                <span>{c.winner_count} winners drawn</span>
              </div>
              <div className="flex items-center gap-2 border-t border-neutral-800 pt-4">
                <input
                  type="number"
                  min={1}
                  value={pickCount[c.id] || 1}
                  onChange={(e) => setPickCount((p) => ({ ...p, [c.id]: Number(e.target.value) }))}
                  className="w-16 bg-neutral-800 rounded-lg px-2 py-1.5 text-white text-sm outline-none border border-neutral-700"
                />
                <button
                  onClick={() => pickWinners(c)}
                  className="flex items-center gap-1.5 bg-white text-black text-sm font-medium px-3 py-1.5 rounded-lg"
                >
                  <Trophy size={14} /> Pick winners
                </button>
              </div>
              {pickResult[c.id] && (
                <p className="text-neutral-400 text-xs mt-2">{pickResult[c.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
