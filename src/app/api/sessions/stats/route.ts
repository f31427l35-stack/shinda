import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

// Counts every USSD dial-in (one row per unique session in ussd_sessions,
// regardless of whether the caller ever picked a package), bucketed by the
// requested period.

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "weekly" || searchParams.get("period") === "monthly"
    ? searchParams.get("period")
    : "daily";

  let rows;
  if (period === "monthly") {
    ({ rows } = await sql`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS bucket, COUNT(*)::int AS count
      FROM ussd_sessions
      WHERE created_at >= now() - interval '12 months'
      GROUP BY 1
      ORDER BY 1
    `);
  } else if (period === "weekly") {
    ({ rows } = await sql`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS bucket, COUNT(*)::int AS count
      FROM ussd_sessions
      WHERE created_at >= now() - interval '12 weeks'
      GROUP BY 1
      ORDER BY 1
    `);
  } else {
    ({ rows } = await sql`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS bucket, COUNT(*)::int AS count
      FROM ussd_sessions
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
      ORDER BY 1
    `);
  }

  return NextResponse.json({ period, series: rows });
}
