import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const CLIENT_ORIGIN =
  "https://shinda-clientside.vercel.app";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": CLIENT_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Cache-Control":
      "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } =
      new URL(req.url);

    const checkoutRequestId =
      searchParams.get("checkoutRequestId");

    if (!checkoutRequestId) {
      return NextResponse.json(
        {
          status: "unknown",
          error:
            "Missing checkout request ID",
        },
        {
          status: 400,
          headers: corsHeaders(),
        }
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
      WHERE checkout_request_id =
        ${checkoutRequestId}
      LIMIT 1
    `;

    if ((orderCheck.rowCount ?? 0) === 0) {
      return NextResponse.json(
        {
          status: "not_found",
        },
        {
          status: 404,
          headers: corsHeaders(),
        }
      );
    }

    const order =
      orderCheck.rows[0];

    return NextResponse.json(
      {
        status: order.status,
        phone:
          order.phone_number ?? null,
        totalAmount:
          order.total_amount !== null
            ? Number(order.total_amount)
            : null,
        receiptNumber:
          order.receipt_number ?? null,
        paidAt:
          order.paid_at ?? null,
      },
      {
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Web checkout status error:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
      },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}
