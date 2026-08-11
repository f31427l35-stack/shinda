"use client";

import { useEffect, useState } from "react";
import { Search, Download } from "lucide-react";

type Order = {
  id: number;
  phone_number: string;
  package_size: string;
  quantity: number;
  total_amount: number;
  status: string;
  delivery_status: string;
  paid_at: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, { text: string; bg: string; label: string }> = {
  paid: { text: "text-emerald-400", bg: "bg-emerald-500/10", label: "Paid" },
  awaiting_payment: { text: "text-amber-400", bg: "bg-amber-500/10", label: "Awaiting payment" },
  pending: { text: "text-neutral-400", bg: "bg-neutral-500/10", label: "Pending" },
  failed: { text: "text-red-400", bg: "bg-red-500/10", label: "Failed" },
  cancelled: { text: "text-red-400", bg: "bg-red-500/10", label: "Cancelled" },
  timeout: { text: "text-red-400", bg: "bg-red-500/10", label: "Timed out" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { text: "text-neutral-400", bg: "bg-neutral-500/10", label: status };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, page: String(page), perPage: String(perPage) });
    fetch(`/api/orders?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-white text-xl sm:text-2xl font-semibold">Orders</h2>
        <a
          href="/api/orders/export"
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium px-4 py-2 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Download size={15} /> Export CSV
        </a>
      </div>
      <div className="bg-neutral-900 rounded-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2 w-full sm:max-w-md">
            <Search size={16} className="text-neutral-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by phone number"
              className="bg-transparent outline-none text-white text-sm placeholder-neutral-500 w-full"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-neutral-500 text-left border-y border-neutral-800">
                <th className="py-3 px-5 font-medium">Phone number</th>
                <th className="py-3 px-5 font-medium">Size</th>
                <th className="py-3 px-5 font-medium">Amount paid</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5 font-medium">Date & time paid</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-6 px-5 text-neutral-500">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="py-6 px-5 text-neutral-500">No orders found.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-800/60 text-white hover:bg-neutral-800/40">
                    <td className="py-3 px-5 whitespace-nowrap">{o.phone_number}</td>
                    <td className="py-3 px-5 text-neutral-300 whitespace-nowrap">
                      {o.package_size}{o.quantity > 1 ? ` ×${o.quantity}` : ""}
                    </td>
                    <td className="py-3 px-5 font-medium whitespace-nowrap">KES {o.total_amount.toLocaleString()}</td>
                    <td className="py-3 px-5"><StatusChip status={o.status} /></td>
                    <td className="py-3 px-5 text-neutral-400 whitespace-nowrap">
                      {o.paid_at ? new Date(o.paid_at).toLocaleString() : "—"}
                    </td>
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
    </div>
  );
}
