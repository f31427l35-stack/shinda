// Sends transactional SMS via Onfon Media's Bulk SMS API.
// Docs: https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS

type OnfonSmsResponse = {
  ErrorCode?: number;
  ErrorDescription?: string;
  Data?: { MobileNumber?: string; MessageId?: string }[];
  [key: string]: unknown;
};

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
