"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Stats = {
  paidToday: number;
  newOrdersToday: number;
  sessionsToday: number;
  totalPaidOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  perDay: { date: string; amount: number }[];
};

type SessionPoint = { bucket: string; count: number };
type Period = "daily" | "weekly" | "monthly";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-neutral-900 rounded-xl p-4 sm:p-5 sm:flex-1 sm:min-w-[180px]">
      <p className="text-neutral-400 text-xs sm:text-sm mb-2">{label}</p>
      <p className="text-white text-xl sm:text-3xl font-semibold">{value}</p>
    </div>
  );
}

function formatBucketLabel(bucket: string, period: Period) {
  if (period === "monthly") {
    const [year, month] = bucket.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return new Date(bucket).toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState<Period>("daily");
  const [sessions, setSessions] = useState<SessionPoint[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

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

  useEffect(() => {
    setSessionsLoading(true);
    fetch(`/api/sessions/stats?period=${period}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.series || []))
      .finally(() => setSessionsLoading(false));
  }, [period]);

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

  const sessionChartData = sessions.map((s) => ({
    label: formatBucketLabel(s.bucket, period),
    count: s.count,
  }));

  return (
    <div className="p-4 sm:p-8">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 mb-4">
        <StatCard label="Paid today" value={`KES ${stats.paidToday.toLocaleString()}`} />
        <StatCard label="New orders today" value={stats.newOrdersToday} />
        <StatCard label="USSD sessions today" value={stats.sessionsToday} />
        <StatCard label="Total paid orders" value={stats.totalPaidOrders.toLocaleString()} />
        <StatCard label="Total revenue" value={`KES ${stats.totalRevenue.toLocaleString()}`} />
        <StatCard label="Total customers" value={stats.totalCustomers.toLocaleString()} />
      </div>

      <div className="bg-neutral-900 rounded-xl p-4 sm:p-5 mb-4">
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

      <div className="bg-neutral-900 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-white font-semibold">USSD sessions (dial-ins)</h3>
          <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  period === p ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 280 }}>
          {sessionsLoading ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionChartData}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value) => [value, "Sessions"]}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
