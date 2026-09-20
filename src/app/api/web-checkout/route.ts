import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// ---------------------------------------------------------------------------
// UpesiPay STK Push
// Uses the SAME gateway endpoint and request structure as the existing
// flu_ussd route so web payments follow the same callback flow.
// ---------------------------------------------------------------------------

async function initiateUpesiPayStkPush(
  phone: string,
  amount: number,
  callbackUrl: string
) {
  const username = process.env.UPESIPAY_API_USERNAME;
  const password = process.env.UPESIPAY_API_PASSWORD;

  if (!username || !password) {
    return {
      ok: false,
      checkoutId: null,
      merchantId: null,
      message: "UpesiPay credentials are not configured.",
    };
  }

  const authToken = Buffer.from(
    `${username}:${password}`
  ).toString("base64");

  const channel =
    process.env.UPESIPAY_CHANNEL_ID || "wallet";

  const appUrl =
    process.env.APP_URL || "https://vercel.app";

  try {
    const res = await fetch(
      "https://upesipay.com/api/v2/collections/initiate/",
      {
        method: "POST",

        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          Referer: appUrl,
          Origin: appUrl,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },

        body: JSON.stringify({
          channel_id:
            channel === "wallet"
              ? "wallet"
              : channel,

          phone_number: phone,

          amount: Math.floor(Number(amount)),

          callback_url: callbackUrl,
        }),
      }
    );

    const text = await res.text();

    console.log(
      "Web checkout UpesiPay STK response:",
      text
    );

    let parsedData: any = {};

    try {
      parsedData = text
        ? JSON.parse(text)
        : {};
    } catch {
      parsedData = {};
    }

    const checkoutId =
      parsedData.checkout_request_id ||
      parsedData.data?.checkout_request_id ||
      parsedData.checkout_id;

    const merchantId =
      parsedData.merchant_request_id ||
      parsedData.data?.merchant_request_id ||
      parsedData.merchant_id;

    const hasSucceeded =
      res.ok &&
      (
        parsedData.success === true ||
        parsedData.status === "success" ||
        !!checkoutId
      );

    return {
      ok: hasSucceeded,
      checkoutId: checkoutId || null,
      merchantId: merchantId || null,
      message:
        parsedData.message ||
        null,
    };
  } catch (error) {
    console.error(
      "Web checkout UpesiPay STK error:",
      error
    );

    return {
      ok: false,
      checkoutId: null,
      merchantId: null,
      message: "Network connection breakdown.",
    };
  }
}

// ---------------------------------------------------------------------------
// Web checkout POST
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const {
      phone,
      amount,
      packageSize,
    } = await req.json();

    if (!phone || !amount) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required billing details",
        },
        { status: 400 }
      );
    }

    // Normalize Kenyan phone number.
    let formattedPhone = String(phone)
      .trim()
      .replace(/\s+/g, "");

    if (formattedPhone.startsWith("0")) {
      formattedPhone =
        "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone =
        formattedPhone.slice(1);
    }

    const flooredAmount =
      Math.floor(Number(amount));

    if (
      !Number.isFinite(flooredAmount) ||
      flooredAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment amount",
        },
        { status: 400 }
      );
    }

    const webSessionId =
      `SESS_WEB_${Date.now()}`;

    // Use the same callback as the USSD flow.
    const appUrl =
      process.env.APP_URL ||
      new URL(req.url).origin;

    const callbackUrl =
      `${appUrl}/api/payment-callback`;

    // -----------------------------------------------------------------------
    // 1. Trigger the SAME UpesiPay STK flow used by USSD.
    // -----------------------------------------------------------------------

    const paymentResult =
      await initiateUpesiPayStkPush(
        formattedPhone,
        flooredAmount,
        callbackUrl
      );

    if (
      !paymentResult.ok ||
      !paymentResult.checkoutId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            paymentResult.message ||
            "Gateway communication failure",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. Record the transaction in the SAME orders table used by USSD.
    // -----------------------------------------------------------------------

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
      )
      VALUES (
        ${formattedPhone},
        ${webSessionId},
        ${packageSize || "SECURED"},
        1,
        ${flooredAmount},
        ${flooredAmount},
        'awaiting_payment',
        ${paymentResult.checkoutId},
        ${paymentResult.merchantId}
      )
    `;

    // -----------------------------------------------------------------------
    // 3. Return ONLY the tracker ID to the client.
    // -----------------------------------------------------------------------

    return NextResponse.json({
      success: true,
      message:
        "STK push generated successfully",
      checkoutRequestId:
        paymentResult.checkoutId,
    });
  } catch (error) {
    console.error(
      "Web checkout route execution error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal application processing error",
      },
      { status: 500 }
    );
  }
}
