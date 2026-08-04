"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

type Entry = {
  id: number;
  phone_number: string;
  created_at: string;
  campaign_name: string;
};

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, page: String(page), perPage: String(perPage) });
    fetch(`/api/entries?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-8">
      <h2 className="text-white text-2xl font-semibold mb-6">Entries</h2>
      <div className="bg-neutral-900 rounded-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2 max-w-md">
            <Search size={16} className="text-neutral-500" />
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-500 text-left border-y border-neutral-800">
              <th className="py-3 px-5 font-medium">Phone number</th>
              <th className="py-3 px-5 font-medium">Campaign</th>
              <th className="py-3 px-5 font-medium">Entered at</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-6 px-5 text-neutral-500">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={3} className="py-6 px-5 text-neutral-500">No entries found.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-neutral-800/60 text-white hover:bg-neutral-800/40">
                  <td className="py-3 px-5">{e.phone_number}</td>
                  <td className="py-3 px-5 text-neutral-300">{e.campaign_name}</td>
                  <td className="py-3 px-5 text-neutral-400">{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-5 py-4 text-neutral-400 text-sm">
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
