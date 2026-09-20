import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// ---------------------------------------------------------------------------
// UpesiPay configuration
// Uses the SAME environment variables as the working USSD flow.
// ---------------------------------------------------------------------------

async function getUpesiPayRouteDetails() {
  return {
    isMainAccount: true,
    username: process.env.UPESIPAY_API_USERNAME,
    password: process.env.UPESIPAY_API_PASSWORD,
    channel: process.env.UPESIPAY_CHANNEL_ID || "wallet",
  };
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("254")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return "254" + digits.slice(1);
  }

  return "254" + digits;
}

// ---------------------------------------------------------------------------
// UpesiPay STK Push
// Same gateway and request structure as the working USSD flow.
// ---------------------------------------------------------------------------

async function initiateStkPush(
  phone: string,
  amount: number,
  callbackUrl: string
) {
  const route = await getUpesiPayRouteDetails();

  if (!route.username || !route.password) {
    console.error(
      "UpesiPay credentials are missing from the server environment."
    );

    return {
      ok: false,
      isMainAccount: route.isMainAccount,
      checkoutId: null,
      merchantId: null,
      message: "Payment provider is not configured.",
    };
  }

  const authToken = Buffer.from(
    `${route.username}:${route.password}`
  ).toString("base64");

  const channel = route.channel;

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
      isMainAccount: route.isMainAccount,
      checkoutId: checkoutId || null,
      merchantId: merchantId || null,
      message:
        parsedData.message ||
        parsedData.error ||
        (
          res.ok
            ? "STK request was sent."
            : `Payment provider returned HTTP ${res.status}.`
        ),
    };
  } catch (error) {
    console.error(
      "Web checkout UpesiPay STK request error:",
      error
    );

    return {
      ok: false,
      isMainAccount: route.isMainAccount,
      checkoutId: null,
      merchantId: null,
      message:
        "Network connection breakdown while contacting the payment provider.",
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

    if (!phone || amount === undefined || amount === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required billing details.",
        },
        { status: 400 }
      );
    }

    const formattedPhone =
      normalizePhone(String(phone));

    const flooredAmount =
      Math.floor(Number(amount));

    if (
      !Number.isFinite(flooredAmount) ||
      flooredAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment amount.",
        },
        { status: 400 }
      );
    }

    const webSessionId =
      `SESS_WEB_${Date.now()}`;

    // Use the same callback endpoint as the USSD flow.
    const appUrl =
      process.env.APP_URL ||
      new URL(req.url).origin;

    const callbackUrl =
      `${appUrl}/api/payment-callback`;

    // -----------------------------------------------------------------------
    // 1. Send the real UpesiPay STK request.
    // -----------------------------------------------------------------------

    const paymentResult =
      await initiateStkPush(
        formattedPhone,
        flooredAmount,
        callbackUrl
      );

    if (
      !paymentResult.ok ||
      !paymentResult.checkoutId
    ) {
      console.error(
        "Web checkout STK failed:",
        paymentResult.message
      );

      return NextResponse.json(
        {
          success: false,
          message:
            paymentResult.message ||
            "Unable to start the M-Pesa payment request.",
        },
        { status: 502 }
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
    // 3. Return the real UpesiPay checkout request ID.
    // -----------------------------------------------------------------------

    return NextResponse.json({
      success: true,
      message:
        "STK push generated successfully.",
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
          "Internal application processing error.",
      },
      { status: 500 }
    );
  }
}
