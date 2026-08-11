import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";
import { getRevenueViewPercent, scaleAmount } from "@/lib/viewPercent";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const percent = await getRevenueViewPercent(auth.user.id);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 10);
  const offset = (page - 1) * perPage;
  const likeTerm = `%${search}%`;

  const { rows: countRows } = await sql`
    SELECT COUNT(*)::int AS total
    FROM orders
    WHERE status = 'paid' AND phone_number ILIKE ${likeTerm}
  `;

  const { rows } = await sql`
    SELECT id, phone_number, receipt_number, total_amount, paid_at
    FROM orders
    WHERE status = 'paid' AND phone_number ILIKE ${likeTerm}
    ORDER BY paid_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const scaled = rows.map((r) => ({ ...r, total_amount: scaleAmount(r.total_amount, percent) }));

  return NextResponse.json({ payments: scaled, total: countRows[0].total, page, perPage });
}
