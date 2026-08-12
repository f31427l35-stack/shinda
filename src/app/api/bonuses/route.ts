import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 10);
  const offset = (page - 1) * perPage;

  const { rows: countRows } = await sql`SELECT COUNT(*)::int AS total FROM bonus_payouts`;

  const { rows } = await sql`
    SELECT id, period, phone_number, total_spent, amount, status, created_at
    FROM bonus_payouts
    ORDER BY period DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  return NextResponse.json({ payouts: rows, total: countRows[0].total, page, perPage });
}
