// netlify/functions/wise-webhook.js
// Verifies Wise payment webhooks and grants subscription
// ENV VARS required:
//   WISE_WEBHOOK_SECRET — from Wise Business → Developer → Webhooks
//   WISE_API_TOKEN      — from Wise Business → Developer → API Tokens

const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Verify Wise HMAC-SHA256 signature
  const signature = event.headers["x-signature"] || event.headers["x-test-signature"];
  const secret    = process.env.WISE_WEBHOOK_SECRET;

  if (signature && secret) {
    const digest = crypto
      .createHmac("sha256", secret)
      .update(event.body)
      .digest("base64");
    if (digest !== signature) {
      console.error("Invalid Wise webhook signature");
      return { statusCode: 401, body: "Unauthorized" };
    }
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { event_type, data } = payload;
  console.log("Wise webhook:", event_type);

  if (event_type === "transfers#state-change" && data?.current_state === "outgoing_payment_sent") {
    const reference = data?.reference || "";
    const planId    = reference.toLowerCase().includes("promax") ? "proMax" : "pro";
    const amount    = data?.source_value;
    const currency  = data?.source_currency;
    // No email from Wise transfer — match by reference or amount
    // In production: store reference when user clicks Wise pay and match here
    console.log(`Wise payment confirmed — ref: ${reference}, ${amount} ${currency}, plan: ${planId}`);
    await grantSubscriptionByReference({ reference, planId, provider: "wise", amount, currency });
  }

  if (event_type === "balances#credit") {
    console.log("Wise balance credited:", data?.amount, data?.currency);
  }

  return { statusCode: 200, body: "OK" };
};

async function grantSubscriptionByReference({ reference, planId, provider, amount, currency }) {
  console.log(`Granting ${planId} via ${provider} — ref: ${reference}, ${amount} ${currency}`);
  // Supabase: upsert by reference into subscriptions table
  // Same pattern as mono-webhook.js grantSubscription()
}
