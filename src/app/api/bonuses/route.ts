import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 10);
  const offset = (page - 1) * perPage;

  try {
    // 1. Extract total count of payouts
    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int AS total 
      FROM bonus_payouts
    `;

    // 2. Extract paginated payout transaction history logs
    const { rows } = await sql`
      SELECT 
        id, 
        period, 
        phone_number, 
        total_spent, 
        amount, 
        status, 
        created_at 
      FROM bonus_payouts 
      ORDER BY period DESC 
      LIMIT ${perPage} 
      OFFSET ${offset}
    `;

    // FIXED: Formatted array index bounds with safe fallback parameter defaults
    const grandTotalEntries = countRows && countRows.length > 0 ? countRows[0].total : 0;

    return NextResponse.json({ 
      payouts: rows, 
      total: grandTotalEntries, 
      page, 
      perPage 
    });

  } catch (error) {
    console.error("Failed to query bonus payouts data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
