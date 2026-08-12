import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

const INTERVAL_MAP: Record<string, string> = {
  "15m": "15 minutes",
  "30m": "30 minutes",
  "1h": "1 hour",
  "12h": "12 hours",
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("interval") || "15m";
  const bucketInterval = INTERVAL_MAP[key] || INTERVAL_MAP["15m"];

  const { rows: boundaryRows } = await sql`
    SELECT date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi' AS day_start
  `;
  const dayStart = boundaryRows[0].day_start;

  const { rows } = await sql`
    WITH buckets AS (
      SELECT generate_series(
        ${dayStart}::timestamptz,
        now(),
        ${bucketInterval}::interval
      ) AS bucket
    ),
    revenue_by_bucket AS (
      SELECT date_bin(${bucketInterval}::interval, o.paid_at, ${dayStart}::timestamptz) AS bucket,
             SUM(o.total_amount)::int AS revenue
      FROM orders o
      WHERE o.status = 'paid' AND o.paid_at >= ${dayStart}::timestamptz
      GROUP BY 1
    ),
    sessions_by_bucket AS (
      SELECT date_bin(${bucketInterval}::interval, s.created_at, ${dayStart}::timestamptz) AS bucket,
             COUNT(*)::int AS sessions
      FROM ussd_sessions s
      WHERE s.created_at >= ${dayStart}::timestamptz
      GROUP BY 1
    )
    SELECT
      to_char(b.bucket AT TIME ZONE 'Africa/Nairobi', 'HH24:MI') AS label,
      COALESCE(r.revenue, 0) AS revenue,
      COALESCE(s.sessions, 0) AS sessions
    FROM buckets b
    LEFT JOIN revenue_by_bucket r ON r.bucket = b.bucket
    LEFT JOIN sessions_by_bucket s ON s.bucket = b.bucket
    ORDER BY b.bucket
  `;

  return NextResponse.json({ interval: key, series: rows });
}
