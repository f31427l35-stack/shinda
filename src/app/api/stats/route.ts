import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";
import { getRevenueViewPercent, scaleAmount } from "@/lib/viewPercent";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const percent = await getRevenueViewPercent(auth.user.id);

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "weekly" || searchParams.get("period") === "monthly"
    ? searchParams.get("period")
    : "daily";

  // 1. Calculate the 2:00 AM EAT boundary for today's data cards
  const { rows: boundaryRows } = await sql`
    SELECT (date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi' - interval '2 hours') + interval '2 hours') AT TIME ZONE 'Africa/Nairobi' AS business_day_start
  `;
  const businessDayStart = boundaryRows[0].business_day_start;

  // 2. Today's stats: Resets to zero precisely at 2:00 AM EAT
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

  // 3. Lifetime totals
  const { rows: totalRows } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid')::int AS total_paid_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::int AS total_revenue,
      COUNT(DISTINCT phone_number)::int AS total_customers
    FROM orders
  `;

  // 4. Graph data: Slices intervals perfectly at 12:00 AM EAT with periods
  let chartRows;
  if (period === "monthly") {
    ({ rows: chartRows } = await sql`
      SELECT to_char(date_trunc('month', paid_at AT TIME ZONE 'Africa/Nairobi'), 'YYYY-MM') AS day, COALESCE(SUM(total_amount), 0)::int AS amount
      FROM orders
      WHERE status = 'paid' AND paid_at >= now() - interval '12 months'
      GROUP BY 1
      ORDER BY 1
    `);
  } else if (period === "weekly") {
    ({ rows: chartRows } = await sql`
      SELECT to_char(date_trunc('week', paid_at AT TIME ZONE 'Africa/Nairobi'), 'YYYY-MM-DD') AS day, COALESCE(SUM(total_amount), 0)::int AS amount
      FROM orders
      WHERE status = 'paid' AND paid_at >= now() - interval '12 weeks'
      GROUP BY 1
      ORDER BY 1
    `);
  } else {
    ({ rows: chartRows } = await sql`
      SELECT to_char(date_trunc('day', paid_at AT TIME ZONE 'Africa/Nairobi'), 'YYYY-MM-DD') AS day, COALESCE(SUM(total_amount), 0)::int AS amount
      FROM orders
      WHERE status = 'paid' AND paid_at >= now() - interval '30 days'
      GROUP BY 1
      ORDER BY 1
    `);
  }

    // Read row [0] for each query to access the columns correctly
  return NextResponse.json({
    // Today's metrics (Will show 0 after 2:00 AM EAT if no new items exist)
    paidToday: scaleAmount(paidTodayRows[0]?.paid_today || 0, percent),
    newOrdersToday: newOrdersTodayRows[0]?.new_orders_today || 0,
    sessionsToday: sessionsTodayRows[0]?.sessions_today || 0,

    // Lifetime totals (Will show your actual real lifetime data)
    totalPaidOrders: totalRows[0]?.total_paid_orders || 0,
    totalRevenue: scaleAmount(totalRows[0]?.total_revenue || 0, percent),
    totalCustomers: totalRows[0]?.total_customers || 0,

    // Graph breakdown
    perDay: chartRows.map((r) => ({ date: r.day, amount: scaleAmount(r.amount, percent) })),
  });
}
