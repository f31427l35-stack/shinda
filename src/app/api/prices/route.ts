import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { rows } = await sql`
    SELECT package_size, price FROM product_prices ORDER BY package_size
  `;

  return NextResponse.json({ prices: rows });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { prices } = await req.json();
  if (!Array.isArray(prices)) {
    return NextResponse.json({ error: "prices must be an array." }, { status: 400 });
  }

  for (const p of prices) {
    const size = String(p.package_size || "");
    const price = Number(p.price);
    if (!size || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: `Invalid price for ${size || "unknown size"}.` }, { status: 400 });
    }
    await sql`
      INSERT INTO product_prices (package_size, price, updated_at)
      VALUES (${size}, ${price}, now())
      ON CONFLICT (package_size) DO UPDATE SET price = ${price}, updated_at = now()
    `;
  }

  const { rows } = await sql`
    SELECT package_size, price FROM product_prices ORDER BY package_size
  `;

  return NextResponse.json({ prices: rows });
}
