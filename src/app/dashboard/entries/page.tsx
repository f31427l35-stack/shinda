"use client";
import { useEffect, useState } from "react";
import { Search, Settings, X } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

type Order = {
  id: number;
  phone_number: string;
  package_size: string;
  delivery_status: "pending" | "delivered";
  created_at: string;
};

function OutcomeChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-neutral-700 text-neutral-300"}`}>
      {status === "delivered" ? "Delivered" : "Pending"}
    </span>
  );
}

// CHANGED: The modal now handles only min_price and max_price inputs
function PriceSettingsModal({ onClose }: { onClose: () => void }) {
  const [minPrice, setMinPrice] = useState<number>(100);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/prices")
      .then((res) => res.json())
      .then((data) => {
        // Assume data returns { min_price, max_price }
        if (data.min_price !== undefined) setMinPrice(data.min_price);
        if (data.max_price !== undefined) setMaxPrice(data.max_price);
      })
      .catch(() => setError("Failed to fetch settings."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (minPrice > maxPrice) {
      setError("Minimum price cannot be greater than Maximum price.");
      return;
    }

    setSaving(true);
    setError("");
    
    const res = await fetch("/api/prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minPrice, maxPrice }), // Send min/max fields to backend
    });
    
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save pricing configuration.");
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Random Pricing Limits</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading limits...</p>
        ) : (
          <div className="space-y-4">
            {/* Minimum Price Input */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-neutral-300 text-sm">Minimum Price</label>
              <div className="flex items-center gap-1">
                <span className="text-neutral-500 text-sm">KES</span>
                <input
                  type="number"
                  min={1}
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="bg-neutral-800 text-white text-sm rounded-md px-2 py-1.5 w-28 outline-none border border-neutral-700 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Maximum Price Input */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-neutral-300 text-sm">Maximum Price</label>
              <div className="flex items-center gap-1">
                <span className="text-neutral-500 text-sm">KES</span>
                <input
                  type="number"
                  min={1}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="bg-neutral-800 text-white text-sm rounded-md px-2 py-1.5 w-28 outline-none border border-neutral-700 focus:border-amber-500"
                />
              </div>
            </div>
            
            <p className="text-neutral-500 text-xs italic">
              USSD prices for 1L - 5L will shift randomly within this range.
            </p>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full mt-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving Configurations..." : "Save Boundaries"}
        </button>
      </div>
    </div>
  );
}

export default function EntriesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, page: String(page), perPage: String(perPage) });
    fetch(`/api/orders?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.orders || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-white text-xl sm:text-2xl font-semibold">Entries</h2>
        {user?.role === "admin" && (
          <button onClick={() => setSettingsOpen(true)} className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors self-start sm:self-auto" >
            <Settings size={15} /> Settings
          </button>
        )}
      </div>

      <div className="bg-neutral-900 rounded-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2 w-full sm:max-w-md">
            <Search size={16} className="text-neutral-500 flex-shrink-0" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by phone number" className="bg-transparent outline-none text-white text-sm placeholder-neutral-500 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-neutral-500 text-left border-y border-neutral-800">
                <th className="py-3 px-5 font-medium">Order ID</th>
                <th className="py-3 px-5 font-medium">Customer</th>
                <th className="py-3 px-5 font-medium">Entry</th>
                <th className="py-3 px-5 font-medium">Outcome</th>
                <th className="py-3 px-5 font-medium">Created at</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-6 px-5 text-neutral-500">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="py-6 px-5 text-neutral-500">No entries found.</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-800/60 text-white hover:bg-neutral-800/40">
                    <td className="py-3 px-5 whitespace-nowrap">#{e.id}</td>
                    <td className="py-3 px-5 whitespace-nowrap">{e.phone_number}</td>
                    <td className="py-3 px-5 text-neutral-300 whitespace-nowrap">{e.package_size}</td>
                    <td className="py-3 px-5"><OutcomeChip status={e.delivery_status} /></td>
                    <td className="py-3 px-5 text-neutral-400 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-5 py-4 text-neutral-400 text-sm">
          <span>Showing {total === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()} results</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded-md hover:bg-neutral-800 disabled:opacity-40">Prev</button>
            <span className="px-2">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded-md hover:bg-neutral-800 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {settingsOpen && <PriceSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
