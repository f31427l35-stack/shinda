import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { rows: paidTodayRows } = await sql`
    SELECT COALESCE(SUM(total_amount), 0)::int AS paid_today
    FROM orders
    WHERE status = 'paid' AND paid_at >= date_trunc('day', now())
  `;

  const { rows: newOrdersTodayRows } = await sql`
    SELECT COUNT(*)::int AS new_orders_today
    FROM orders
    WHERE created_at >= date_trunc('day', now())
  `;

  const { rows: totalRows } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid')::int AS total_paid_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::int AS total_revenue,
      COUNT(DISTINCT phone_number)::int AS total_customers
    FROM orders
  `;

  const { rows: perDay } = await sql`
    SELECT date_trunc('day', paid_at) AS day, COALESCE(SUM(total_amount), 0)::int AS amount
    FROM orders
    WHERE status = 'paid' AND paid_at >= now() - interval '30 days'
    GROUP BY 1
    ORDER BY 1
  `;

  return NextResponse.json({
    paidToday: paidTodayRows[0].paid_today,
    newOrdersToday: newOrdersTodayRows[0].new_orders_today,
    totalPaidOrders: totalRows[0].total_paid_orders,
    totalRevenue: totalRows[0].total_revenue,
    totalCustomers: totalRows[0].total_customers,
    perDay: perDay.map((r) => ({ date: r.day, amount: r.amount })),
  });
}
