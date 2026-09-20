import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// --- UpesiPay STK Push Gateway Request Core ---
async function initiateUpesiPayStkPush(phone: string, amount: number) {
  const username = process.env.UPESIPAY_API_USERNAME;
  const password = process.env.UPESIPAY_API_PASSWORD;
  const authToken = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const res = await fetch("https://upesipay.com", { 
      method: "POST",
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        phone_number: phone, // Expected format: 2547XXXXXXXX
        amount: Number(amount),
        remarks: "Web Loan Processing Fee",
      }),
    });

    const data = await res.json();
    
    return {
      ok: res.ok && data.success === true,
      checkoutRequestId: data.checkout_request_id || data.CheckoutRequestID || null,
      merchantRequestId: data.merchant_request_id || data.MerchantRequestID || null,
      message: data.message || "Failed to trigger checkout authorization push.",
    };
  } catch (err) {
    console.error("UpesiPay STK push API exception:", err);
    return { ok: false, checkoutRequestId: null, merchantRequestId: null, message: "Network connection breakdown." };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone, amount, packageSize } = await req.json();

    if (!phone || !amount) {
      return NextResponse.json({ success: false, message: "Missing required billing details" }, { status: 400 });
    }

    // 1. Sanitize and normalize inputs to Kenyan standard format
    let formattedPhone = phone.trim().replace(/\s+/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.slice(1);
    }

    const flooredAmount = Math.floor(Number(amount));
    const webSessionId = `SESS_WEB_${Date.now()}`;

    // 2. Call UpesiPay API directly using your active environment variables
    const paymentResult = await initiateUpesiPayStkPush(formattedPhone, flooredAmount);

    if (!paymentResult.ok || !paymentResult.checkoutRequestId) {
      return NextResponse.json({ 
        success: false, 
        message: paymentResult.message || "Gateway communication failure" 
      }, { status: 400 });
    }

    // 3. Insert record directly into the main 'orders' database table
    // Maps perfectly into your current database query columns and hooks seamlessly with the callback
    await sql`
      INSERT INTO orders (
        phone_number,
        session_id,
        package_size,
        quantity,
        unit_price,
        total_amount,
        status,
        checkout_request_id,
        merchant_request_id
      ) VALUES (
        ${formattedPhone},
        ${webSessionId},
        ${packageSize || "SECURED"},
        1,
        ${flooredAmount},
        ${flooredAmount},
        'awaiting_payment',
        ${paymentResult.checkoutRequestId},
        ${paymentResult.merchantRequestId}
      )
    `;

    return NextResponse.json({
      success: true,
      message: "UpesiPay STK push generated safely",
      checkoutRequestId: paymentResult.checkoutRequestId
    });

  } catch (error) {
    console.error("Web check-out route execution crash:", error);
    return NextResponse.json({ success: false, message: "Internal application processing error" }, { status: 500 });
  }
}
