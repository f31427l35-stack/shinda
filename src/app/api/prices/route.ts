import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/requireAuth";

// GET: Fetches the min and max limits from your product_prices table to show in the UI modal
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const { rows } = await sql`
      SELECT package_size, price FROM product_prices 
      WHERE package_size IN ('MIN', 'MAX')
    `;

    // Map rows to clean variables with fallback defaults if they don't exist yet
    const minRow = rows.find(r => r.package_size === 'MIN');
    const maxRow = rows.find(r => r.package_size === 'MAX');

    return NextResponse.json({ 
      min_price: minRow ? minRow.price : 100, 
      max_price: maxRow ? maxRow.price : 1000 
    });
  } catch (error) {
    console.error("GET prices configuration error:", error);
    return NextResponse.json({ error: "Failed to read pricing configuration" }, { status: 500 });
  }
}

// PATCH: This saves the changing boundaries back into your product_prices table
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { minPrice, maxPrice } = await req.json();

    if (minPrice === undefined || maxPrice === undefined) {
      return NextResponse.json({ error: "Missing required limits" }, { status: 400 });
    }

    if (minPrice <= 0 || maxPrice <= 0 || minPrice > maxPrice) {
      return NextResponse.json({ error: "Invalid pricing boundaries provided" }, { status: 400 });
    }

    // 1. Insert or Update the Minimum price config row
    await sql`
      INSERT INTO product_prices (package_size, price, updated_at) 
      VALUES ('MIN', ${minPrice}, now()) 
      ON CONFLICT (package_size) 
      DO UPDATE SET price = ${minPrice}, updated_at = now()
    `;

    // 2. Insert or Update the Maximum price config row
    await sql`
      INSERT INTO product_prices (package_size, price, updated_at) 
      VALUES ('MAX', ${maxPrice}, now()) 
      ON CONFLICT (package_size) 
      DO UPDATE SET price = ${maxPrice}, updated_at = now()
    `;

    return NextResponse.json({ success: true, min_price: minPrice, max_price: maxPrice });
  } catch (error) {
    console.error("PATCH prices configuration error:", error);
    return NextResponse.json({ error: "Failed to persist configuration" }, { status: 500 });
  }
}
