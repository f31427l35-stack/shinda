import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendSms, packageLabel } from "@/lib/onfonSms";

// --- Routing config (must match app/api/ussd/route.ts) ---------------------
const ALT_TO_MAIN_THRESHOLD = 10; // completed alt-account orders needed before reverting to main

// Explicit interfaces to ensure type safety during database operations
interface OrderRow {
  phone_number: string;
  package_size: string;
}

interface AltTrackerRow {
  phone_number: string;
  package_size: string;
  price: number;
  session_id: string;
}

interface CountRow {
  count: number;
}

interface TotalRow {
  total: number;
}

interface ProductPriceRow {
  package_size: string;
  price: string | number;
}

function getPureRandomValue(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

// B2C Payout engine updated to use the credentials of the account handling the order
async function initiateB2cPayout(phone: string, amount: number, useAltCredentials = false) {
  const username = useAltCredentials 
    ? (process.env.UPESIPAY_ALT_USERNAME || process.env.UPESIPAY_API_USERNAME)
    : process.env.UPESIPAY_API_USERNAME;
    
  const password = useAltCredentials
    ? (process.env.UPESIPAY_ALT_PASSWORD || process.env.UPESIPAY_API_PASSWORD)
    : process.env.UPESIPAY_API_PASSWORD;

  const authToken = Buffer.from(`${username}:${password}`).toString("base64");
  
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

function generateBoxScoreboard(pickedBoxCode: number): string {
  const totalBoxes = 5;
  const scoreboard: string[] = [];

  let secondaryZeroBox: number;
  do {
    secondaryZeroBox = Math.floor(Math.random() * totalBoxes) + 1;
  } while (secondaryZeroBox === pickedBoxCode);

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

    const isPaymentSuccess = status === "success" || status === "completed";

    // -------------------------------------------------------------------------
    // STEP 1: ROUTE AND MANAGE MAIN ACCOUNT PAYMENTS
    // -------------------------------------------------------------------------
    const mainOrderCheck = await sql`SELECT id FROM orders WHERE checkout_request_id = ${checkout_request_id}`;
    
    if ((mainOrderCheck.rowCount ?? 0) > 0) {
      if (isPaymentSuccess) {
        const { rows } = await sql<OrderRow>`
          UPDATE orders 
          SET status = 'paid', paid_at = now(), receipt_number = ${reference_id || null} 
          WHERE checkout_request_id = ${checkout_request_id} 
          RETURNING phone_number, package_size
        `;
        
        // Main success event: Increment persistent system routing counter.
        // Upsert so this can never silently no-op if the row/table state is unexpected,
        // and stamp updated_at so the USSD route can detect 10-minute inactivity.
        await sql`
          INSERT INTO system_counters (key, value, updated_at) VALUES ('main_account_successes', 1, now())
          ON CONFLICT (key) DO UPDATE SET value = system_counters.value + 1, updated_at = now()
        `;
        
        const order = rows[0];
        if (order) {
          await executeCampaignLotteryEngine(order, checkout_request_id, false);
        }
      } else {
        const { rows } = await sql<OrderRow>`
          UPDATE orders SET status = ${status} WHERE checkout_request_id = ${checkout_request_id} RETURNING phone_number, package_size
        `;
        const order = rows[0];
        if (order) {
          await triggerMissedTeaserSms(order.phone_number, order.package_size);
        }
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // -------------------------------------------------------------------------
    // STEP 2: ROUTE AND MANAGE ALTERNATIVE ACCOUNT PAYMENTS
    // -------------------------------------------------------------------------
    const altOrderCheck = await sql<AltTrackerRow>`
      SELECT phone_number, package_size, price, session_id 
      FROM alt_account_tracker 
      WHERE checkout_request_id = ${checkout_request_id}
    `;
    
    if ((altOrderCheck.rowCount ?? 0) > 0) {
      const altRecord = altOrderCheck.rows[0];

      if (isPaymentSuccess) {
        // Mark the tracking entity as completed
        await sql`UPDATE alt_account_tracker SET status = 'completed' WHERE checkout_request_id = ${checkout_request_id}`;
        
        // Evaluate dynamic marketing features for alternative user
        await executeCampaignLotteryEngine(
          { phone_number: altRecord.phone_number, package_size: altRecord.package_size }, 
          checkout_request_id, 
          true
        );

        // Query historical successes within the alternative cycle container
        const currentCycleTracker = await sql<CountRow>`SELECT COUNT(*)::int as count FROM alt_account_tracker WHERE status = 'completed'`;
        
        const alternativeSuccessQuota = currentCycleTracker.rows[0]?.count ?? 0;

        // Return to Main once ALT_TO_MAIN_THRESHOLD successful alt-account orders are met
        if (alternativeSuccessQuota >= ALT_TO_MAIN_THRESHOLD) {
          await sql`TRUNCATE TABLE alt_account_tracker`;
          await sql`UPDATE system_counters SET value = 0, updated_at = now() WHERE key = 'main_account_successes'`;
          console.log("[DYNAMIC ROUTER] Alternative quota complete. Active gateway reverted back to main pipeline.");
        }


      } else {
        // Alternative order failed. Log to core transaction grid, then strip tracking trace.
        await sql`
          INSERT INTO orders (phone_number, session_id, package_size, quantity, unit_price, total_amount, status, checkout_request_id) 
          VALUES (${altRecord.phone_number}, ${altRecord.session_id}, ${altRecord.package_size}, 1, ${altRecord.price}, ${altRecord.price}, ${status}, ${checkout_request_id})
        `;
        
        await sql`DELETE FROM alt_account_tracker WHERE checkout_request_id = ${checkout_request_id}`;
        await triggerMissedTeaserSms(altRecord.phone_number, altRecord.package_size);
      }
      
      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// Extraction block isolating campaign rewards & SMS processing flows
async function executeCampaignLotteryEngine(order: { phone_number: string; package_size: string }, checkout_request_id: string, isAltAccount: boolean) {
  const cleanSizeString = String(order.package_size || "").trim().toUpperCase();
  const userPickedCode = Number(cleanSizeString.replace("BOX_", "")) || 1;
  const visualLabelName = packageLabel(order.package_size);

  let didUserWinLottery = false;
  let dynamicPrizePayout = 0;

  try {
    const { rows: configRows } = await sql<ProductPriceRow>`SELECT package_size, price FROM product_prices`;
    const lookup = (key: string, fb: number) => {
      const found = configRows.find(r => r.package_size === key);
      return found ? Number(found.price) : fb;
    };
    
    const minWin = lookup('MIN_WIN', 50);
    const maxWin = lookup('MAX_WIN', 500);
    const winProbability = lookup('WIN_PROB', 20);
    const milestone = lookup('MILESTONE', 10);

    const { rows: countRows } = await sql<TotalRow>`SELECT COUNT(*)::int AS total FROM orders WHERE status = 'paid'`;
    const successfulEntriesCount = countRows[0]?.total ?? 0;

    if (successfulEntriesCount > 0 && successfulEntriesCount % milestone === 0) {
      const winRoll = Math.random() * 100;
      
      if (winRoll <= winProbability) {
        dynamicPrizePayout = getPureRandomValue(minWin, maxWin);
        const payoutRes = await initiateB2cPayout(order.phone_number, dynamicPrizePayout, isAltAccount);
        
        if (payoutRes.ok) {
          didUserWinLottery = true;
          if (!isAltAccount) {
            await sql`UPDATE orders SET delivery_status = 'delivered' WHERE checkout_request_id = ${checkout_request_id}`;
          }
        }
      }
    }
  } catch (lotteryErr) {
    console.error("Lottery Processing Failure:", lotteryErr);
  }

  const boxListScoreboard = generateBoxScoreboard(userPickedCode);

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

// Extraction block isolating cancellation / failed text teaser distributions
async function triggerMissedTeaserSms(phone: string, packageSize: string) {
  const visualLabelName = packageLabel(packageSize);
  const missedAmount = getPureRandomValue(20000, 100000);

  await sendSms(
    phone,
    `You did not complete your payment for ${visualLabelName}! You missed out—this box could have won you KES ${missedAmount.toLocaleString()}! Don't lose out again. Dial back in right now to open another box!`
  );
}
