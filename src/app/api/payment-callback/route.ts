import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function getPureRandomValue(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

async function initiateB2cPayout(phone: string, amount: number) {
  const authToken = Buffer.from(`${process.env.UPESIPAY_API_USERNAME}:${process.env.UPESIPAY_API_PASSWORD}`).toString("base64");
  try {
    const res = await fetch("https://upesipay.com", {
      method: "POST",
      headers: { Authorization: `Basic ${authToken}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        channel_id: process.env.UPESIPAY_B2C_CHANNEL_ID || "wallet",
        phone_number: phone,
        amount: amount,
        remarks: "Campaign Winner Reward",
      }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return { ok: res.ok && data.success === true, data };
  } catch {
    return { ok: false, data: null };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Adjust keys based on your UpesiPay callback documentation payload structure
    const checkoutRequestId = body.checkout_request_id || body.data?.checkout_request_id;
    const isSuccess = body.success === true || body.status === "completed";

    if (!isSuccess) {
      await sql`UPDATE orders SET status = 'failed' WHERE checkout_request_id = ${checkoutRequestId}`;
      return NextResponse.json({ received: true });
    }

    // 1. Mark order as paid
    await sql`UPDATE orders SET status = 'delivered' WHERE checkout_request_id = ${checkoutRequestId}`;

    // 2. Fetch the current customer phone number
    const { rows: orderRows } = await sql`SELECT phone_number FROM orders WHERE checkout_request_id = ${checkoutRequestId} LIMIT 1`;
    if (orderRows.length === 0) return NextResponse.json({ received: true });
    const phone = orderRows[0].phone_number;

    // 3. Load configurations limits
    const { rows: configRows } = await sql`SELECT package_size, price FROM product_prices`;
    const lookup = (key: string, fb: number) => {
      const found = configRows.find(r => r.package_size === key);
      return found ? Number(found.price) : fb;
    };
    
    const minWin = lookup('MIN_WIN', 50);
    const maxWin = lookup('MAX_WIN', 500);
    const winProbability = lookup('WIN_PROB', 20);
    const milestone = lookup('MILESTONE', 10);

    // 4. Evaluate dynamic winner entries counting milestone
    const { rows: countRows } = await sql`SELECT COUNT(*)::int AS total FROM orders WHERE status = 'delivered'`;
    const successfulEntriesCount = countRows[0].total;

    if (successfulEntriesCount % milestone === 0) {
      const winRoll = Math.random() * 100;
      if (winRoll <= winProbability) {
        const dynamicPrizePayout = getPureRandomValue(minWin, maxWin);
        
        // Triggers outbound withdrawal safely here after customer cash is confirmed collected!
        await initiateB2cPayout(phone, dynamicPrizePayout);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Callback crash:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
