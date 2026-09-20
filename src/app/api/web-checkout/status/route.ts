import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const checkoutRequestId =
      searchParams.get("checkoutRequestId");

    if (!checkoutRequestId) {
      return NextResponse.json(
        {
          status: "unknown",
          error: "Missing checkout request ID",
        },
        { status: 400 }
      );
    }

    const orderCheck = await sql`
      SELECT
        status,
        phone_number,
        total_amount,
        receipt_number,
        paid_at
      FROM orders
      WHERE checkout_request_id = ${checkoutRequestId}
      LIMIT 1
    `;

    if ((orderCheck.rowCount ?? 0) === 0) {
      return NextResponse.json(
        {
          status: "not_found",
        },
        { status: 404 }
      );
    }

    const order = orderCheck.rows[0];

    return NextResponse.json({
      status: order.status,
      phone: order.phone_number ?? null,
      totalAmount:
        order.total_amount !== null
          ? Number(order.total_amount)
          : null,
      receiptNumber:
        order.receipt_number ?? null,
      paidAt:
        order.paid_at ?? null,
    });
  } catch (error) {
    console.error(
      "Web checkout status error:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
      },
      { status: 500 }
    );
  }
}
