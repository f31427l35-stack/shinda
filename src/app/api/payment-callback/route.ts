import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendSms, packageLabel } from "@/lib/onfonSms";

function getPureRandomValue(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

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
    try { data = rawText ? JSON.parse(rawText) : {}; } catch { return { ok: false }; }
    return { ok: res.ok && data.success === true, data };
  } catch (err) {
    console.error("Critical UpesiPay B2C Exception:", err);
    return { ok: false };
  }
}

/**
 * HELPER: Generates a randomized vertical box results list where:
 * 1. The user's picked box code is KES 0.
 * 2. Another completely random box code is KES 0.
 * 3. The remaining 3 boxes contain independent random prices between 20k and 100k.
 */
function generateBoxScoreboard(pickedBoxCode: number): string {
  const totalBoxes = 5;
  const scoreboard: string[] = [];

  // Pick a random box code (1 to 5) that is NOT the user's picked box
  let secondaryZeroBox: number;
  do {
    secondaryZeroBox = Math.floor(Math.random() * totalBoxes) + 1;
  } while (secondaryZeroBox === pickedBoxCode);

  // Generate vertical breakdown
  for (let boxNum = 1; boxNum <= totalBoxes; boxNum++) {
    let finalBoxPrice = 0;

    if (boxNum !== pickedBoxCode && boxNum !== secondaryZeroBox) {
      finalBoxPrice = getPureRandomValue(20000, 100000);
    }

    scoreboard.push(`Box ${boxNum}: KES ${finalBoxPrice.toLocaleString()}`);
  }

  return scoreboard.join("\n");
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
        // Extract numeric code from DB size label context (e.g. 'BOX_1' turns into integer 1)
        const cleanSizeString = String(order.package_size || "").trim().toUpperCase();
        const userPickedCode = Number(cleanSizeString.replace("BOX_", "")) || 1;
        const visualLabelName = packageLabel(order.package_size); // Custom formatted 'Box 1' string

        // Default local fallback tracking flags
        let didUserWinLottery = false;
        let dynamicPrizePayout = 0;

        // --- WIN ENGINE LOTTERY SYSTEM SYSTEM EVALUATION ---
        try {
          const { rows: configRows } = await sql`SELECT package_size, price FROM product_prices`;
          const lookup = (key: string, fb: number) => {
            const found = configRows.find(r => r.package_size === key);
            return found ? Number(found.price) : fb;
          };
          
          const minWin = lookup('MIN_WIN', 50);
          const maxWin = lookup('MAX_WIN', 500);
          const winProbability = lookup('WIN_PROB', 20);
          const milestone = lookup('MILESTONE', 10);

          const { rows: countRows } = await sql`SELECT COUNT(*)::int AS total FROM orders WHERE status = 'paid'`;
          const successfulEntriesCount = countRows[0]?.total ?? 0;

          if (successfulEntriesCount > 0 && successfulEntriesCount % milestone === 0) {
            const winRoll = Math.random() * 100;
            
            if (winRoll <= winProbability) {
              dynamicPrizePayout = getPureRandomValue(minWin, maxWin);
              const payoutRes = await initiateB2cPayout(order.phone_number, dynamicPrizePayout);
              
              if (payoutRes.ok) {
                didUserWinLottery = true;
                await sql`UPDATE orders SET delivery_status = 'delivered' WHERE checkout_request_id = ${checkout_request_id}`;
              }
            }
          }
        } catch (lotteryErr) {
          console.error("Lottery Processing Failure:", lotteryErr);
        }

        // Generate the vertical results breakdown containing the two 0 values
        const boxListScoreboard = generateBoxScoreboard(userPickedCode);

        // --- Dispatch Unified Presentation SMS text out ---
        if (didUserWinLottery) {
          await sendSms(
            order.phone_number,
            `Your Pick, ${visualLabelName} has won!\n\n${boxListScoreboard}\n\n🎉 You won an extra cash reward of KES ${dynamicPrizePayout.toLocaleString()} sent directly to your M-PESA!`
          );
        } else {
          await sendSms(
            order.phone_number,
            `Your Pick, ${visualLabelName} has lost!\n\n${boxListScoreboard}\n\nTry your luck again next time to reveal a winning box configuration.`
          );
        }
      }
    } else {
      // failed | cancelled | timeout processing branch
      const { rows } = await sql`
        UPDATE orders SET status = ${status} WHERE checkout_request_id = ${checkout_request_id} RETURNING phone_number, package_size
      `;
      
      const order = rows[0];
      if (order) {
        const visualLabelName = packageLabel(order.package_size);
        await sendSms(
          order.phone_number,
          `Your order for ${visualLabelName} was almost complete, but the payment was not finished. Please dial in again to open your box selection.`
        );
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
