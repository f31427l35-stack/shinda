"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Check, Pencil } from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  revenue_view_percent: number;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("presenter");
  const [percent, setPercent] = useState("100");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPercent, setEditPercent] = useState("100");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, revenue_view_percent: Number(percent) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create user.");
      return;
    }
    setName(""); setEmail(""); setPassword(""); setRole("presenter"); setPercent("100"); setShowForm(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditPercent(String(u.revenue_view_percent));
  }

  async function saveEdit(id: number) {
    const value = Number(editPercent);
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      alert("Enter a number between 1 and 100.");
      return;
    }
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revenue_view_percent: value }),
    });
    setEditingId(null);
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-white text-xl sm:text-2xl font-semibold">Users</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 bg-amber-500 text-black text-sm font-medium px-4 py-2 rounded-lg self-start sm:self-auto"
        >
          <Plus size={15} /> New user
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
          {error && <div className="bg-red-950 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name"
              className="bg-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none border border-neutral-700 focus:border-amber-500" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email"
              className="bg-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none border border-neutral-700 focus:border-amber-500" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="Password"
              className="bg-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none border border-neutral-700 focus:border-amber-500" />
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="bg-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none border border-neutral-700 focus:border-amber-500">
              <option value="presenter">Presenter</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700 focus-within:border-amber-500">
              <input value={percent} onChange={(e) => setPercent(e.target.value)} type="number" min={1} max={100}
                title="What % of real money amounts this login sees"
                className="bg-transparent text-white text-sm outline-none w-full" />
              <span className="text-neutral-500 text-sm">% view</span>
            </div>
          </div>
          <p className="text-neutral-500 text-xs mb-4">
            "% view" controls how much of the real revenue figures this login sees across the dashboard — e.g. 70 shows them 70% of every amount. Use 100 for full visibility.
          </p>
          <button type="submit" className="bg-amber-500 text-black text-sm font-medium px-4 py-2 rounded-lg">Create user</button>
        </form>
      )}

      <div className="bg-neutral-900 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-neutral-500 text-left border-y border-neutral-800">
                <th className="py-3 px-5 font-medium">Name</th>
                <th className="py-3 px-5 font-medium">Email</th>
                <th className="py-3 px-5 font-medium">Role</th>
                <th className="py-3 px-5 font-medium">% view</th>
                <th className="py-3 px-5 font-medium">Created at</th>
                <th className="py-3 px-5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-6 px-5 text-neutral-500">Loading...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-800/60 text-white hover:bg-neutral-800/40">
                    <td className="py-3 px-5 whitespace-nowrap">{u.name}</td>
                    <td className="py-3 px-5 text-neutral-300 whitespace-nowrap">{u.email}</td>
                    <td className="py-3 px-5 text-neutral-300 whitespace-nowrap">{u.role}</td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={editPercent}
                            onChange={(e) => setEditPercent(e.target.value)}
                            type="number"
                            min={1}
                            max={100}
                            className="bg-neutral-800 rounded-md px-2 py-1 text-white text-sm w-16 outline-none border border-neutral-700"
                          />
                          <button onClick={() => saveEdit(u.id)} className="text-emerald-400 hover:text-emerald-300">
                            <Check size={15} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(u)} className="flex items-center gap-1 text-neutral-300 hover:text-white">
                          {u.revenue_view_percent}% <Pencil size={12} className="text-neutral-500" />
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-5 text-neutral-400 whitespace-nowrap">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3 justify-end">
                        {u.role !== "admin" && (
                          <button onClick={() => handleDelete(u.id)} className="flex items-center gap-1 text-red-500 text-xs font-medium whitespace-nowrap">
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
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
