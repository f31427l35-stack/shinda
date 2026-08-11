"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Stats = {
  paidToday: number;
  newOrdersToday: number;
  totalPaidOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  perDay: { date: string; amount: number }[];
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
    amount: d.amount,
  }));

  return (
    <div className="p-8">
      <div className="flex flex-wrap gap-4 mb-4">
        <StatCard label="Paid today" value={`KES ${stats.paidToday.toLocaleString()}`} />
        <StatCard label="New orders today" value={stats.newOrdersToday} />
        <StatCard label="Total paid orders" value={stats.totalPaidOrders.toLocaleString()} />
        <StatCard label="Total revenue" value={`KES ${stats.totalRevenue.toLocaleString()}`} />
        <StatCard label="Total customers" value={stats.totalCustomers.toLocaleString()} />
      </div>

      <div className="bg-neutral-900 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Revenue per day (last 30 days)</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                formatter={(value) => [`KES ${Number(value ?? 0).toLocaleString()}`, "Revenue"]}
              />
              <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
