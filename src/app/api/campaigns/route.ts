import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { rows } = await sql`
    SELECT c.id, c.name, c.keyword, c.is_active, c.prize_description,
           c.starts_at, c.ends_at, c.created_at,
           (SELECT COUNT(*) FROM entries e WHERE e.campaign_id = c.id) AS entry_count,
           (SELECT COUNT(*) FROM winners w WHERE w.campaign_id = c.id) AS winner_count
    FROM campaigns c
    ORDER BY c.created_at DESC
  `;

  return NextResponse.json({ campaigns: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { name, keyword, prize_description, is_active } = await req.json();

  if (!name || !keyword) {
    return NextResponse.json({ error: "Name and keyword are required." }, { status: 400 });
  }

  // If this campaign is being created active, deactivate other active campaigns
  // (schema enforces one active keyword at a time, but this keeps behavior explicit).
  if (is_active !== false) {
    await sql`UPDATE campaigns SET is_active = false WHERE is_active = true`;
  }

  const { rows } = await sql`
    INSERT INTO campaigns (name, keyword, prize_description, is_active)
    VALUES (${name}, ${keyword}, ${prize_description || null}, ${is_active !== false})
    RETURNING id, name, keyword, is_active, prize_description, created_at
  `;

  return NextResponse.json({ campaign: rows[0] }, { status: 201 });
}
