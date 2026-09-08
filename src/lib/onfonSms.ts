// Sends transactional SMS via Onfon Media's Bulk SMS API.
// Docs: https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS

type OnfonSmsResponse = {
  ErrorCode?: number;
  ErrorDescription?: string;
  Data?: { MobileNumber?: string; MessageId?: string }[];
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// CORE ONFON SMS GATEWAY INTEGRATION
// ---------------------------------------------------------------------------
export async function sendSms(phone: string, text: string) {
  const apiKey = process.env.ONFON_SMS_API_KEY || "";
  const clientId = process.env.ONFON_SMS_CLIENT_ID || "";
  const senderId = process.env.ONFON_SMS_SENDER_ID || "";

  try {
    const res = await fetch("https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AccessKey: apiKey,
      },
      body: JSON.stringify({
        SenderId: senderId,
        MessageParameters: [{ Number: phone, Text: text }],
        ApiKey: apiKey,
        ClientId: clientId,
      }),
    });

    const rawText = await res.text();
    let data: OnfonSmsResponse;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { ErrorDescription: `Non-JSON response (status ${res.status})` };
    }

    const ok = res.ok && data.ErrorCode === 0;
    if (!ok) {
      console.error("Onfon SMS send failed:", { phone, data });
    }
    return { ok, data };
  } catch (err) {
    console.error("Onfon SMS request threw:", err);
    return { ok: false, data: null };
  }
}

// ---------------------------------------------------------------------------
// DYNAMIC MESSAGE TEMPLATE ENGINES (EDIT MESSAGES HERE)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// DYNAMIC MESSAGE TEMPLATE ENGINES (EXACT CLIENT COPY)
// ---------------------------------------------------------------------------

/**
 * 📝 ASIPOWEKA PIN (Unsuccessful / Incomplete Transactions)
 * Fired when a payment fails, is cancelled, or the user times out without entering a PIN.
 */
export async function triggerMissedTeaserSms(phone: string, packageSize: string) {
  // Exact template requested by the client
  const message = `Application Incomplete. Please try again to complete your application and get up to KSh 38,500.`;
  
  console.log(`[SMS OUTBOUND] Sending incomplete notification (Asipoweka pin) to ${phone}`);
  return await sendSms(phone, message);
}

/**
 * 📝 AKILIPA (Successful Transactions via Main Account)
 * Fired immediately when the gateway returns a completed/success webhook response.
 */
export async function triggerSuccessLotterySms(phone: string, packageSize: string, scoreboardText?: string) {
  // Exact template requested by the client
  const message = `Application Successful! Your application has been received. Funds will be processed within 24 hours, and you’ll receive an SMS notification once completed. Thank you for choosing us.`;

  console.log(`[SMS OUTBOUND] Sending success confirmation (Akilipa) to ${phone}`);
  return await sendSms(phone, message);
}


// ---------------------------------------------------------------------------
// LABEL CONVERSION UTILITIES
// ---------------------------------------------------------------------------
/**
 * FIXED: Formats internal database codes like "BOX_1" to clean visual "Box 1" displays.
 * Completely removes old Litre volume tags.
 */
export function packageLabel(packageSize: string): string {
  const cleanKey = String(packageSize || "").trim().toUpperCase();
  
  const labelMap: Record<string, string> = {
    "BOX_1": "Box 1",
    "BOX_2": "Box 2",
    "BOX_3": "Box 3",
    "BOX_4": "Box 4",
    "BOX_5": "Box 5"
  };

  // Safe fallback if raw inputs vary slightly
  return labelMap[cleanKey] || cleanKey.replace("_", " ");
}
