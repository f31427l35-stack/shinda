"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

type Stats = {
  isAdmin: boolean;
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
type TodayInterval = "15m" | "30m" | "1h" | "12h";
type TodayPoint = { label: string; revenue: number; sessions: number };

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

function TodayLiveChart({ paidToday }: { paidToday: number }) {
  const [interval, setInterval_] = useState<TodayInterval>("15m");
  const [data, setData] = useState<TodayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats/today-series?interval=${interval}`)
      .then((res) => res.json())
      .then((d) => setData(d.series || []))
      .finally(() => setLoading(false));
  }, [interval]);

  return (
    <div className="bg-neutral-900 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-white font-semibold">Today's activity</h3>
        <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
          {(["15m", "30m", "1h", "12h"] as TodayInterval[]).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval_(iv)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                interval === iv ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 280 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} angle={-45} textAnchor="end" height={50} />
              <YAxis
                yAxisId="revenue"
                tick={{ fill: "#f59e0b", fontSize: 11 }}
                allowDecimals={false}
                label={{ value: "KES", angle: -90, position: "insideLeft", fill: "#f59e0b", fontSize: 11 }}
              />
              <YAxis
                yAxisId="sessions"
                orientation="right"
                tick={{ fill: "#38bdf8", fontSize: 11 }}
                allowDecimals={false}
                label={{ value: "Sessions", angle: 90, position: "insideRight", fill: "#38bdf8", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                formatter={(value, name) =>
                  name === "revenue" ? [`KES ${Number(value ?? 0).toLocaleString()}`, "Revenue"] : [value, "Sessions"]
                }
              />
              <ReferenceLine
                yAxisId="revenue"
                y={paidToday}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{
                  value: `KES ${paidToday.toLocaleString()}`,
                  position: "left",
                  fill: "#f59e0b",
                  fontSize: 11,
                }}
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
              <Area
                yAxisId="sessions"
                type="monotone"
                dataKey="sessions"
                stroke="#38bdf8"
                strokeWidth={2}
                fill="url(#sessionsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Revenue</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Sessions</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [revenuePeriod, setRevenuePeriod] = useState<Period>("daily");
  const [sessionsPeriod, setSessionsPeriod] = useState<Period>("daily");

  const [sessions, setSessions] = useState<SessionPoint[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?period=${revenuePeriod}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then(setStats)
      .catch(() => setError("Couldn't load dashboard data."))
      .finally(() => setLoading(false));
  }, [revenuePeriod]);

  useEffect(() => {
    setSessionsLoading(true);
    fetch(`/api/sessions/stats?period=${sessionsPeriod}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.series || []))
      .finally(() => setSessionsLoading(false));
  }, [sessionsPeriod]);

  if (loading && !stats) {
    return <div className="p-8 text-neutral-500">Loading...</div>;
  }
  if (error || !stats) {
    return <div className="p-8 text-red-400">{error || "No data."}</div>;
  }

  const chartData = stats.perDay.map((d) => ({
    date: formatBucketLabel(d.date, revenuePeriod),
    amount: d.amount,
  }));

  const sessionChartData = sessions.map((s) => ({
    label: formatBucketLabel(s.bucket, sessionsPeriod),
    count: s.count,
  }));

  return (
    <div className="p-4 sm:p-8">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 mb-4">
        <StatCard label="Paid today" value={`KES ${stats.paidToday.toLocaleString()}`} />
        <StatCard label="New orders today" value={stats.newOrdersToday} />
        <StatCard label="USSD sessions today" value={stats.sessionsToday} />
        {stats.isAdmin && (
          <>
            <StatCard label="Total paid orders" value={stats.totalPaidOrders.toLocaleString()} />
            <StatCard label="Total revenue" value={`KES ${stats.totalRevenue.toLocaleString()}`} />
            <StatCard label="Total customers" value={stats.totalCustomers.toLocaleString()} />
          </>
        )}
      </div>

      {!stats.isAdmin && (
        <div className="mb-4">
          <TodayLiveChart paidToday={stats.paidToday} />
        </div>
      )}

      {stats.isAdmin && (
        <>
          <div className="bg-neutral-900 rounded-xl p-4 sm:p-5 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="text-white font-semibold">Revenue breakdown</h3>
              <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
                {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setRevenuePeriod(p)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                      revenuePeriod === p ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value) => [`KES ${Number(value ?? 0).toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
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
                    onClick={() => setSessionsPeriod(p)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                      sessionsPeriod === p ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
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
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
