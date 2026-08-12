import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const { rows } = await sql`SELECT package_size, price FROM product_prices`;
    const findConfig = (key: string, fallback: number) => {
      const match = rows.find(r => r.package_size === key);
      return match ? Number(match.price) : fallback;
    };

    return NextResponse.json({ 
      min_price: findConfig('MIN', 100), 
      max_price: findConfig('MAX', 1000),
      min_win: findConfig('MIN_WIN', 50),
      max_win: findConfig('MAX_WIN', 500),
      win_probability: findConfig('WIN_PROB', 20),
      entry_milestone: findConfig('MILESTONE', 10)
    });
  } catch {
    return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { minPrice, maxPrice, minWin, maxWin, winProbability, entryMilestone } = await req.json();

    const params = [
      { key: 'MIN', val: minPrice }, { key: 'MAX', val: maxPrice },
      { key: 'MIN_WIN', val: minWin }, { key: 'MAX_WIN', val: maxWin },
      { key: 'WIN_PROB', val: winProbability }, { key: 'MILESTONE', val: entryMilestone }
    ];

    for (const item of params) {
      await sql`
        INSERT INTO product_prices (package_size, price, updated_at) 
        VALUES (${item.key}, ${item.val}, now()) 
        ON CONFLICT (package_size) DO UPDATE SET price = ${item.val}, updated_at = now()
      `;
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}
