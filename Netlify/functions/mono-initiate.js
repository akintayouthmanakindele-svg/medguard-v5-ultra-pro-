// netlify/functions/mono-initiate.js
// Called by the frontend when user clicks "Pay with Mono"
// Returns a payment_id that the Mono Connect widget needs
// ENV VARS required in Netlify dashboard:
//   MONO_SECRET_KEY   — from app.withmono.com
//   ALLOWED_ORIGIN    — your Netlify domain e.g. https://medguard-v5.netlify.app

const MONO_API = "https://api.withmono.com/v2/payments/initiate";

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || "";

  // CORS
  const headers = {
    "Access-Control-Allow-Origin":  process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { amount, type, description, reference, email } = body;

  if (!amount || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "amount and email required" }) };
  }

  try {
    const resp = await fetch(MONO_API, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "mono-sec-key":  process.env.MONO_SECRET_KEY,
      },
      body: JSON.stringify({
        amount,
        type:        type || "onetime-debit",
        description: description || "MedGuard Pro Subscription",
        reference:   reference   || `medguard_${Date.now()}`,
        redirect_url:"https://medguard-v5.netlify.app/?payment=success",
        meta: { email },
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Mono error:", data);
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: data.message || "Mono API error" }) };
    }

    // Return only what the frontend needs — never expose secret key
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ payment_id: data.data?.id || data.payment_id }),
    };
  } catch (err) {
    console.error("mono-initiate error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
