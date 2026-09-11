# MedGuard Ultra Pro v5 — Clinical Intelligence Platform

> A production-ready clinical decision support PWA for clinicians, pharmacists, and medical teams across Africa and globally.

---

## 🚀 Deploy to Netlify (5 minutes)

### Option A — Drag & Drop (fastest)
1. Run `npm install && npm run build` locally
2. Drag the `dist/` folder to [netlify.com/drop](https://netlify.com/drop)
3. Done — live in 30 seconds

### Option B — GitHub + Netlify CI/CD (recommended)
1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
3. Select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Click **Deploy site**

---

## 🔑 Keys to Replace Before Launch

Open `src/ClinicalEvaluatorApp.jsx` and replace these placeholders:

| Placeholder | What it is | Where to get it |
|---|---|---|
| `REPLACE_WITH_YOUR_COMPANY_NAME` | Your company watermark | Your business name |
| `gsk_REPLACE_GROQ_KEY_1..5` | 5 Groq API keys (5 separate accounts) | [console.groq.com](https://console.groq.com) |
| `REPLACE_CLAUDE_KEY_1..5` | 5 Anthropic Claude keys | [console.anthropic.com](https://console.anthropic.com) |
| `live_pk_REPLACE_WITH_YOUR_MONO_PUBLIC_KEY` | Mono public key | [app.withmono.com](https://app.withmono.com) |
| `/.netlify/functions/mono-initiate` | Your Mono backend function | Deploy `medguard-payment-webhooks.js` |
| `REPLACE_WITH_PRO_LINK` (Wise) | Wise payment request link | Wise Business → Request Money |
| `REPLACE_WITH_PRO_MAX_LINK` (Wise) | Wise Pro Max payment link | Wise Business → Request Money |
| `REPLACE_WITH_HELIO_PRO_LINK` | Helio USDC payment link | [app.hel.io](https://app.hel.io) |
| `REPLACE_WITH_HELIO_PRO_MAX_LINK` | Helio Pro Max USDC link | [app.hel.io](https://app.hel.io) |
| `REPLACE_WITH_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `52d747...` (ADMIN_EMAIL_HASH) | SHA-256 of your admin email | `node -e "require('crypto').createHash('sha256').update('you@email.com').digest('hex')"` |
| `b1d24f...` (ADMIN_PASS_HASH) | SHA-256 of your admin password | Same as above with your password |

> ⚠️ **Change the admin password hash immediately.** The default hash in this file came from a development session.

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + Vite 5
- **Styling:** Inline CSS with design token system
- **AI Engines:** Claude (Anthropic) + Groq (LLaMA 3.3) — 5 keys each, round-robin
- **Payments:** Mono (Nigeria) · Wise (International) · Helio/MoonPay Commerce (Stablecoin) · TrustWallet (Web3)
- **Storage:** Claude Artifact Storage (`window.storage`) → swap for Supabase/PocketBase in production
- **PWA:** Web App Manifest + service worker ready
- **Backend functions:** Netlify Functions (see `medguard-payment-webhooks.js`)

---

## 📱 Features

| Feature | Free | Pro (₦50k/$100/mo) | Pro Max (₦100k/$200/mo) |
|---|---|---|---|
| Drug Reference (16 drugs offline) | ✅ | ✅ | ✅ |
| Antibiotic Empiric Guide (offline) | ✅ | ✅ | ✅ |
| Clinical Calculators (8 offline) | ✅ | ✅ | ✅ |
| Lab Values Reference (offline) | ✅ | ✅ | ✅ |
| IV Infusion Calculator (offline) | ✅ | ✅ | ✅ |
| Risk Scores — CURB65/qSOFA/GCS | ✅ | ✅ | ✅ |
| Full Clinical Evaluation (AI) | ❌ | ✅ | ✅ |
| PDF Report Download | ❌ | ✅ | ✅ |
| Ward Round Batch (10 patients) | ❌ | ✅ | ✅ |
| Camera Lab Sheet Scanner | ❌ | ✅ | ✅ |
| Voice Input (Smart Capture) | ❌ | ✅ | ✅ |
| SOAP Scribe Integration | ❌ | ✅ | ✅ |
| Advanced Interaction Matrix | ❌ | ✅ | ✅ |
| Team sharing (10 clinicians) | ❌ | ❌ | ✅ |
| Priority evaluation queue | ❌ | ❌ | ✅ |
| Batch history export | ❌ | ❌ | ✅ |

---

## 🔗 SOAP Scribe Integration

From your ambient AI scribe app, open MedGuard with patient data pre-filled:

```javascript
// In your SOAP scribe app
const patientData = {
  patientName: "Amaka Okonkwo",
  age: "72",
  weight: "52",
  drug: "Vancomycin",
  amountMg: "1500",
  indication: "Bacterial Infection",
  notes: "SOAP context: Suspected MRSA bacteraemia..."
};

const url = `https://YOUR-MEDGUARD-URL/?source=soap&data=${btoa(JSON.stringify(patientData))}`;
window.open(url, "_blank");

// Or via postMessage if embedded:
medguardWindow.postMessage({ type: "medguard:prefill", data: patientData }, "*");
```

MedGuard sends the result back automatically:
```javascript
window.addEventListener("message", (e) => {
  if (e.data?.type === "medguard:result") {
    const { result, patientContext } = e.data;
    // result.drug, result.dose, result.tag, result.guide, etc.
  }
});
```

---

## 🛡️ Admin Panel

Access by clicking the **MedGuard logo text 5 times rapidly** in the header.

Default credentials were set during build. **Rotate them immediately:**
```bash
node -e "const c=require('crypto'); console.log('Email hash:', c.createHash('sha256').update('your@email.com').digest('hex')); console.log('Pass hash:', c.createHash('sha256').update('YourNewPassword').digest('hex'));"
```

Then replace `ADMIN_EMAIL_HASH` and `ADMIN_PASS_HASH` in `ClinicalEvaluatorApp.jsx`.

---

## ⚖️ Compliance Notes

- No PHI stored permanently (Privacy Mode available)
- Evaluation results hashed into an auditable chain for medico-legal records
- All admin passwords stored as SHA-256 hashes only — never plaintext
- GDPR/HIPAA-aware: Privacy Mode wipes all cached data on toggle

---

## 📞 Support

Built by your development team. For issues, open a GitHub issue or contact your admin.

> ⚠️ Educational and clinical decision support tool. Always verify dosing against official formularies and apply professional clinical judgement.
