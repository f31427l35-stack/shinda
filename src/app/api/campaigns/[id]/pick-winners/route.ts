import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

// Picks N random winners from DISTINCT phone numbers that entered this
// campaign, excluding phone numbers that have already won this campaign
// before (so a repeat winner isn't drawn twice in the same promo).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { count } = await req.json();
  const n = Math.max(1, Math.min(Number(count) || 1, 100));

  // Pick one representative entry per distinct phone number that hasn't
  // already won this campaign, then randomly order and take N.
  const { rows: eligible } = await sql`
    SELECT DISTINCT ON (e.phone_number) e.id, e.phone_number
    FROM entries e
    WHERE e.campaign_id = ${id}
      AND e.phone_number NOT IN (
        SELECT phone_number FROM winners WHERE campaign_id = ${id}
      )
    ORDER BY e.phone_number, e.created_at DESC
  `;

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No eligible entries to draw from." }, { status: 400 });
  }

  // Shuffle (Fisher-Yates) and take the first N.
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, Math.min(n, shuffled.length));

  const inserted = [];
  for (const p of picked) {
    const { rows } = await sql`
      INSERT INTO winners (campaign_id, entry_id, phone_number, picked_by)
      VALUES (${id}, ${p.id}, ${p.phone_number}, ${auth.user.id})
      RETURNING id, phone_number, picked_at
    `;
    inserted.push(rows[0]);
  }

  return NextResponse.json({ winners: inserted, requested: n, available: eligible.length });
}
