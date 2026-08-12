import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const isAdmin = auth.user.role === "admin";

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 10);
  const offset = (page - 1) * perPage;
  const likeTerm = `%${search}%`;

  const { rows: boundaryRows } = await sql`
    SELECT date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi' AS business_day_start
  `;
  const businessDayStart = boundaryRows[0].business_day_start;

  const { rows: countRows } = await sql`
    SELECT COUNT(DISTINCT phone_number)::int AS total
    FROM orders
    WHERE phone_number ILIKE ${likeTerm}
      AND (${isAdmin} OR created_at >= ${businessDayStart})
  `;

  const { rows } = await sql`
    SELECT phone_number,
           MIN(created_at) AS first_order_at,
           COUNT(*)::int AS orders_count
    FROM orders
    WHERE phone_number ILIKE ${likeTerm}
      AND (${isAdmin} OR created_at >= ${businessDayStart})
    GROUP BY phone_number
    ORDER BY first_order_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  return NextResponse.json({ customers: rows, total: countRows[0].total, page, perPage });
}
