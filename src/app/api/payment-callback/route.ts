import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendSms, packageLabel } from "@/lib/onfonSms";

/**
 * Helper function to generate an unpredictable random whole number 
 * bound securely between the admin settings min and max winning limits.
 */
function getPureRandomValue(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

/**
 * Executes a secure outbound B2C disbursement withdrawal payout via UpesiPay.
 */
async function initiateB2cPayout(phone: string, amount: number) {
  const authToken = Buffer.from(
    `${process.env.UPESIPAY_API_USERNAME}:${process.env.UPESIPAY_API_PASSWORD}`
  ).toString("base64");
  
  try {
    const res = await fetch("https://upesipay.com", {
      method: "POST",
      headers: { 
        Authorization: `Basic ${authToken}`, 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        channel_id: process.env.UPESIPAY_B2C_CHANNEL_ID || "wallet",
        phone_number: phone,
        amount: Number(amount),
        remarks: "Campaign Winner Reward",
      }),
    });

    const rawText = await res.text();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error("UpesiPay B2C returned an unexpected response format:", { 
        status: res.status, 
        rawText: rawText.slice(0, 300) 
      });
      return { ok: false };
    }

    return { ok: res.ok && data.success === true, data };
  } catch (err) {
    console.error("Critical UpesiPay B2C Network Request Exception:", err);
    return { ok: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { checkout_request_id, status, reference_id } = payload;

    if (!checkout_request_id || !status) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (status === "success" || status === "completed") {
      const { rows } = await sql`
        UPDATE orders 
        SET status = 'paid', paid_at = now(), receipt_number = ${reference_id || null} 
        WHERE checkout_request_id = ${checkout_request_id} 
        RETURNING phone_number, package_size
      `;
      
      const order = rows[0];

      if (order) {
        // Send default success confirmation SMS
        await sendSms(
          order.phone_number,
          `Your order for the ${packageLabel(order.package_size)} package has been received and is being processed.`
        );

        // --- WIN ENGINE LOTTERY SYSTEM ---
        try {
          // 1. Fetch system config boundaries from the product_prices tracker table
          const { rows: configRows } = await sql`SELECT package_size, price FROM product_prices`;
          const lookup = (key: string, fb: number) => {
            const found = configRows.find(r => r.package_size === key);
            return found ? Number(found.price) : fb;
          };
          
          const minWin = lookup('MIN_WIN', 50);
          const maxWin = lookup('MAX_WIN', 500);
          const winProbability = lookup('WIN_PROB', 20);
          const milestone = lookup('MILESTONE', 10);

          // 2. Count total successful paid orders to determine milestone intervals
          const { rows: countRows } = await sql`SELECT COUNT(*)::int AS total FROM orders WHERE status = 'paid'`;
          const successfulEntriesCount = countRows[0]?.total ?? 0;

          // 3. Evaluate if this specific successful entry lands exactly on a trigger threshold
          if (successfulEntriesCount > 0 && successfulEntriesCount % milestone === 0) {
            const winRoll = Math.random() * 100;
            
            // 4. Validate if random seed falls within your chosen probability odds
            if (winRoll <= winProbability) {
              const dynamicPrizePayout = getPureRandomValue(minWin, maxWin);
              
              // 5. Fire outbound payout to the customer who just completed their payment
              const payoutRes = await initiateB2cPayout(order.phone_number, dynamicPrizePayout);
              
              if (payoutRes.ok) {
                // Notify the user via SMS about their lucky winning draw
                await sendSms(
                  order.phone_number,
                  `🎉 Congratulations! You have won a cash reward of KES ${dynamicPrizePayout}. It has been disbursed directly to your M-PESA line.`
                );
                
                // Track lottery winners directly inside your orders log record database
                await sql`UPDATE orders SET delivery_status = 'delivered' WHERE checkout_request_id = ${checkout_request_id}`;
              }
            }
          }
        } catch (lotteryErr) {
          console.error("Lottery Processing Failure:", lotteryErr);
          // Fails silently so your base incoming billing sequence doesn't drop
        }
      }
    } else {
      // failed | cancelled | timeout
      const { rows } = await sql`
        UPDATE orders 
        SET status = ${status} 
        WHERE checkout_request_id = ${checkout_request_id} 
        RETURNING phone_number, package_size
      `;
      
      const order = rows[0];
      if (order) {
        await sendSms(
          order.phone_number,
          `Your order for the ${packageLabel(order.package_size)} package was almost complete but the payment was not finished. Please dial in again to complete your order.`
        );
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
