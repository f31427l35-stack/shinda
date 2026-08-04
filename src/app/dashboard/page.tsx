"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Stats = {
  entriesToday: number;
  newNumbersToday: number;
  totalEntries: number;
  totalParticipants: number;
  perDay: { date: string; count: number }[];
  activeCampaign: { name: string; keyword: string; prize_description: string | null } | null;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-neutral-900 rounded-xl p-5 flex-1 min-w-[180px]">
      <p className="text-neutral-400 text-sm mb-2">{label}</p>
      <p className="text-white text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then(setStats)
      .catch(() => setError("Couldn't load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-neutral-500">Loading...</div>;
  }
  if (error || !stats) {
    return <div className="p-8 text-red-400">{error || "No data."}</div>;
  }

  const chartData = stats.perDay.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
    entries: d.count,
  }));

  return (
    <div className="p-8">
      {stats.activeCampaign ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 mb-6">
          <p className="text-amber-400 text-sm font-medium">
            Active campaign: {stats.activeCampaign.name} — keyword "{stats.activeCampaign.keyword}"
          </p>
          {stats.activeCampaign.prize_description && (
            <p className="text-neutral-400 text-sm mt-1">{stats.activeCampaign.prize_description}</p>
          )}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 mb-6">
          <p className="text-neutral-400 text-sm">No active campaign. Create one in Campaigns to start taking entries.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-4">
        <StatCard label="Deposits Today" value={stats.entriesToday} />
        <StatCard label="New numbers today" value={stats.newNumbersToday} />
        <StatCard label="Total entries" value={stats.totalEntries.toLocaleString()} />
        <StatCard label="Total participants" value={stats.totalParticipants.toLocaleString()} />
      </div>

      <div className="bg-neutral-900 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Entries per day (last 30 days)</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
              <Line type="monotone" dataKey="entries" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
