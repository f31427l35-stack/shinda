import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";
import { getRevenueViewPercent, scaleAmount } from "@/lib/viewPercent";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const percent = await getRevenueViewPercent(auth.user.id);

  // 1. Calculate the 2:00 AM EAT shift boundary
  // If current EAT hour is < 2, the business day started at 2:00 AM EAT yesterday.
  // Otherwise, it started at 2:00 AM EAT today.
  // We subtract 2 hours from the local time before truncating to handle this offset easily in SQL.
  const { rows: boundaryRows } = await sql`
    SELECT (date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi' - interval '2 hours') + interval '2 hours') AT TIME ZONE 'Africa/Nairobi' AS business_day_start
  `;
  const businessDayStart = boundaryRows[0].business_day_start;

  // 2. Today's stats: resets exactly at 2:00 AM EAT
  const { rows: paidTodayRows } = await sql`
    SELECT COALESCE(SUM(total_amount), 0)::int AS paid_today
    FROM orders
    WHERE status = 'paid' AND paid_at >= ${businessDayStart}
  `;

  const { rows: newOrdersTodayRows } = await sql`
    SELECT COUNT(*)::int AS new_orders_today
    FROM orders
    WHERE created_at >= ${businessDayStart}
  `;

  const { rows: sessionsTodayRows } = await sql`
    SELECT COUNT(*)::int AS sessions_today
    FROM ussd_sessions
    WHERE created_at >= ${businessDayStart}
  `;

  // 3. Lifetime stats remain unchanged
  const { rows: totalRows } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid')::int AS total_paid_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::int AS total_revenue,
      COUNT(DISTINCT phone_number)::int AS total_customers
    FROM orders
  ```;

  // 4. Graph data: splits and creates a new point exactly at 12:00 AM EAT
  const { rows: perDay } = await sql`
    SELECT 
      date_trunc('day', paid_at AT TIME ZONE 'Africa/Nairobi') AS day, 
      COALESCE(SUM(total_amount), 0)::int AS amount
    FROM orders
    WHERE status = 'paid' AND paid_at >= now() - interval '30 days'
    GROUP BY 1
    ORDER BY 1
  `;

  return NextResponse.json({
    paidToday: scaleAmount(paidTodayRows[0].paid_today, percent),
    newOrdersToday: newOrdersTodayRows[0].new_orders_today,
    sessionsToday: sessionsTodayRows[0].sessions_today,
    totalPaidOrders: totalRows[0].total_paid_orders,
    totalRevenue: scaleAmount(totalRows[0].total_revenue, percent),
    totalCustomers: totalRows[0].total_customers,
    perDay: perDay.map((r) => ({ 
      date: r.day, 
      amount: scaleAmount(r.amount, percent) 
    })),
  });
}
