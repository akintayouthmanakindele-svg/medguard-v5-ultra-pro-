// netlify/functions/mono-webhook.js
// Verifies Mono payment webhooks and grants subscription access
// ENV VARS required:
//   MONO_SECRET_KEY      — from app.withmono.com
//   SUPABASE_URL         — your Supabase project URL (or remove and use any DB)
//   SUPABASE_SERVICE_KEY — Supabase service role key

const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // 1. Verify Mono signature
  const signature = event.headers["mono-webhook-secret"] || event.headers["x-mono-signature"];
  const expectedSig = crypto
    .createHmac("sha512", process.env.MONO_SECRET_KEY)
    .update(event.body)
    .digest("hex");

  if (signature !== expectedSig) {
    console.error("Invalid Mono webhook signature");
    return { statusCode: 401, body: "Unauthorized" };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { event: eventType, data } = payload;
  console.log("Mono webhook event:", eventType, JSON.stringify(data));

  if (eventType === "payment.successful") {
    const email    = data?.customer?.email || data?.meta?.email;
    const amount   = data?.amount;
    const ref      = data?.reference;
    const planId   = ref?.includes("proMax") ? "proMax" : "pro";

    if (!email) {
      return { statusCode: 400, body: "No email in payload" };
    }

    // Grant subscription in your database
    await grantSubscription({ email, planId, provider: "mono", reference: ref, amount });
  }

  if (eventType === "payment.failed") {
    console.log("Payment failed:", data?.reference);
    // Optionally send failure email
  }

  return { statusCode: 200, body: "OK" };
};

async function grantSubscription({ email, planId, provider, reference, amount }) {
  const trialEndsAt = new Date(Date.now() + 24*60*60*1000).toISOString(); // 1-day trial
  const renewsAt   = new Date(Date.now() + 30*24*60*60*1000).toISOString();

  console.log(`Granting ${planId} to ${email} via ${provider} — ref: ${reference}`);

  // ── Supabase example ────────────────────────────────────────────
  // Uncomment and configure once you have a Supabase project:
  //
  // const { createClient } = require("@supabase/supabase-js");
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  //
  // const { error } = await supabase.from("subscriptions").upsert({
  //   email, planId, provider, reference, amount,
  //   status: "trialing", trialEndsAt, renewsAt,
  //   createdAt: new Date().toISOString(),
  // }, { onConflict: "email" });
  //
  // if (error) console.error("Supabase error:", error);
  // ────────────────────────────────────────────────────────────────
}
