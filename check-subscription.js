// netlify/functions/check-subscription.js
// Frontend polls this to verify Pro status server-side
// ENV VARS: SUPABASE_URL, SUPABASE_SERVICE_KEY

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  const email = event.queryStringParameters?.email;
  if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: "email required" }) };

  try {
    // ── Supabase lookup ──────────────────────────────────────────
    // const { createClient } = require("@supabase/supabase-js");
    // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // const { data } = await supabase
    //   .from("subscriptions")
    //   .select("*")
    //   .eq("email", email)
    //   .single();
    // if (!data) return { statusCode: 200, headers, body: JSON.stringify({ active: false }) };
    // const active = data.status === "active" || (data.status === "trialing" && new Date(data.trialEndsAt) > new Date());
    // return { statusCode: 200, headers, body: JSON.stringify({ active, plan: data.planId, status: data.status }) };
    // ─────────────────────────────────────────────────────────────

    // Demo mode — always returns inactive until DB is connected
    return { statusCode: 200, headers, body: JSON.stringify({ active: false, status: "no_db_configured" }) };
  } catch (err) {
    console.error("check-subscription error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal error" }) };
  }
};
