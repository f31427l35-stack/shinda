import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";
import { getRevenueViewPercent, scaleAmount } from "@/lib/viewPercent";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const isAdmin = auth.user.role === "admin";
  const percent = await getRevenueViewPercent(auth.user.id);

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "weekly" || searchParams.get("period") === "monthly"
    ? searchParams.get("period")
    : "daily";

  const { rows: boundaryRows } = await sql`
    SELECT date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi' AS business_day_start
  `;
  const businessDayStart = boundaryRows[0].business_day_start;

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

  const paidToday = scaleAmount(paidTodayRows[0]?.paid_today || 0, percent);
  const newOrdersToday = newOrdersTodayRows[0]?.new_orders_today || 0;
  const sessionsToday = sessionsTodayRows[0]?.sessions_today || 0;

  if (!isAdmin) {
    return NextResponse.json({
      isAdmin: false,
      paidToday,
      newOrdersToday,
      sessionsToday,
      totalPaidOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      perDay: [],
    });
  }

  const { rows: totalRows } = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid')::int AS total_paid_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::int AS total_revenue,
      COUNT(DISTINCT phone_number)::int AS total_customers
    FROM orders
  `;

  let chartRows;
  if (period === "monthly") {
    ({ rows: chartRows } = await sql`
      SELECT to_char(d.month, 'YYYY-MM') AS day,
             COALESCE(SUM(o.total_amount), 0)::int AS amount
      FROM generate_series(
        date_trunc('month', now() AT TIME ZONE 'Africa/Nairobi') - interval '11 months',
        date_trunc('month', now() AT TIME ZONE 'Africa/Nairobi'),
        interval '1 month'
      ) AS d(month)
      LEFT JOIN orders o
        ON o.status = 'paid'
        AND date_trunc('month', o.paid_at AT TIME ZONE 'Africa/Nairobi') = d.month
      GROUP BY 1
      ORDER BY 1
    `);
  } else if (period === "weekly") {
    ({ rows: chartRows } = await sql`
      SELECT to_char(d.week, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(o.total_amount), 0)::int AS amount
      FROM generate_series(
        date_trunc('week', now() AT TIME ZONE 'Africa/Nairobi') - interval '11 weeks',
        date_trunc('week', now() AT TIME ZONE 'Africa/Nairobi'),
        interval '1 week'
      ) AS d(week)
      LEFT JOIN orders o
        ON o.status = 'paid'
        AND date_trunc('week', o.paid_at AT TIME ZONE 'Africa/Nairobi') = d.week
      GROUP BY 1
      ORDER BY 1
    `);
  } else {
    ({ rows: chartRows } = await sql`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(o.total_amount), 0)::int AS amount
      FROM generate_series(
        date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') - interval '29 days',
        date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi'),
        interval '1 day'
      ) AS d(day)
      LEFT JOIN orders o
        ON o.status = 'paid'
        AND date_trunc('day', o.paid_at AT TIME ZONE 'Africa/Nairobi') = d.day
      GROUP BY 1
      ORDER BY 1
    `);
  }

  return NextResponse.json({
    isAdmin: true,
    paidToday,
    newOrdersToday,
    sessionsToday,
    totalPaidOrders: totalRows[0]?.total_paid_orders || 0,
    totalRevenue: scaleAmount(totalRows[0]?.total_revenue || 0, percent),
    totalCustomers: totalRows[0]?.total_customers || 0,
    perDay: chartRows.map((r) => ({ date: r.day, amount: scaleAmount(r.amount, percent) })),
  });
}
