# 🚀 Deploy Checklist — Do This Before Going Live

## Step 1 — Replace Keys in src/ClinicalEvaluatorApp.jsx

Search and replace these strings (Ctrl+H in VS Code):

1. REPLACE_WITH_YOUR_COMPANY_NAME        → Your company name
2. gsk_REPLACE_GROQ_KEY_1                → Groq key from account 1
3. gsk_REPLACE_GROQ_KEY_2                → Groq key from account 2
4. gsk_REPLACE_GROQ_KEY_3                → Groq key from account 3
5. gsk_REPLACE_GROQ_KEY_4                → Groq key from account 4
6. gsk_REPLACE_GROQ_KEY_5                → Groq key from account 5
7. live_pk_REPLACE_WITH_YOUR_MONO_PUBLIC_KEY → Mono public key
8. REPLACE_WITH_PRO_LINK (Wise)          → Wise payment link (Pro)
9. REPLACE_WITH_PRO_MAX_LINK (Wise)      → Wise payment link (Pro Max)
10. REPLACE_WITH_HELIO_PRO_LINK          → Helio/MoonPay Pro link
11. REPLACE_WITH_HELIO_PRO_MAX_LINK      → Helio/MoonPay Pro Max link
12. REPLACE_WITH_WALLETCONNECT_PROJECT_ID → WalletConnect ID
13. Admin password hash (see README)

## Step 2 — Add Your Icons

Put in public/icons/:
- icon-192.png  (use your caduceus logo SVG → convert to PNG)
- icon-512.png

## Step 3 — Deploy Backend Webhook (Mono payments)

Deploy medguard-payment-webhooks.js as a Netlify Function:
- Copy to netlify/functions/mono-initiate.js
- Set MONO_SECRET_KEY in Netlify environment variables
- Set LEMONSQUEEZY_WEBHOOK_SECRET if using Wise webhooks

## Step 4 — Push to GitHub

git init
git add .
git commit -m "MedGuard v5 — initial production release"
git remote add origin https://github.com/YOUR_USERNAME/medguard-v5.git
git push -u origin main

## Step 5 — Connect Netlify

1. app.netlify.com → New site → Import from GitHub
2. Select medguard-v5 repo
3. Build command: npm run build
4. Publish directory: dist
5. Click Deploy

## Step 6 — Set Custom Domain (optional)

In Netlify: Domain settings → Add custom domain
Point your DNS A record to Netlify's IP

## Step 7 — Test Before Announcing

- [ ] Drug reference loads offline
- [ ] IV calculator works offline
- [ ] Risk scores work offline
- [ ] Pro subscription trial flow works
- [ ] Admin panel opens (5-tap on logo)
- [ ] PDF download works
- [ ] Dark mode toggles
- [ ] Voice input activates (Chrome/Edge)
- [ ] Camera scanner requests permission
- [ ] SOAP deep link populates form

## Done — You're Live 🚀
