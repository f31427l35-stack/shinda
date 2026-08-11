import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

// GET: Fetches the current min/max values to show in the UI modal
export async function GET() {
  try {
    const { rows } = await sql`
      SELECT min_price, max_price FROM configurations WHERE id = 1 LIMIT 1
    `;
    
    if (rows.length === 0) {
      return NextResponse.json({ min_price: 100, max_price: 1000 });
    }
    
    return NextResponse.json({ 
      min_price: rows[0].min_price, 
      max_price: rows[0].max_price 
    });
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// PATCH: This saves the changing boundaries back into the DB
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const { minPrice, maxPrice } = await req.json();

    if (minPrice === undefined || maxPrice === undefined) {
      return NextResponse.json({ error: "Missing limits" }, { status: 400 });
    }

    // Persist boundaries permanently inside configuration tracker
    await sql`
      UPDATE configurations 
      SET min_price = ${minPrice}, max_price = ${maxPrice} 
      WHERE id = 1
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to persist configurations" }, { status: 500 });
  }
}
