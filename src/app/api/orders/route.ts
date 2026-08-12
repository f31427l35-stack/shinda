import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";
import { getRevenueViewPercent, scaleAmount } from "@/lib/viewPercent";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const isAdmin = auth.user.role === "admin";
  const percent = isAdmin ? await getRevenueViewPercent(auth.user.id) : 100;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 10);
  const offset = (page - 1) * perPage;
  const status = searchParams.get("status");
  const likeTerm = `%${search}%`;

  const { rows: boundaryRows } = await sql`
    SELECT date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi' AS business_day_start
  `;
  const businessDayStart = boundaryRows[0].business_day_start;

  const { rows: countRows } = await sql`
    SELECT COUNT(*)::int AS total
    FROM orders
    WHERE phone_number ILIKE ${likeTerm}
      AND (${status}::text IS NULL OR status = ${status}::text)
      AND (${isAdmin} OR created_at >= ${businessDayStart})
  `;

  const { rows } = await sql`
    SELECT id, phone_number, package_size, quantity, total_amount,
           status, delivery_status, paid_at, created_at
    FROM orders
    WHERE phone_number ILIKE ${likeTerm}
      AND (${status}::text IS NULL OR status = ${status}::text)
      AND (${isAdmin} OR created_at >= ${businessDayStart})
    ORDER BY created_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const scaled = rows.map((r) => ({ ...r, total_amount: scaleAmount(r.total_amount, percent) }));

  return NextResponse.json({ orders: scaled, total: countRows[0].total, page, perPage });
}
