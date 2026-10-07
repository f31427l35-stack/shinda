import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const settingResult = await sql`
      SELECT value, updated_at
      FROM system_settings
      WHERE key = 'alt_payment_enabled'
      LIMIT 1
    `;

    const altEnabled =
      settingResult.rows[0]?.value === "true";

    const statsResult = await sql`
      SELECT
        COUNT(*)::int AS total_transactions,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS successful_transactions,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_transactions,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_transactions,
        COALESCE(
          SUM(amount) FILTER (WHERE status = 'paid'),
          0
        )::numeric AS successful_amount
      FROM alt_payment_transactions
    `;

    const transactionsResult = await sql`
      SELECT
        id,
        checkout_request_id,
        phone_number,
        package_size,
        amount,
        status,
        receipt_number,
        created_at,
        completed_at
      FROM alt_payment_transactions
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const revenueSeriesResult = await sql`
      SELECT
        TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date,
        COALESCE(
          SUM(amount) FILTER (WHERE status = 'paid'),
          0
        )::numeric AS amount,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS successful_transactions,
        COUNT(*)::int AS total_transactions
      FROM alt_payment_transactions
      GROUP BY created_at::date
      ORDER BY created_at::date ASC
      LIMIT 365
    `;

    return NextResponse.json({
      altEnabled,
      updatedAt: settingResult.rows[0]?.updated_at || null,
      stats: {
        totalTransactions: statsResult.rows[0]?.total_transactions || 0,
        successfulTransactions:
          statsResult.rows[0]?.successful_transactions || 0,
        failedTransactions:
          statsResult.rows[0]?.failed_transactions || 0,
        pendingTransactions:
          statsResult.rows[0]?.pending_transactions || 0,
        successfulAmount:
          Number(statsResult.rows[0]?.successful_amount || 0),
      },
      revenueSeries: revenueSeriesResult.rows.map((row) => ({
        date: row.date,
        amount: Number(row.amount || 0),
        successfulTransactions: row.successful_transactions || 0,
        totalTransactions: row.total_transactions || 0,
      })),
      transactions: transactionsResult.rows,
    });
  } catch (err) {
    console.error("Could not load payment routing settings:", err);

    return NextResponse.json(
      { error: "Could not load payment routing information." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const altEnabled = body?.altEnabled;

    if (typeof altEnabled !== "boolean") {
      return NextResponse.json(
        { error: "altEnabled must be a boolean." },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO system_settings
        (key, value, updated_at)
      VALUES
        ('alt_payment_enabled', ${String(altEnabled)}, now())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = now()
    `;

    return NextResponse.json({
      success: true,
      altEnabled,
      activeAccount: altEnabled ? "ALT" : "MAIN",
    });
  } catch (err) {
    console.error("Could not update payment routing setting:", err);

    return NextResponse.json(
      { error: "Could not change payment account." },
      { status: 500 }
    );
  }
}
