import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");

  const { rows } = await sql`
    SELECT w.id, w.phone_number, w.picked_at, c.name AS campaign_name, u.name AS picked_by_name
    FROM winners w
    JOIN campaigns c ON c.id = w.campaign_id
    LEFT JOIN admin_users u ON u.id = w.picked_by
    WHERE (${campaignId}::int IS NULL OR w.campaign_id = ${campaignId}::int)
    ORDER BY w.picked_at DESC
  `;

  return NextResponse.json({ winners: rows });
}
