import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { rows: todayRows } = await sql`
    SELECT COUNT(*)::int AS entries_today
    FROM entries
    WHERE created_at >= date_trunc('day', now())
  `;

  const { rows: newNumbersRows } = await sql`
    SELECT COUNT(DISTINCT phone_number)::int AS new_numbers_today
    FROM entries
    WHERE created_at >= date_trunc('day', now())
      AND phone_number NOT IN (
        SELECT phone_number FROM entries WHERE created_at < date_trunc('day', now())
      )
  `;

  const { rows: totalRows } = await sql`
    SELECT COUNT(*)::int AS total_entries, COUNT(DISTINCT phone_number)::int AS total_participants
    FROM entries
  `;

  const { rows: perDay } = await sql`
    SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS count
    FROM entries
    WHERE created_at >= now() - interval '30 days'
    GROUP BY 1
    ORDER BY 1
  `;

  const { rows: activeCampaign } = await sql`
    SELECT name, keyword, prize_description FROM campaigns WHERE is_active = true LIMIT 1
  `;

  return NextResponse.json({
    entriesToday: todayRows[0].entries_today,
    newNumbersToday: newNumbersRows[0].new_numbers_today,
    totalEntries: totalRows[0].total_entries,
    totalParticipants: totalRows[0].total_participants,
    perDay: perDay.map((r) => ({ date: r.day, count: r.count })),
    activeCampaign: activeCampaign[0] || null,
  });
}
