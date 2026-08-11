import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

function csvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { rows } = await sql`
    SELECT phone_number, MIN(created_at) AS first_order_at, COUNT(*)::int AS orders_count
    FROM orders
    GROUP BY phone_number
    ORDER BY first_order_at DESC
  `;

  const header = ["Phone Number", "First Order At", "Orders Placed"];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        csvValue(r.phone_number),
        csvValue(new Date(r.first_order_at).toLocaleString("en-KE")),
        csvValue(r.orders_count),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${today}.csv"`,
    },
  });
}
