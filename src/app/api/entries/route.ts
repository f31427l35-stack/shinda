import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 10);
  const offset = (page - 1) * perPage;
  const campaignId = searchParams.get("campaignId");
  const likeTerm = `%${search}%`;

  try {
    // 1. Fetch total entries matching search criteria
    const { rows: countRows } = await sql`
      SELECT COUNT(*)::int AS total 
      FROM orders e 
      WHERE e.phone_number ILIKE ${likeTerm}
    `;

    // 2. Fetch order entry rows matching search criteria
    const { rows } = await sql`
      SELECT 
        e.id, 
        e.phone_number, 
        e.package_size, 
        e.status AS delivery_status, 
        e.created_at 
      FROM orders e 
      WHERE e.phone_number ILIKE ${likeTerm} 
      ORDER BY e.created_at DESC 
      LIMIT ${perPage} 
      OFFSET ${offset}
    `;

    // FIXED: Key renamed from 'entries' to 'orders' to match what your frontend client is fetching!
    return NextResponse.json({ 
      orders: rows, 
      total: countRows[0]?.total ?? 0, 
      page, 
      perPage 
    });

  } catch (error) {
    console.error("Failed to read orders from database:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
