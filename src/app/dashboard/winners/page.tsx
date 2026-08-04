"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

type Winner = {
  id: number;
  phone_number: string;
  picked_at: string;
  campaign_name: string;
  picked_by_name: string | null;
};

export default function WinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/winners")
      .then((res) => res.json())
      .then((data) => setWinners(data.winners || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-white text-2xl font-semibold mb-6">Winners</h2>
      <div className="bg-neutral-900 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-500 text-left border-y border-neutral-800">
              <th className="py-3 px-5 font-medium">Phone number</th>
              <th className="py-3 px-5 font-medium">Campaign</th>
              <th className="py-3 px-5 font-medium">Picked by</th>
              <th className="py-3 px-5 font-medium">Picked at</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 px-5 text-neutral-500">Loading...</td></tr>
            ) : winners.length === 0 ? (
              <tr><td colSpan={4} className="py-6 px-5 text-neutral-500">No winners picked yet. Draw winners from the Campaigns page.</td></tr>
            ) : (
              winners.map((w) => (
                <tr key={w.id} className="border-b border-neutral-800/60 text-white hover:bg-neutral-800/40">
                  <td className="py-3 px-5 flex items-center gap-2">
                    <Trophy size={14} className="text-amber-500" /> {w.phone_number}
                  </td>
                  <td className="py-3 px-5 text-neutral-300">{w.campaign_name}</td>
                  <td className="py-3 px-5 text-neutral-400">{w.picked_by_name || "—"}</td>
                  <td className="py-3 px-5 text-neutral-400">{new Date(w.picked_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
