import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// UpesiPay POSTs here once the STK push resolves (customer entered PIN,
// cancelled, or it timed out). Payload shape per their docs:
// { merchant_request_id, checkout_request_id, reference_id, status }
// status is one of: success | failed | cancelled | timeout
//
// Must return HTTP 200-204 or UpesiPay will retry the callback.

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { checkout_request_id, status, reference_id } = payload;

    if (!checkout_request_id || !status) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (status === "success") {
      await sql`
        UPDATE orders
        SET status = 'paid', paid_at = now(), receipt_number = ${reference_id || null}
        WHERE checkout_request_id = ${checkout_request_id}
      `;
    } else {
      // failed | cancelled | timeout
      await sql`
        UPDATE orders
        SET status = ${status}
        WHERE checkout_request_id = ${checkout_request_id}
      `;
    }

    // Orders now sitting with status = 'paid' and delivery_status = 'pending'
    // are ready for your mum to fulfill. A simple dashboard/query over the
    // orders table (e.g. "SELECT * FROM orders WHERE status='paid' AND
    // delivery_status='pending'") covers that until you want something
    // fancier — happy to build that next if useful.

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Payment callback error:", err);
    // Still return 200 so UpesiPay doesn't hammer retries on a payload we
    // couldn't parse; the transaction status endpoint can be polled to
    // reconcile if needed.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
