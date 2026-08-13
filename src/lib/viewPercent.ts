import { sql } from "@/lib/db";

/**
 * Looks up how much of the real money figures a given admin_user should be
 * shown (1-100). Always reads fresh from the DB rather than trusting the
 * session cookie, so a change the owner makes in Users takes effect on that
 * person's very next request instead of waiting for them to log in again.
 *
 * Fails CLOSED, not open: if the account can't be found (deleted) or the
 * DB is unreachable, this returns 0 rather than 100. In practice
 * requireAuth()/getSession() already reject a deleted account before this
 * is ever called, so returning 0 here is a second line of defense, not the
 * only one — the goal is that a lookup failure can never mean "show
 * everything."
 */
export async function getRevenueViewPercent(userId: number): Promise<number> {
  try {
    const { rows } = await sql`
      SELECT revenue_view_percent FROM admin_users WHERE id = ${userId}
    `;
    if (rows.length === 0) return 0; // account no longer exists
    const pct = rows[0]?.revenue_view_percent;
    if (typeof pct !== "number" || pct < 1 || pct > 100) return 100;
    return pct;
  } catch {
    return 0;
  }
}

/** Scales a money amount by a 1-100 percent, rounding to the nearest whole KES. */
export function scaleAmount(amount: number, percent: number): number {
  if (percent >= 100) return amount;
  return Math.round((amount * percent) / 100);
}
