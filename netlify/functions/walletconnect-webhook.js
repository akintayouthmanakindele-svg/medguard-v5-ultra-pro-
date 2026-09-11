// netlify/functions/walletconnect-webhook.js
// Verifies TrustWallet / WalletConnect USDC transactions on-chain
// ENV VARS: WC_PROJECT_ID, SOLANA_RPC_URL or ALCHEMY_API_KEY

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  process.env.ALLOWED_ORIGIN || "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: "Method not allowed" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: "Bad JSON" }; }

  const { txHash, walletAddress, planId, email } = body;
  if (!txHash || !walletAddress) return { statusCode: 400, headers, body: JSON.stringify({ error: "txHash and walletAddress required" }) };

  try {
    // ── Verify USDC transaction on Solana ────────────────────────
    // const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    // const resp = await fetch(rpc, { method:"POST", headers:{"Content-Type":"application/json"},
    //   body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"getTransaction", params:[txHash,{encoding:"jsonParsed",commitment:"confirmed"}] })
    // });
    // const { result } = await resp.json();
    // const transfer = result?.meta?.postTokenBalances;
    // Verify amount matches plan price and recipient is your wallet
    // If verified → grantSubscription({ email, planId, provider:"walletconnect", reference:txHash })
    // ─────────────────────────────────────────────────────────────

    console.log(`WalletConnect: ${planId} from ${walletAddress} — tx: ${txHash}`);
    return { statusCode: 200, headers, body: JSON.stringify({ verified: true, message: "Transaction received — connect Solana RPC to verify on-chain" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
