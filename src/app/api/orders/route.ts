import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 10);
  const offset = (page - 1) * perPage;
  const status = searchParams.get("status");

  const likeTerm = `%${search}%`;

  const { rows: countRows } = await sql`
    SELECT COUNT(*)::int AS total
    FROM orders
    WHERE phone_number ILIKE ${likeTerm}
      AND (${status}::text IS NULL OR status = ${status}::text)
  `;

  const { rows } = await sql`
    SELECT id, phone_number, package_size, quantity, total_amount,
           status, delivery_status, paid_at, created_at
    FROM orders
    WHERE phone_number ILIKE ${likeTerm}
      AND (${status}::text IS NULL OR status = ${status}::text)
    ORDER BY created_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  return NextResponse.json({ orders: rows, total: countRows[0].total, page, perPage });
}
