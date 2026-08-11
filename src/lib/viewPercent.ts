import { sql } from "@/lib/db";

/**
 * Looks up how much of the real money figures a given admin_user should be
 * shown (1-100). Always reads fresh from the DB rather than trusting the
 * session cookie, so a change the owner makes in Users takes effect on that
 * person's very next request instead of waiting for them to log in again.
 * Defaults to 100 (real figures) if anything goes wrong.
 */
export async function getRevenueViewPercent(userId: number): Promise<number> {
  try {
    const { rows } = await sql`
      SELECT revenue_view_percent FROM admin_users WHERE id = ${userId}
    `;
    const pct = rows[0]?.revenue_view_percent;
    if (typeof pct !== "number" || pct < 1 || pct > 100) return 100;
    return pct;
  } catch {
    return 100;
  }
}

/** Scales a money amount by a 1-100 percent, rounding to the nearest whole KES. */
export function scaleAmount(amount: number, percent: number): number {
  if (percent >= 100) return amount;
  return Math.round((amount * percent) / 100);
}
