"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-semibold mb-1 text-center">Shinda Soap</h1>
        <p className="text-neutral-500 text-sm text-center mb-8">Sign in to manage your orders</p>
        <form onSubmit={handleSubmit} className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          {error && (
            <div className="bg-red-950 border border-red-900 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}
          <label className="block text-neutral-400 text-xs mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm outline-none mb-4 border border-neutral-700 focus:border-amber-500"
            placeholder="you@example.com"
          />
          <label className="block text-neutral-400 text-xs mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm outline-none mb-6 border border-neutral-700 focus:border-amber-500"
            placeholder="••••••••"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-black font-medium rounded-lg py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
