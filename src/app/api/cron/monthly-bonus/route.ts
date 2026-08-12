import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { initiateWithdrawal } from "@/lib/upesipay";

// Triggered by Vercel Cron (see vercel.json) on the 1st of every month.
// Rewards whoever spent the most KES the previous month with a fixed bonus,
// set from the Bonuses page. Protected by CRON_SECRET so it can't be hit
// publicly and used to trigger real M-Pesa payouts.

function previousMonthRange() {
  const now = new Date();
  // First day of the current month, in UTC, then step back one month.
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const period = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start, end, period };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { start, end, period } = previousMonthRange();

  const { rows: settingsRows } = await sql`SELECT amount, enabled FROM bonus_settings WHERE id = 1`;
  const settings = settingsRows[0];
  if (!settings || !settings.enabled || settings.amount <= 0) {
    return NextResponse.json({ skipped: true, reason: "Bonus disabled or amount is 0." });
  }

  // Idempotency: if this month's bonus already has a row, don't pay it twice.
  const { rows: existing } = await sql`SELECT id FROM bonus_payouts WHERE period = ${period}`;
  if (existing.length > 0) {
    return NextResponse.json({ skipped: true, reason: `Bonus for ${period} already processed.` });
  }

  const { rows: topSpender } = await sql`
    SELECT phone_number, SUM(total_amount)::int AS total_spent
    FROM orders
    WHERE status = 'paid' AND paid_at >= ${start.toISOString()} AND paid_at < ${end.toISOString()}
    GROUP BY phone_number
    ORDER BY total_spent DESC
    LIMIT 1
  `;

  if (topSpender.length === 0) {
    return NextResponse.json({ skipped: true, reason: `No paid orders found for ${period}.` });
  }

  const { phone_number, total_spent } = topSpender[0];
  const { ok, data } = await initiateWithdrawal(phone_number, settings.amount);

  // ON CONFLICT guards against a rare double-fire of the cron itself.
  await sql`
    INSERT INTO bonus_payouts (period, phone_number, total_spent, amount, withdrawal_id, status, message)
    VALUES (
      ${period}, ${phone_number}, ${total_spent}, ${settings.amount},
      ${data.data?.withdrawal_id ?? null},
      ${ok ? (data.data?.status || "pending") : "failed"},
      ${data.message ?? null}
    )
    ON CONFLICT (period) DO NOTHING
  `;

  return NextResponse.json({
    period,
    phone_number,
    total_spent,
    bonus_amount: settings.amount,
    payout_ok: ok,
  });
}
