"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";

type Payout = {
  id: number;
  period: string;
  phone_number: string;
  total_spent: number;
  amount: number;
  status: string;
  created_at: string;
};

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
    failed: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-neutral-700 text-neutral-300"}`}>
      {status}
    </span>
  );
}

export default function BonusesPage() {
  const [amount, setAmount] = useState("0");
  const [enabled, setEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bonus-settings")
      .then((res) => res.json())
      .then((data) => {
        setAmount(String(data.settings?.amount ?? 0));
        setEnabled(Boolean(data.settings?.enabled));
      })
      .finally(() => setSettingsLoading(false));

    fetch("/api/bonuses")
      .then((res) => res.json())
      .then((data) => setPayouts(data.payouts || []))
      .finally(() => setPayoutsLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/bonus-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), enabled }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save settings.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-4 sm:p-8">
      <h2 className="text-white text-xl sm:text-2xl font-semibold mb-6">Bonuses</h2>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6 max-w-lg">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={17} className="text-amber-500" />
          <h3 className="text-white font-semibold">Monthly top-spender bonus</h3>
        </div>
        <p className="text-neutral-500 text-sm mb-4">
          On the 1st of every month, whoever spent the most KES the previous month is paid this amount automatically via M-Pesa — no review step.
        </p>
        {settingsLoading ? (
          <p className="text-neutral-500 text-sm">Loading...</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <label className="text-neutral-300 text-sm">Enable automatic payout</label>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? "bg-amber-500" : "bg-neutral-700"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-neutral-300 text-sm w-28">Bonus amount</label>
              <div className="flex items-center gap-1 bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700 focus-within:border-amber-500 flex-1">
                <span className="text-neutral-500 text-sm">KES</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min={0}
                  className="bg-transparent text-white text-sm outline-none w-full"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
            </button>
          </>
        )}
      </div>

      <div className="bg-neutral-900 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-white font-semibold text-sm">Payout history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-neutral-500 text-left border-y border-neutral-800">
                <th className="py-3 px-5 font-medium">Month</th>
                <th className="py-3 px-5 font-medium">Phone number</th>
                <th className="py-3 px-5 font-medium">Spent that month</th>
                <th className="py-3 px-5 font-medium">Bonus paid</th>
                <th className="py-3 px-5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payoutsLoading ? (
                <tr><td colSpan={5} className="py-6 px-5 text-neutral-500">Loading...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={5} className="py-6 px-5 text-neutral-500">No bonuses paid out yet.</td></tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-800/60 text-white hover:bg-neutral-800/40">
                    <td className="py-3 px-5 whitespace-nowrap">{p.period}</td>
                    <td className="py-3 px-5 whitespace-nowrap">{p.phone_number}</td>
                    <td className="py-3 px-5 text-neutral-300 whitespace-nowrap">KES {p.total_spent.toLocaleString()}</td>
                    <td className="py-3 px-5 font-medium whitespace-nowrap">KES {p.amount.toLocaleString()}</td>
                    <td className="py-3 px-5"><StatusChip status={p.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
