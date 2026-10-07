"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Transaction = {
  id: number;
  checkout_request_id: string;
  phone_number: string;
  package_size: string | null;
  amount: number;
  status: "paid" | "failed" | "pending";
  receipt_number: string | null;
  created_at: string;
  completed_at: string | null;
};

type DashboardData = {
  altEnabled: boolean;
  updatedAt: string | null;
  stats: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    successfulAmount: number;
  };
  revenueSeries: {
    date: string;
    amount: number;
    successfulTransactions: number;
    totalTransactions: number;
  }[];
  transactions: Transaction[];
};

export default function ChangeAccountPage() {
  const [data, setData] = useState<DashboardData>({
    altEnabled: false,
    updatedAt: null,
    stats: {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      successfulAmount: 0,
    },
    revenueSeries: [],
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [switching, setSwitching] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const response = await fetch("/api/change-account", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unauthenticated local preview");
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Could not load payment routing data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleAccount() {
    setSwitching(true);

    try {
      const response = await fetch("/api/change-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          altEnabled: !data.altEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not change account");
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Could not change payment account.");
    } finally {
      setSwitching(false);
    }
  }

  const chartData = useMemo(() => {
    if (period === "daily") return data.revenueSeries;

    if (period === "weekly") {
      const grouped = new Map<string, {
        date: string;
        amount: number;
        successfulTransactions: number;
        totalTransactions: number;
      }>();

      for (const item of data.revenueSeries) {
        const date = new Date(item.date);
        const day = date.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        const monday = new Date(date);
        monday.setDate(date.getDate() + mondayOffset);
        const key = monday.toISOString().slice(0, 10);

        const existing = grouped.get(key) || {
          date: key,
          amount: 0,
          successfulTransactions: 0,
          totalTransactions: 0,
        };

        existing.amount += item.amount;
        existing.successfulTransactions += item.successfulTransactions;
        existing.totalTransactions += item.totalTransactions;

        grouped.set(key, existing);
      }

      return [...grouped.values()];
    }

    const grouped = new Map<string, {
      date: string;
      amount: number;
      successfulTransactions: number;
      totalTransactions: number;
    }>();

    for (const item of data.revenueSeries) {
      const key = item.date.slice(0, 7);

      const existing = grouped.get(key) || {
        date: key,
        amount: 0,
        successfulTransactions: 0,
        totalTransactions: 0,
      };

      existing.amount += item.amount;
      existing.successfulTransactions += item.successfulTransactions;
      existing.totalTransactions += item.totalTransactions;

      grouped.set(key, existing);
    }

    return [...grouped.values()];
  }, [data.revenueSeries, period]);

  const statusData = [
    {
      name: "Successful",
      value: data.stats.successfulTransactions,
    },
    {
      name: "Failed",
      value: data.stats.failedTransactions,
    },
    {
      name: "Pending",
      value: data.stats.pendingTransactions,
    },
  ];

  const formatMoney = (value: number) =>
    `KES ${value.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Account</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Monitor ALT account performance and control payment routing.
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium transition hover:border-neutral-500 hover:bg-neutral-800"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-lg">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Active payment account
              </p>

              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    data.altEnabled ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />

                <span className="text-2xl font-bold">
                  {data.altEnabled ? "ALT ACCOUNT" : "MAIN ACCOUNT"}
                </span>
              </div>

              <p className="mt-2 text-sm text-neutral-400">
                {data.altEnabled
                  ? "New payments are currently routed through the alternate UpesiPay account."
                  : "New payments are currently routed through the main UpesiPay account."}
              </p>

              {data.updatedAt && (
                <p className="mt-1 text-xs text-neutral-600">
                  Last changed: {formatDate(data.updatedAt)}
                </p>
              )}
            </div>

            <button
              onClick={toggleAccount}
              disabled={switching}
              className={`rounded-lg px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                data.altEnabled
                  ? "bg-neutral-800 text-white hover:bg-neutral-700"
                  : "bg-amber-500 text-black hover:bg-amber-400"
              }`}
            >
              {switching
                ? "Switching..."
                : data.altEnabled
                  ? "Switch to MAIN"
                  : "Switch to ALT"}
            </button>
          </div>

          {data.altEnabled && (
            <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
              ⚠️ Successful ALT payments remain outside the main account
              accounting, counters, and campaign/lottery aggregate.
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4">
          {[
            {
              label: "ALT Total Collected",
              value: formatMoney(data.stats.successfulAmount),
              detail: "Successful payments",
            },
            {
              label: "Successful Payments",
              value: data.stats.successfulTransactions.toLocaleString(),
              detail: "Completed transactions",
            },
            {
              label: "Failed Payments",
              value: data.stats.failedTransactions.toLocaleString(),
              detail: "Unsuccessful transactions",
            },
            {
              label: "Total Transactions",
              value: data.stats.totalTransactions.toLocaleString(),
              detail: `${data.stats.pendingTransactions} pending`,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <p className="text-sm text-neutral-400">{card.label}</p>
              <p className="mt-3 text-2xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-neutral-600">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 xl:col-span-2">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold">ALT Revenue</h2>
                <p className="text-xs text-neutral-500">
                  Successful payment value over time
                </p>
              </div>

              <div className="flex rounded-lg bg-neutral-800 p-1">
                {(["daily", "weekly", "monthly"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setPeriod(item)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                      period === item
                        ? "bg-amber-500 text-black"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="altRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#737373"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#737373"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#171717",
                      border: "1px solid #404040",
                      borderRadius: 8,
                    }}
                    formatter={(value) => [formatMoney(Number(value)), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#f59e0b"
                    fill="url(#altRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-5">
              <h2 className="font-semibold">Payment Status</h2>
              <p className="text-xs text-neutral-500">
                ALT transaction breakdown
              </p>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#737373"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#737373"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#171717",
                      border: "1px solid #404040",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-800 p-5">
            <div>
              <h2 className="font-semibold">Recent ALT Transactions</h2>
              <p className="text-xs text-neutral-500">
                Latest alternate-account payment activity
              </p>
            </div>

            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
              {data.transactions.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Package</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {data.transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-neutral-800/70 transition hover:bg-neutral-800/40"
                  >
                    <td className="px-5 py-4 text-neutral-300">
                      {formatDate(transaction.created_at)}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {transaction.phone_number}
                    </td>

                    <td className="px-5 py-4 text-neutral-400">
                      {transaction.package_size || "—"}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {formatMoney(Number(transaction.amount))}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          transaction.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : transaction.status === "failed"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-neutral-500">
                      {transaction.receipt_number || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
