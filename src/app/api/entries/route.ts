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
  const campaignId = searchParams.get("campaignId");
  const likeTerm = `%${search}%`;

  const { rows: boundaryRows } = await sql`
    SELECT date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi' AS business_day_start
  `;
  const businessDayStart = boundaryRows[0].business_day_start;

  const { rows: countRows } = await sql`
    SELECT COUNT(*)::int AS total
    FROM entries e
    WHERE e.phone_number ILIKE ${likeTerm}
      AND (${campaignId}::int IS NULL OR e.campaign_id = ${campaignId}::int)
      AND (${isAdmin} OR e.created_at >= ${businessDayStart})
  `;

  const { rows } = await sql`
    SELECT e.id, e.phone_number, e.created_at, c.name AS campaign_name
    FROM entries e
    JOIN campaigns c ON c.id = e.campaign_id
    WHERE e.phone_number ILIKE ${likeTerm}
      AND (${campaignId}::int IS NULL OR e.campaign_id = ${campaignId}::int)
      AND (${isAdmin} OR e.created_at >= ${businessDayStart})
    ORDER BY e.created_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  return NextResponse.json({ entries: rows, total: countRows[0].total, page, perPage });
}
