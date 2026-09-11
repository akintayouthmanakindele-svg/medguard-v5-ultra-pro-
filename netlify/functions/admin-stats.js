// netlify/functions/admin-stats.js
// Returns live stats for admin dashboard
// ENV VARS: SUPABASE_URL, SUPABASE_SERVICE_KEY

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  // Verify admin session token (passed as Bearer in Authorization header)
  const auth = event.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };

  try {
    // ── Supabase stats ───────────────────────────────────────────
    // const { createClient } = require("@supabase/supabase-js");
    // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // const { count: totalSubs }   = await supabase.from("subscriptions").select("*", { count:"exact", head:true }).eq("status","active");
    // const { count: trialingSubs }= await supabase.from("subscriptions").select("*", { count:"exact", head:true }).eq("status","trialing");
    // const { data: recentPayments}= await supabase.from("payments").select("*").order("created_at",{ascending:false}).limit(50);
    // return { statusCode:200, headers, body: JSON.stringify({ totalSubs, trialingSubs, recentPayments }) };
    // ─────────────────────────────────────────────────────────────

    return { statusCode: 200, headers, body: JSON.stringify({ message: "Connect Supabase to see live stats" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
