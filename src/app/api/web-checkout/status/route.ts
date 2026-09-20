import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutRequestId = searchParams.get("checkoutRequestId");

    if (!checkoutRequestId) {
      return NextResponse.json({ status: "unknown", error: "Missing reference tracker" }, { status: 400 });
    }

    // Pull status directly via checkout_request_id (matching what your existing callback modifies)
    const orderCheck = await sql`SELECT status FROM orders WHERE checkout_request_id = ${checkoutRequestId} LIMIT 1`;

    if ((orderCheck.rowCount ?? 0) === 0) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    const currentStatus = orderCheck.rows[0].status; // returns 'awaiting_payment', 'paid', or 'failed'

    return NextResponse.json({ status: currentStatus });
  } catch (error) {
    console.error("Status check endpoint glitch:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
