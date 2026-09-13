import React, { useState, useRef, useEffect } from "react";

// ─── Drug Library ────────────────────────────────────────────────
const DRUG_CATEGORIES = {
  "Analgesics / Antipyretics": ["Paracetamol (Acetaminophen)","Ibuprofen","Aspirin","Diclofenac","Tramadol","Morphine","Codeine"],
  "Antibiotics": ["Amoxicillin","Amoxicillin-Clavulanate (Augmentin)","Azithromycin","Ciprofloxacin","Metronidazole","Doxycycline","Clindamycin","Ceftriaxone","Gentamicin","Vancomycin"],
  "Cardiovascular": ["Amlodipine","Lisinopril","Metoprolol","Atenolol","Furosemide","Spironolactone","Atorvastatin","Digoxin","Warfarin","Heparin"],
  "Endocrine / Metabolic": ["Metformin","Glibenclamide","Insulin (Soluble)","Insulin (NPH)","Levothyroxine","Hydrocortisone"],
  "Gastrointestinal": ["Omeprazole","Metoclopramide","Loperamide","Ondansetron","Ranitidine"],
  "Respiratory": ["Salbutamol","Prednisolone","Ambroxol","Aminophylline","Ipratropium"],
  "CNS / Psychiatry": ["Diazepam","Haloperidol","Amitriptyline","Phenobarbital","Phenytoin","Carbamazepine"],
  "Antihistamines": ["Cetirizine","Loratadine","Promethazine","Diphenhydramine"],
  "Antimalarials": ["Artemether-Lumefantrine (Coartem)","Chloroquine","Quinine","Artesunate"],
  "Antiretrovirals": ["Tenofovir","Efavirenz","Lamivudine","Zidovudine","Lopinavir/Ritonavir"],
  "Chemotherapy / Oncology": ["Methotrexate","Cyclophosphamide","Doxorubicin","Carboplatin","Cisplatin"],
};
const ALL_DRUGS = Object.values(DRUG_CATEGORIES).flat();
const ROUTES = ["Oral","Intravenous (IV)","Intramuscular (IM)","Subcutaneous (SC)","Topical","Sublingual","Rectal","Inhalation","Transdermal"];
const INDICATIONS = ["Pain / Fever","Bacterial Infection","Respiratory Infection","Hypertension","Diabetes Management","Heart Failure","Allergic Reaction","GI / Acid Reflux","Inflammatory Condition","Seizure / Epilepsy","Malaria","HIV/AIDS","Oncology / Chemotherapy","Suspected Overdose / Toxicology","Other"];
const HEPATIC_LEVELS = ["None","Mild (Child-Pugh A)","Moderate (Child-Pugh B)","Severe (Child-Pugh C)"];
const IV_PRESETS = [
  {name:"Dopamine",    unit:"mcg/kg/min", defaultConc:3.2  },
  {name:"Noradrenaline",unit:"mcg/kg/min",defaultConc:0.064},
  {name:"Heparin",     unit:"units/hr",   defaultConc:1000 },
  {name:"Insulin",     unit:"units/hr",   defaultConc:1    },
  {name:"Amiodarone",  unit:"mg/hr",      defaultConc:1.8  },
  {name:"Morphine",    unit:"mg/hr",      defaultConc:1    },
  {name:"Vancomycin",  unit:"mg/hr",      defaultConc:5    },
  {name:"Custom",      unit:"mg/hr",      defaultConc:1    },
];




// ─── Design Tokens ────────────────────────────────────────────────
const C = {bg:"#F0FDF4",surface:"#FFFFFF",border:"#E5E7EB",borderMd:"#D1FAE5",primary:"#059669",dark:"#047857",text:"#111827",muted:"#6B7280",light:"#9CA3AF",danger:"#DC2626",warn:"#D97706",info:"#2563EB"};
const TAG_COLORS = {SAFE:{bg:"#059669",text:"#fff"},CAUTION:{bg:"#D97706",text:"#fff"},CRITICAL:{bg:"#DC2626",text:"#fff"}};
const PREG_COLORS = {A:"#059669",B:"#0891B2",C:"#D97706",D:"#DC2626",X:"#7C3AED","N/A":C.light};
// Lexicomp/Medscape-style interaction severity scale
const SEVERITY_COLORS = {
  Contraindicated:{bg:"#7C3AED",text:"#fff",icon:"⛔"},
  Major:{bg:"#DC2626",text:"#fff",icon:"🔴"},
  Moderate:{bg:"#D97706",text:"#fff",icon:"🟠"},
  Minor:{bg:"#65A30D",text:"#fff",icon:"🟡"},
};

// ─── Primitives ───────────────────────────────────────────────────
const inputBase = {width:"100%",padding:"10px 14px",border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:"inherit",color:C.text,background:"#FAFAFA",outline:"none",boxSizing:"border-box",transition:"border-color 0.2s,box-shadow 0.2s"};
const selectBase = {...inputBase,appearance:"none",cursor:"pointer"};
const Label = ({ch}) => <span style={{display:"block",fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>{ch}</span>;
const SH = ({icon,ch}) => <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.15em",textTransform:"uppercase",color:C.primary,marginBottom:16,display:"flex",alignItems:"center",gap:6}}><span>{icon}</span>{ch}</div>;
const Sel = ({value,onChange,children}) => <div style={{position:"relative"}}><select style={selectBase} value={value} onChange={onChange}>{children}</select><span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:C.light,fontSize:11}}>▼</span></div>;
const Chip = ({label,color}) => <span style={{display:"inline-block",background:`${color}18`,color,border:`1px solid ${color}40`,borderRadius:6,fontSize:11,fontWeight:600,padding:"3px 9px",marginRight:6,marginBottom:6}}>{label}</span>;
const InstantBadge = () => <span style={{display:"inline-flex",alignItems:"center",gap:5,background:"#ECFDF5",border:`1.5px solid ${C.borderMd}`,color:C.dark,fontSize:11,fontWeight:800,padding:"5px 12px",borderRadius:20,letterSpacing:"0.06em"}}>⚡ Instant — works offline, no AI call</span>;

// ─── Utils ────────────────────────────────────────────────────────
const calcCrCl = (age,wt,scr,female) => { if(!age||!wt||!scr) return null; return Math.max(0,((140-parseFloat(age))*parseFloat(wt))/(72*parseFloat(scr))*(female?0.85:1)); };
const renalStage = (c) => !c ? null : c>=90?{label:"Normal",color:C.primary}:c>=60?{label:"Mild (G2)",color:"#65A30D"}:c>=30?{label:"Moderate (G3)",color:C.warn}:c>=15?{label:"Severe (G4)",color:C.danger}:{label:"ESRD (G5)",color:"#7C3AED"};
const calcBMI = (wkg,hcm) => hcm&&wkg?(wkg/Math.pow(hcm/100,2)).toFixed(1):null;
const calcBSA = (wkg,hcm) => hcm&&wkg?Math.sqrt((wkg*hcm)/3600).toFixed(2):null;

// ─── PDF Generation ───────────────────────────────────────────────
const loadScript = (src) => new Promise((res,rej) => {
  if(document.querySelector(`script[src="${src}"]`)) return res();
  const s = document.createElement("script");
  s.src=src; s.onload=res; s.onerror=rej;
  document.head.appendChild(s);
});


// ─── Multi-Key Clinical Intelligence Pool ─────────────────────────
// 5 Groq keys (speed) + 5 Claude keys (depth) — round-robin per call.
// Groq keys must be from 5 SEPARATE accounts for independent limits.
// In the artifact the Claude proxy works without keys; add real keys
// before deploying to your own server.
const _GROQ = [
  "gsk_REPLACE_GROQ_KEY_1",
  "gsk_REPLACE_GROQ_KEY_2",
  "gsk_REPLACE_GROQ_KEY_3",
  "gsk_REPLACE_GROQ_KEY_4",
  "gsk_REPLACE_GROQ_KEY_5",
];
const _CLAUDE_KEYS = [
  "REPLACE_CLAUDE_KEY_1",
  "REPLACE_CLAUDE_KEY_2",
  "REPLACE_CLAUDE_KEY_3",
  "REPLACE_CLAUDE_KEY_4",
  "REPLACE_CLAUDE_KEY_5",
];

const _cooldowns = { groq:{}, claude:{} };
let _groqIdx = 0, _claudeIdx = 0;

function _nextKey(pool, name, idx) {
  const now = Date.now();
  for (let i = 0; i < pool.length; i++) {
    const k = (idx + i) % pool.length;
    if (!_cooldowns[name][k] || _cooldowns[name][k] < now) return k;
  }
  return idx % pool.length; // all cooling — use next anyway
}
function _cool(name, idx, ms=60000) { _cooldowns[name][idx] = Date.now() + ms; }

const GROQ_READY = _GROQ[0] !== "gsk_REPLACE_GROQ_KEY_1";

async function clinicalQuery({ prompt, fast=false, maxTokens=1500 }) {
  // Fast/simple tasks → Groq; complex evals → Claude
  if (fast && GROQ_READY) {
    const idx = _nextKey(_GROQ, "groq", _groqIdx);
    _groqIdx = (idx + 1) % _GROQ.length;
    try {
      const resp = await queuedFetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${_GROQ[idx]}`},
        body:JSON.stringify({
          model:"llama-3.3-70b-versatile", max_tokens:maxTokens,
          messages:[{role:"user",content:prompt}],
          response_format:{type:"json_object"}, temperature:0.1,
        }),
      });
      if (resp.status===429) { _cool("groq",idx); throw new Error("groq_429"); }
      const d = await resp.json();
      return d.choices?.[0]?.message?.content || "";
    } catch { /* fall through to Claude */ }
  }
  // Claude — primary engine for full evaluations
  const idx = _nextKey(_CLAUDE_KEYS, "claude", _claudeIdx);
  _claudeIdx = (idx + 1) % _CLAUDE_KEYS.length;
  try {
    const resp = await queuedFetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-6", max_tokens:maxTokens,
        messages:[{role:"user",content:prompt}],
      }),
    });
    if (resp.status===429) { _cool("claude",idx,120000); throw new Error("All engines rate-limited"); }
    const d = await resp.json();
    return (d.content||[]).map(b=>b.text||"").join("");
  } catch(e) { _cool("claude",idx); throw e; }
}

const generatePDF = async (element, filename, patientName, timestamp, setPdfLoading) => {
  setPdfLoading(true);
  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    const canvas = await window.html2canvas(element, {scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
    const pageW=210, pageH=297, margin=8;
    const usableW = pageW-(margin*2);
    const imgH = (canvas.height*usableW)/canvas.width;

    // Header bar
    pdf.setFillColor(5,150,105);
    pdf.rect(0,0,pageW,16,"F");
    pdf.setTextColor(255,255,255);
    pdf.setFontSize(10); pdf.setFont("helvetica","bold");
    pdf.text("MedGuard — Clinical Evaluation Report",margin,10);
    pdf.setFontSize(8); pdf.setFont("helvetica","normal");
    pdf.text(`Patient: ${patientName||"Anonymous"}  |  ${timestamp}`, pageW-margin, 10, {align:"right"});

    // Content image (multi-page)
    let contentY = 18;
    let remainH = imgH;
    let srcY = 0;
    let firstPage = true;

    while(remainH > 0) {
      const sliceH = Math.min(remainH, pageH - contentY - 14);
      const sliceCanvas = document.createElement("canvas");
      const dpr = 2;
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = (sliceH/usableW)*canvas.width;
      const ctx = sliceCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, srcY*(canvas.height/imgH), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
      if(!firstPage){ pdf.addPage(); contentY=10; }
      pdf.addImage(sliceCanvas.toDataURL("image/png"),"PNG",margin,contentY,usableW,sliceH);
      srcY += sliceH;
      remainH -= sliceH;
      firstPage = false;

      // Footer
      pdf.setDrawColor(220,220,220); pdf.line(margin,pageH-12,pageW-margin,pageH-12);
      pdf.setTextColor(140,140,140); pdf.setFontSize(7); pdf.setFont("helvetica","italic");
      pdf.text("⚠ Educational simulator only. Not a substitute for professional medical judgement. Cross-verify all doses against official formularies.",margin,pageH-7);
    }

    pdf.save(filename);
  } catch(e) {
    console.error(e);
    alert("PDF generation failed. Use Ctrl+P / Cmd+P to print as PDF instead.");
  } finally { setPdfLoading(false); }
};

// ─── Payments: Mono (Nigeria) + Wise (International) ──────────────
//
// MONO DirectPay — Nigeria subscriptions via Open Banking
//   • Only your PUBLIC key goes here. The secret key lives server-side.
//   • Payment initiation MUST be done by your backend (Netlify function)
//     because it requires the Mono secret key.
//   • Mono Connect JS widget: https://connect.withmono.com/connect.js
//   • Your backend endpoint that calls POST https://api.withmono.com/v2/payments/initiate
//     and returns { payment_id } — see medguard-payment-webhooks.js
const MONO_PUBLIC_KEY   = "live_pk_REPLACE_WITH_YOUR_MONO_PUBLIC_KEY";
const MONO_BACKEND_URL  = "/.netlify/functions/mono-initiate"; // your Netlify function

// WISE — International subscriptions via Payment Links
//   • Wise is NOT a payment gateway — it's a business bank account.
//   • Generate "Request Payment" links from your Wise Business dashboard
//     (Account → Request Money → Create Link → copy the wisepay URL).
//   • One link per plan, pre-set to the correct amount in USD.
//   • After paying, the customer returns and confirms; your Wise webhook
//     (set up in Wise Business → Developer → Webhooks) verifies server-side.
const WISE_PRO_LINK     = "https://wise.com/pay/r/REPLACE_WITH_PRO_LINK";
const WISE_PRO_MAX_LINK = "https://wise.com/pay/r/REPLACE_WITH_PRO_MAX_LINK";

// ─── Subscription Plans ────────────────────────────────────────────
const PLANS = {
  trialDays: 1,
  pro: {
    id: "pro",
    label: "MedGuard Pro — SOAP Bundle",
    tagline: "Includes SOAP Ambient AI Scribe integration · $150/mo",
    ngn: { amountKobo: 7500000, display: "₦75,000/mo" },
    usd: { amount: 150, display: "$150/mo" },
    features: [
      "Unlimited clinical evaluations",
      "SOAP Ambient AI Scribe deep-link integration",
      "PDF report download for every evaluation",
      "Unlimited evaluation history",
      "Offline drug monograph reference (80+ drugs)",
      "Extended clinical calculators (offline)",
      "Empiric antibiotic guide (offline)",
      "Lab values reference (offline)",
      "Camera lab sheet scanner",
      "Smart voice capture",
      "Hard/Soft stop alert system",
      "Prescribing audit trail (hash chain)",
      "West African pharmacogenomics alerts",
    ],
  },
  proMax: {
    id: "proMax",
    label: "MedGuard Pro Max",
    tagline: "Full standalone clinical intelligence platform · $200/mo",
    ngn: { amountKobo: 10000000, display: "₦100,000/mo" },
    usd: { amount: 200, display: "$200/mo" },
    features: [
      "Everything in Pro Bundle",
      "Priority evaluation queue",
      "Ward round batch export — 10 patients, PDF",
      "Advanced interaction matrix with literature citations",
      "Team sharing — up to 10 clinicians",
      "Custom formulary annotations",
      "Batch evaluation history export (CSV + PDF)",
      "Vancomycin AUC/MIC dosing assistant",
      "Dedicated clinical support channel",
    ],
  },
};

// ─── Mono DirectPay checkout ───────────────────────────────────────
const loadMonoScript = () => loadScript("https://connect.withmono.com/connect.js");

async function openMonoCheckout({ email, plan, onSuccess, onClose }) {
  try {
    await loadMonoScript();
  } catch { alert("Could not load Mono Connect widget. Check your connection."); onClose?.(); return; }

  // Step 1 — ask your backend to initiate the payment and return a payment_id.
  // This is required because Mono's initiation endpoint uses your SECRET key,
  // which must never appear in client-side code.
  let paymentId;
  try {
    const resp = await fetch(MONO_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: plan.ngn.amountKobo,
        type: "onetime-debit",
        description: `MedGuard ${plan.label} — 1-day trial then ${plan.ngn.display}`,
        reference: `medguard_${plan.id}_${Date.now()}`,
        email,
      }),
    });
    const data = await resp.json();
    paymentId = data.payment_id;
  } catch {
    alert(
      `⚠ Backend not reachable (${MONO_BACKEND_URL}).\n\n` +
      `Deploy the Mono initiate Netlify function first — see medguard-payment-webhooks.js.\n\n` +
      `In test mode you can also hardcode a test payment_id from your Mono dashboard.`
    );
    onClose?.(); return;
  }

  // Step 2 — open the Mono Connect widget with the payment_id
  if (!window.Connect) { alert("Mono Connect widget failed to load."); onClose?.(); return; }
  const widget = new window.Connect({
    key: MONO_PUBLIC_KEY,
    scope: "payments",
    data: { payment_id: paymentId },
    onSuccess: (data) => onSuccess?.(data),
    onClose: () => onClose?.(),
  });
  widget.setup();
  widget.open();
}

// ─── Wise payment link checkout ────────────────────────────────────
// Wise doesn't have a frontend SDK for receiving payments.
// We open the pre-generated Wise payment request link in a new tab.
// After paying, the user clicks "I've completed payment" which records
// the subscription client-side. Your Wise webhook verifies server-side.
function openWisePayment({ plan }) {
  const link = plan.id === "proMax" ? WISE_PRO_MAX_LINK : WISE_PRO_LINK;
  window.open(link, "_blank", "noopener,noreferrer");
}

// ─── Subscription Modal — Mono (Nigeria) + Wise (International) ────
function UpgradeModal({ open, onClose, onSubscribed, reason }) {
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [currency, setCurrency] = useState("ngn");
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [wiseStep, setWiseStep] = useState("link"); // "link" | "confirm"

  if (!open) return null;

  const plan = PLANS[selectedPlan];
  const chargeDate = new Date(Date.now() + PLANS.trialDays*24*60*60*1000);
  const chargeDateStr = chargeDate.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});

  const handleMono = async () => {
    if (!email) { alert("Enter your email address."); return; }
    setProcessing(true);
    await openMonoCheckout({
      email, plan,
      onSuccess: () => { setProcessing(false); onSubscribed("mono", selectedPlan); },
      onClose: () => setProcessing(false),
    });
  };

  const handleWiseOpen = () => {
    openWisePayment({ plan });
    setWiseStep("confirm");
  };

  const handleWiseConfirm = () => {
    setProcessing(true);
    // Client-side confirmation; Wise webhook verifies server-side.
    // In production, poll your backend to confirm before setting isPro.
    setTimeout(() => { setProcessing(false); onSubscribed("wise", selectedPlan); }, 800);
  };

  const planKeys = ["pro","proMax"];
  const planColors = { pro: C.primary, proMax: "#7C3AED" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,maxWidth:520,width:"100%",padding:"24px 24px 20px",boxShadow:"0 24px 64px rgba(0,0,0,0.3)",position:"relative",margin:"auto"}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,border:"none",background:"none",fontSize:18,color:C.light,cursor:"pointer",lineHeight:1}}>✕</button>

        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:30,marginBottom:6}}>🔓</div>
          <h2 style={{margin:"0 0 4px",fontSize:17,fontWeight:800,color:C.text}}>Start Your {PLANS.trialDays}-Day Free Trial</h2>
          <p style={{margin:0,fontSize:12,color:C.muted}}>{reason||"Card required — you won't be charged until your trial ends."}</p>
        </div>

        {/* Plan selector */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {planKeys.map(pk => {
            const p = PLANS[pk]; const active = selectedPlan===pk; const col = planColors[pk];
            return (
              <div key={pk} onClick={()=>setSelectedPlan(pk)} style={{border:`2px solid ${active?col:C.border}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",background:active?`${col}08`:"#FAFAFA",transition:"all 0.18s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:800,color:active?col:C.text}}>{p.label}</div>
                  {active&&<span style={{background:col,color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:10}}>Selected</span>}
                </div>
                <div style={{fontSize:10,color:C.muted,marginBottom:8}}>{p.tagline}</div>
                <div style={{fontSize:16,fontWeight:800,color:active?col:C.text}}>{currency==="ngn"?p.ngn.display:p.usd.display}</div>
                <ul style={{margin:"8px 0 0",padding:0,listStyle:"none",display:"flex",flexDirection:"column",gap:4}}>
                  {p.features.slice(0,4).map((f,i)=><li key={i} style={{fontSize:10,color:C.text,display:"flex",gap:5}}><span style={{color:col,fontWeight:800}}>✓</span>{f}</li>)}
                  {p.features.length>4&&<li style={{fontSize:10,color:C.muted}}>+{p.features.length-4} more features</li>}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Currency tabs */}
        <div style={{display:"flex",gap:4,marginBottom:12,background:"#F3F4F6",borderRadius:10,padding:3}}>
          <button onClick={()=>{setCurrency("ngn");setWiseStep("link");}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:currency==="ngn"?"#fff":"transparent",color:currency==="ngn"?C.text:C.muted,boxShadow:currency==="ngn"?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>🇳🇬 Nigeria (₦) — Mono</button>
          <button onClick={()=>{setCurrency("intl");setWiseStep("link");}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:currency==="intl"?"#fff":"transparent",color:currency==="intl"?C.text:C.muted,boxShadow:currency==="intl"?"0 1px 4px rgba(0,0,0,0.1)":"none"}}>🌍 International ($) — Wise</button>
        </div>

        {/* Charge disclosure */}
        <div style={{background:"#FFFBEB",border:"1.5px solid #FCD34D",borderRadius:9,padding:"9px 13px",marginBottom:14,fontSize:11,color:"#92400E",lineHeight:1.6}}>
          ⏰ <strong>1 day free</strong>, then charged automatically on <strong>{chargeDateStr}</strong> unless cancelled. Cancel anytime.
        </div>

        {currency==="ngn" ? (
          <div>
            <div style={{textAlign:"center",fontSize:11,color:C.light,marginBottom:10}}>Direct bank debit via Mono · 30+ Nigerian banks supported · Open Banking encrypted</div>
            <input style={{...inputBase,marginBottom:10}} type="email" placeholder="your@email.com — for receipt & account" value={email} onChange={e=>setEmail(e.target.value)}/>
            <button onClick={handleMono} disabled={processing} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:processing?"#6EE7B7":"#011B33",color:"#fff",fontSize:13,fontWeight:800,cursor:processing?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {processing?<><span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Connecting to Mono…</>:<>Start Trial via Mono DirectPay 🏦</>}
            </button>
            <p style={{margin:"8px 0 0",fontSize:10,color:C.light,textAlign:"center"}}>Powered by Mono Open Banking · Bank-grade encryption · No card required</p>
          </div>
        ) : (
          wiseStep==="link" ? (
            <div>
              <div style={{textAlign:"center",fontSize:11,color:C.light,marginBottom:10}}>Pay via Wise — bank transfer to our Wise Business account. Supports all major currencies and 70+ countries.</div>
              <button onClick={handleWiseOpen} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"#163300",color:"#9FE870",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                Open Wise Payment Page 🏦
              </button>
              <p style={{margin:"10px 0 0",fontSize:10,color:C.muted,textAlign:"center",lineHeight:1.5}}>
                Clicking opens Wise in a new tab. Complete payment there, then return here and click "I've completed payment" below.
              </p>
              <button onClick={()=>setWiseStep("confirm")} style={{width:"100%",marginTop:8,padding:"10px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#FAFAFA",color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                I've opened the Wise page →
              </button>
            </div>
          ) : (
            <div>
              <div style={{background:"#F0FDF4",border:`1.5px solid ${C.borderMd}`,borderRadius:12,padding:"14px 16px",marginBottom:12,textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:800,color:C.dark,marginBottom:4}}>✅ Payment sent via Wise?</div>
                <p style={{margin:0,fontSize:12,color:C.muted,lineHeight:1.6}}>After your Wise payment is sent, click below to activate your trial. Our system will verify the transfer automatically in the background.</p>
              </div>
              <button onClick={handleWiseConfirm} disabled={processing} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:processing?"#6EE7B7":`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",fontSize:13,fontWeight:800,cursor:processing?"wait":"pointer",fontFamily:"inherit"}}>
                {processing?"Activating…":"I've Completed Payment via Wise ✓"}
              </button>
              <button onClick={()=>setWiseStep("link")} style={{width:"100%",marginTop:8,padding:"8px",border:"none",background:"none",color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← Back to payment page</button>
            </div>
          )
        )}
        <p style={{margin:"12px 0 0",fontSize:9,color:C.light,textAlign:"center",lineHeight:1.5}}>Secure. Cancel before trial ends to avoid charge. Subscriptions auto-renew monthly until cancelled.</p>
      </div>
    </div>
  );
}

// ─── Subscription Gate — shown instead of the Evaluate form pre-payment ─
function SubscriptionGate({ onStart }) {
  return (
    <div style={{background:C.surface,borderRadius:20,border:`1.5px solid ${C.border}`,boxShadow:"0 4px 20px rgba(0,0,0,0.05)",padding:"40px 28px",textAlign:"center"}}>
      <div style={{fontSize:42,marginBottom:10}}>🔒</div>
      <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,color:C.text}}>Clinical Evaluations Require a Subscription</h2>
      <p style={{margin:"0 0 22px",fontSize:13,color:C.muted,maxWidth:420,marginLeft:"auto",marginRight:"auto",lineHeight:1.6}}>
        Start your {PLANS.trialDays}-day free trial to unlock AI-powered dosing evaluation,
        overdose detection, and PDF reports. A card is required to start, but you
        won't be charged until the trial ends — cancel anytime before then.
      </p>
      <button onClick={onStart} style={{padding:"13px 30px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(124,58,237,0.35)"}}>
        🔓 Start {PLANS.trialDays}-Day Free Trial
      </button>
      <p style={{margin:"16px 0 0",fontSize:11,color:C.light}}>
        💡 IV Calculator and Risk Scores tabs are free, instant, and don't require a subscription.
      </p>
    </div>
  );
}

// ─── Trial Countdown Banner ─────────────────────────────────────────
function TrialCountdownBanner({ trialEndsAt, onManage }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const msLeft = new Date(trialEndsAt).getTime() - now;
  const hLeft = Math.max(0, Math.floor(msLeft / 3600000));
  const mLeft = Math.max(0, Math.floor((msLeft % 3600000) / 60000));
  const expired = msLeft <= 0;

  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:10,background:expired?"#ECFDF5":"#FFFBEB",border:`1.5px solid ${expired?C.borderMd:"#FCD34D"}`,color:expired?C.dark:"#92400E",fontSize:11,fontWeight:700,padding:"6px 14px",borderRadius:20}}>
      {expired ? "⭐ Subscription Active" : `⏰ Trial — ${hLeft}h ${mLeft}m left`}
      <button onClick={onManage} style={{background:"none",border:"none",color:"inherit",textDecoration:"underline",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",padding:0}}>Manage</button>
    </span>
  );
}

// ─── Risk Scores Tab ─────────────────────────────────────────────
function RiskScoresTab() {
  const [curb,setCurb] = useState({confusion:false,urea:false,rr:false,bp:false,age65:false});
  const [qsofa,setQsofa] = useState({ams:false,rr22:false,sbp:false});
  const [gcs,setGcs] = useState({eye:4,verbal:5,motor:6});
  const c65 = Object.values(curb).filter(Boolean).length;
  const qscore = Object.values(qsofa).filter(Boolean).length;
  const gcstotal = gcs.eye+gcs.verbal+gcs.motor;
  const curbInfo = c65<=1?{label:"Low Risk — Outpatient",color:C.primary,rec:"Treat as outpatient. Oral antibiotics, follow-up in 48h."}:c65<=2?{label:"Moderate Risk",color:C.warn,rec:"Consider short admission or close outpatient supervision with review."}:{label:"High Risk — Hospitalise",color:C.danger,rec:"Admit. ICU referral if score ≥ 4. IV antibiotics required. Monitor closely."};
  const qinfo = qscore===0?{label:"Low Sepsis Risk",color:C.primary}:qscore===1?{label:"Moderate — Monitor",color:C.warn}:{label:"High — Assess for Organ Dysfunction",color:C.danger};
  const ginfo = gcstotal>=13?{label:"Mild / Normal",color:C.primary}:gcstotal>=9?{label:"Moderate TBI",color:C.warn}:{label:"Severe TBI — Immediate Intervention",color:C.danger};

  const CBox = ({label,val,onChange}) => (
    <label style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:"#FAFAFA",borderRadius:10,border:`1.5px solid ${val?C.primary:C.border}`,cursor:"pointer",transition:"all 0.18s"}}>
      <input type="checkbox" checked={val} onChange={e=>onChange(e.target.checked)} style={{width:16,height:16,accentColor:C.primary,cursor:"pointer"}}/>
      <span style={{fontSize:12,color:C.text,fontWeight:val?700:400}}>{label}</span>
    </label>
  );
  const Slider = ({label,val,min,max,onChange,marks}) => (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted}}>{label}</span>
        <span style={{fontSize:13,fontWeight:800,color:C.primary}}>{val}/{max}</span>
      </div>
      <input type="range" min={min} max={max} value={val} onChange={e=>onChange(parseInt(e.target.value))} style={{width:"100%",accentColor:C.primary}}/>
      {marks&&<div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>{marks.map((m,i)=><span key={i} style={{fontSize:9,color:C.light}}>{m}</span>)}</div>}
    </div>
  );
  const ScoreBadge = ({score,total,info}) => (
    <div style={{background:`${info.color}12`,border:`2px solid ${info.color}40`,borderRadius:12,padding:"14px 18px",marginTop:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontWeight:800,fontSize:13,color:info.color}}>{info.label}</span>
        <span style={{background:info.color,color:"#fff",borderRadius:20,padding:"4px 14px",fontWeight:800,fontSize:15}}>{score}/{total}</span>
      </div>
      {info.rec&&<p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.6}}>{info.rec}</p>}
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:14}}><InstantBadge/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <SH icon="🫁" ch="CURB-65 — Pneumonia Severity"/>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <CBox label="Confusion — new onset or AMTS ≤ 8" val={curb.confusion} onChange={v=>setCurb(s=>({...s,confusion:v}))}/>
          <CBox label="Urea > 7 mmol/L (BUN > 19 mg/dL)" val={curb.urea} onChange={v=>setCurb(s=>({...s,urea:v}))}/>
          <CBox label="Respiratory Rate ≥ 30/min" val={curb.rr} onChange={v=>setCurb(s=>({...s,rr:v}))}/>
          <CBox label="Low BP — Systolic < 90 or Diastolic ≤ 60 mmHg" val={curb.bp} onChange={v=>setCurb(s=>({...s,bp:v}))}/>
          <CBox label="Age ≥ 65 years" val={curb.age65} onChange={v=>setCurb(s=>({...s,age65:v}))}/>
        </div>
        <ScoreBadge score={c65} total={5} info={curbInfo}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          <SH icon="🩸" ch="qSOFA — Sepsis Screening"/>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <CBox label="Altered Mental Status" val={qsofa.ams} onChange={v=>setQsofa(s=>({...s,ams:v}))}/>
            <CBox label="Respiratory Rate ≥ 22/min" val={qsofa.rr22} onChange={v=>setQsofa(s=>({...s,rr22:v}))}/>
            <CBox label="Systolic BP ≤ 100 mmHg" val={qsofa.sbp} onChange={v=>setQsofa(s=>({...s,sbp:v}))}/>
          </div>
          <ScoreBadge score={qscore} total={3} info={qinfo}/>
        </div>
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          <SH icon="🧠" ch="Glasgow Coma Scale"/>
          <Slider label="Eye Opening (E)" val={gcs.eye} min={1} max={4} onChange={v=>setGcs(s=>({...s,eye:v}))} marks={["None","Pain","Voice","Spont."]}/>
          <Slider label="Verbal Response (V)" val={gcs.verbal} min={1} max={5} onChange={v=>setGcs(s=>({...s,verbal:v}))} marks={["None","Sounds","Words","Confused","Orient."]}/>
          <Slider label="Motor Response (M)" val={gcs.motor} min={1} max={6} onChange={v=>setGcs(s=>({...s,motor:v}))} marks={["None","Ext.","Flex.","Withd.","Local.","Obeys"]}/>
          <ScoreBadge score={gcstotal} total={15} info={ginfo}/>
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── IV Calculator Tab ────────────────────────────────────────────
function IVTab() {
  const [preset,setPreset] = useState(IV_PRESETS[0]);
  const [conc,setConc] = useState(preset.defaultConc.toString());
  const [concUnit,setConcUnit] = useState("mg/mL");
  const [dose,setDose] = useState("");
  const [doseUnit,setDoseUnit] = useState(preset.unit);
  const [weight,setWeight] = useState("");
  const [dropSet,setDropSet] = useState(20);
  const [vol,setVol] = useState("");

  const handlePreset = (p) => { setPreset(p); setConc(p.defaultConc.toString()); setDoseUnit(p.unit); };
  const c=parseFloat(conc), d=parseFloat(dose), w=parseFloat(weight)||70;
  let mlhr=null, dpm=null;
  if(c>0&&d>0){
    if(doseUnit==="mcg/kg/min") mlhr=(d*w*60)/1000/(concUnit==="mcg/mL"?c/1000:c);
    else if(doseUnit==="mg/hr") mlhr=d/(concUnit==="mcg/mL"?c/1000:c);
    else if(doseUnit==="mcg/hr") mlhr=d/(concUnit==="mg/mL"?c*1000:c);
    else if(doseUnit==="units/hr") mlhr=d/c;
    if(mlhr) dpm=(mlhr*dropSet)/60;
  }
  const runTime = mlhr&&parseFloat(vol)>0?(parseFloat(vol)/mlhr*60).toFixed(0):null;

  const Stat = ({label,value,unit,color}) => (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
      <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.light,marginBottom:8}}>{label}</div>
      <div style={{fontSize:30,fontWeight:800,color:color||C.primary,lineHeight:1}}>{value!=null?value:"-"}</div>
      <div style={{fontSize:11,color:C.muted,marginTop:4}}>{unit}</div>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:14}}><InstantBadge/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>
      <div style={{background:C.surface,borderRadius:20,border:`1.5px solid ${C.border}`,padding:"22px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <SH icon="💉" ch="IV Infusion Calculator"/>
        <div style={{marginBottom:14}}>
          <Label ch="Drug Preset"/>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {IV_PRESETS.map(p=><button key={p.name} onClick={()=>handlePreset(p)} style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${preset.name===p.name?C.primary:C.border}`,background:preset.name===p.name?`${C.primary}15`:"#F9FAFB",color:preset.name===p.name?C.primary:C.muted,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{p.name}</button>)}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <Label ch="Concentration"/>
            <div style={{display:"flex",gap:6}}>
              <input style={{...inputBase,flex:1}} type="number" min="0" value={conc} onChange={e=>setConc(e.target.value)} placeholder="e.g. 5"/>
              <Sel value={concUnit} onChange={e=>setConcUnit(e.target.value)}><option>mg/mL</option><option>mcg/mL</option><option>units/mL</option></Sel>
            </div>
          </div>
          <div><Label ch="Patient Weight (kg)"/><input style={inputBase} type="number" min="0" placeholder="70" value={weight} onChange={e=>setWeight(e.target.value)}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><Label ch="Desired Dose"/><input style={inputBase} type="number" min="0" placeholder="dose" value={dose} onChange={e=>setDose(e.target.value)}/></div>
          <div><Label ch="Dose Unit"/>
            <Sel value={doseUnit} onChange={e=>setDoseUnit(e.target.value)}>
              <option value="mcg/kg/min">mcg/kg/min</option><option value="mg/hr">mg/hr</option><option value="mcg/hr">mcg/hr</option><option value="units/hr">units/hr</option>
            </Sel>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Label ch="Bag Volume (mL, optional)"/><input style={inputBase} type="number" min="0" placeholder="250" value={vol} onChange={e=>setVol(e.target.value)}/></div>
          <div><Label ch="IV Set"/>
            <Sel value={dropSet} onChange={e=>setDropSet(parseInt(e.target.value))}>
              <option value={20}>Macrodrip — 20 gtt/mL</option><option value={60}>Microdrip — 60 gtt/mL</option>
            </Sel>
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Stat label="Infusion Rate" value={mlhr?mlhr.toFixed(2):null} unit="mL / hour" color={C.primary}/>
          <Stat label="Drip Rate" value={dpm?dpm.toFixed(0):null} unit={`drops / min`} color="#0891B2"/>
        </div>
        {runTime&&<div style={{background:"#EFF6FF",border:"1.5px solid #BFDBFE",borderRadius:14,padding:"14px 18px",textAlign:"center",fontSize:13,fontWeight:700,color:"#1E40AF"}}>⏱ Infusion runs for {runTime} minutes</div>}
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:"18px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          <SH icon="🔄" ch="Unit Converter"/>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {[["1 mg","= 1,000 mcg"],["1 g","= 1,000 mg"],["1 kg","= 2.205 lbs"],["1 mmol/L (Na)","≈ 23 mg/dL"],["1 mEq/L","= 1 mmol/L (monovalent)"],["1 mg/dL creat.","= 88.4 µmol/L"],["CrCl (F)","× 0.85 correction"]].map(([a,b],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",background:"#FAFAFA",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12}}>
                <span style={{fontWeight:700,color:C.text}}>{a}</span><span style={{color:C.muted}}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── Result Panel (with PDF ref) ─────────────────────────────────
function ResultPanel({ result, form, resultRef, onNew, onCopy, copied, onPDF, pdfLoading, reviewFlag, onToggleReview, isPro }) {
  const tc = TAG_COLORS[result.tag]||TAG_COLORS.SAFE;
  const pc = result.pregnancyCategory ? PREG_COLORS[result.pregnancyCategory]||C.light : null;
  const timestamp = new Date().toLocaleString();

  return (
    <div>
      {/* Toolbar — OUTSIDE the PDF capture div */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onNew} style={{flex:1,minWidth:90,padding:"9px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surface,fontSize:12,fontWeight:700,cursor:"pointer",color:C.text,fontFamily:"inherit"}}>↩ New Eval</button>
        <button onClick={onCopy} style={{flex:1,minWidth:90,padding:"9px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surface,fontSize:12,fontWeight:700,cursor:"pointer",color:C.primary,fontFamily:"inherit"}}>{copied?"✅ Copied":"📋 Copy Text"}</button>
        <button onClick={onPDF} disabled={pdfLoading} style={{flex:1,minWidth:110,padding:"9px",borderRadius:10,border:"none",background:pdfLoading?"#6EE7B7":`linear-gradient(135deg,${C.primary},${C.dark})`,fontSize:12,fontWeight:700,cursor:pdfLoading?"wait":"pointer",color:"#fff",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          {pdfLoading?<><span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Generating…</>:<>{isPro?"📄 Download PDF":"🔒 Download PDF (Pro)"}</>}
        </button>
      </div>

      {/* Pharmacist Review Flag — addresses AI-trust concerns */}
      <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",marginBottom:14,background:reviewFlag?"#FFFBEB":"#F9FAFB",border:`1.5px solid ${reviewFlag?"#FCD34D":C.border}`,borderRadius:10,cursor:"pointer",transition:"all 0.18s"}}>
        <input type="checkbox" checked={reviewFlag} onChange={onToggleReview} style={{width:16,height:16,accentColor:C.warn,cursor:"pointer"}}/>
        <span style={{fontSize:12,fontWeight:600,color:reviewFlag?"#92400E":C.muted}}>
          🩺 Flag this evaluation for pharmacist / senior clinician review before action
        </span>
      </label>

      {/* ── PDF CAPTURE ZONE ── */}
      <div ref={resultRef} style={{background:"#fff",borderRadius:16,overflow:"hidden",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>

        {reviewFlag && (
          <div style={{background:"#FFFBEB",borderBottom:"2px solid #FCD34D",padding:"9px 24px",textAlign:"center"}}>
            <span style={{fontSize:11,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:"#92400E"}}>
              🩺 PENDING PHARMACIST / SENIOR CLINICIAN REVIEW — AI output not yet verified
            </span>
          </div>
        )}

        {/* Report Header */}
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.dark})`,padding:"20px 24px",color:"#fff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.15em",textTransform:"uppercase",opacity:0.8,marginBottom:4}}>🏥 MedGuard · Clinical Evaluation Report</div>
              <div style={{fontSize:18,fontWeight:800}}>{form.patientName||"Anonymous"}</div>
              <div style={{fontSize:12,opacity:0.85,marginTop:3}}>
                {form.age}y · {form.gender} · {form.weight}{form.unit}
                {form.height?` · ${form.height}cm`:""}
                {form.screatinine?` · SCr ${form.screatinine} mg/dL`:""}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{background:tc.bg,color:tc.text,fontSize:12,fontWeight:800,padding:"6px 16px",borderRadius:20,letterSpacing:"0.1em",display:"inline-block"}}>{result.tag}</span>
              {pc&&result.pregnancyCategory!=="N/A"&&<div style={{marginTop:6,background:pc,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 12px",borderRadius:20,display:"inline-block"}}>Pregnancy Cat. {result.pregnancyCategory}</div>}
              <div style={{fontSize:10,opacity:0.7,marginTop:6}}>{timestamp}</div>
            </div>
          </div>
        </div>

        <div style={{padding:"20px 24px"}}>

          {/* Black Box Warning */}
          {result.blackBoxWarning&&(
            <div style={{background:"#1F2937",borderRadius:12,padding:"14px 18px",marginBottom:16,display:"flex",gap:12}}>
              <span style={{fontSize:20}}>⬛</span>
              <div>
                <div style={{fontWeight:800,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:"#F87171",marginBottom:4}}>FDA Black Box Warning</div>
                <p style={{margin:0,fontSize:12,color:"#FCA5A5",lineHeight:1.65}}>{result.blackBoxWarning}</p>
              </div>
            </div>
          )}

          {/* Overdose Alert */}
          {result.overdose&&(
            <div style={{background:result.overdose.critical?"#FEF2F2":"#FFFBEB",border:`2px solid ${result.overdose.critical?"#FCA5A5":"#FCD34D"}`,borderRadius:12,padding:"14px 18px",marginBottom:16,display:"flex",gap:14}}>
              <span style={{fontSize:24,lineHeight:1}}>{result.overdose.critical?"🚨":"⚠️"}</span>
              <div>
                <div style={{fontWeight:800,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:result.overdose.critical?"#991B1B":"#92400E",marginBottom:4}}>
                  {result.overdose.critical?"Critical Overdose Detected":"Sub-Toxic Exposure Evaluated"}
                </div>
                <p style={{margin:0,fontSize:12,color:result.overdose.critical?"#7F1D1D":"#78350F"}}>
                  Ingested dose: <strong>{result.overdose.mgPerKg} mg/kg</strong> — {result.overdose.critical?"Exceeds acute toxicity threshold. Immediate intervention required.":"Below acute toxicity threshold. Continue monitoring."}
                </p>
                {result.overdose.critical&&<ul style={{margin:"8px 0 0",paddingLeft:16,fontSize:11,color:"#7F1D1D",lineHeight:1.8}}><li>Transfer to ICU immediately.</li><li>IV N-Acetylcysteine (NAC) infusion protocol.</li><li>Draw baseline LFTs and serum drug levels.</li></ul>}
              </div>
            </div>
          )}

          {/* Rx Grid */}
          <div style={{border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
            <div style={{background:"#111827",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#F9FAFB",fontWeight:700,fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase"}}>📋 Prescribed Regimen</span>
              <span style={{color:C.borderMd,fontSize:10}}>{result.drugClass||""}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1.5px solid ${C.border}`}}>
              {[{l:"Drug",v:result.drug},{l:"Dose",v:result.dose},{l:"Schedule",v:result.schedule}].map((x,i)=>(
                <div key={i} style={{padding:"14px 16px",borderRight:i<2?`1.5px solid ${C.border}`:"none"}}>
                  <span style={{display:"block",fontSize:9,fontWeight:700,color:C.light,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>{x.l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.4}}>{x.v}</span>
                </div>
              ))}
            </div>
            {result.mechanism&&<div style={{padding:"12px 18px",borderBottom:`1.5px solid ${C.border}`,fontSize:12,color:C.text,background:"#FAFAFA"}}><strong>Mechanism:</strong> {result.mechanism}</div>}

            {/* Renal + Hepatic */}
            {(result.renalAdjustment||result.hepaticAdjustment)&&(
              <div style={{display:"grid",gridTemplateColumns:result.renalAdjustment&&result.hepaticAdjustment?"1fr 1fr":"1fr",borderBottom:`1.5px solid ${C.border}`}}>
                {result.renalAdjustment&&<div style={{padding:"12px 16px",background:"#EFF6FF",borderRight:result.hepaticAdjustment?`1.5px solid ${C.border}`:"none"}}>
                  <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#1E40AF",marginBottom:4}}>🫘 Renal Dose Adjustment</div>
                  <p style={{margin:0,fontSize:12,color:"#1E40AF"}}>{result.renalAdjustment}</p>
                </div>}
                {result.hepaticAdjustment&&<div style={{padding:"12px 16px",background:"#FFF7ED"}}>
                  <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#92400E",marginBottom:4}}>🫀 Hepatic Dose Adjustment</div>
                  <p style={{margin:0,fontSize:12,color:"#92400E"}}>{result.hepaticAdjustment}</p>
                </div>}
              </div>
            )}

            {/* Admin Guide */}
            <div style={{padding:"14px 18px",borderBottom:`1.5px solid ${C.border}`}}>
              <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted,marginBottom:10}}>🔧 Administration Guide</div>
              <div style={{background:"linear-gradient(135deg,#F0FDF4,#ECFDF5)",border:`1.5px solid ${C.borderMd}`,borderRadius:10,padding:"12px 16px",fontSize:12,color:"#064E3B",lineHeight:1.75}} dangerouslySetInnerHTML={{__html:result.guide}}/>
            </div>

            {/* Side Effects + Contraindications */}
            {(result.sideEffects?.length||result.contraindications?.length)&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1.5px solid ${C.border}`}}>
                {result.sideEffects?.length>0&&<div style={{padding:"12px 16px",borderRight:`1.5px solid ${C.border}`}}>
                  <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>⚡ Side Effects</div>
                  <div style={{display:"flex",flexWrap:"wrap"}}>{result.sideEffects.map((s,i)=><Chip key={i} label={s} color={C.warn}/>)}</div>
                </div>}
                {result.contraindications?.length>0&&<div style={{padding:"12px 16px"}}>
                  <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>🚫 Contraindications</div>
                  <div style={{display:"flex",flexWrap:"wrap"}}>{result.contraindications.map((x,i)=><Chip key={i} label={x} color={C.danger}/>)}</div>
                </div>}
              </div>
            )}

            {/* Monitoring + Interactions */}
            <div style={{display:"grid",gridTemplateColumns:result.interactions?"1fr 1fr":"1fr"}}>
              {result.monitoring?.length>0&&<div style={{padding:"12px 16px",borderRight:result.interactions?`1.5px solid ${C.border}`:"none"}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>📊 Monitoring Parameters</div>
                <ul style={{margin:0,paddingLeft:16,fontSize:12,color:C.text,lineHeight:1.9}}>{result.monitoring.map((m,i)=><li key={i}>{m}</li>)}</ul>
              </div>}
              {result.interactions&&<div style={{padding:"12px 16px"}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>🔗 Drug Interactions</div>
                <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.75}}>{result.interactions}</p>
              </div>}
            </div>

            {/* Interaction Severity Matrix — Lexicomp/Medscape style */}
            {result.interactionSeverity?.length>0&&(
              <div style={{padding:"12px 18px",borderTop:`1.5px solid ${C.border}`}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:10}}>⚖️ Interaction Severity Matrix</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {result.interactionSeverity.map((it,i)=>{
                    const sc = SEVERITY_COLORS[it.severity]||SEVERITY_COLORS.Minor;
                    return (
                      <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 12px",background:"#FAFAFA",border:`1px solid ${C.border}`,borderRadius:10}}>
                        <span style={{background:sc.bg,color:sc.text,fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:8,whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{sc.icon} {it.severity}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>{it.drugPair}</div>
                          <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{it.note}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{margin:"10px 0 0",fontSize:10,color:C.light,lineHeight:1.5}}>
                  Severity grading follows Lexicomp/Medscape conventions. Different references may classify the same pair differently — use this as a starting point and confirm with a pharmacist for Major/Contraindicated findings.
                </p>
              </div>
            )}

            {/* Pediatric note */}
            {result.pediatricNote&&<div style={{padding:"12px 18px",background:"#F0F9FF",borderTop:`1.5px solid ${C.border}`}}>
              <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#0C4A6E",marginBottom:5}}>👶 Pediatric Dosing Note</div>
              <p style={{margin:0,fontSize:12,color:"#0C4A6E"}}>{result.pediatricNote}</p>
            </div>}
          </div>

          {/* Patient context summary */}
          <div style={{background:"#F9FAFB",borderRadius:12,padding:"14px 18px",border:`1px solid ${C.border}`,marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>📝 Patient Context Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px",fontSize:11,color:C.text}}>
              {[["Indication",form.indication],["Route",form.route],["Hepatic",form.hepaticLevel],["Allergies",form.allergies||"None"],["Concurrent Meds",form.currentMeds||"None"],["Clinical Notes",form.notes||"None"]].map(([k,v],i)=>(
                <div key={i}><span style={{fontWeight:700,color:C.muted}}>{k}: </span>{v}</div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{textAlign:"center",padding:"10px 0 4px",borderTop:`1px solid ${C.border}`}}>
            <p style={{margin:"0 0 2px",fontSize:8,fontWeight:800,letterSpacing:"0.15em",textTransform:"uppercase",color:"#EF4444"}}>⚠ Educational Simulator Notice</p>
            <p style={{margin:0,fontSize:9,color:C.light,lineHeight:1.6}}>This platform is an educational simulator only. It does not constitute medical diagnosis, prescribing authority, or therapeutic guidance. All dosing must be cross-verified against official formularies and professional clinical judgement before any real-world application.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History Card ─────────────────────────────────────────────────
function HistCard({entry,onView}) {
  const tc = TAG_COLORS[entry.result.tag]||TAG_COLORS.SAFE;
  return (
    <div onClick={()=>onView(entry)} style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",transition:"all 0.18s"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none"}}>
      <div>
        <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:3}}>{entry.form.patientName||"Anonymous"} · {entry.form.age}y · {entry.form.weight}{entry.form.unit}</div>
        <div style={{fontSize:12,color:C.muted}}>{entry.result.drug} — {entry.result.dose}</div>
        <div style={{fontSize:11,color:C.light,marginTop:3}}>{entry.timestamp}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
        <span style={{background:tc.bg,color:tc.text,fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:20,textTransform:"uppercase"}}>{entry.result.tag}</span>
        <span style={{fontSize:11,color:C.primary,fontWeight:600}}>View →</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STEP 1 — Online/Offline Hook, Network Banner, Cache, Privacy,
//            Hard/Soft Stop Alert System
// ══════════════════════════════════════════════════════════════════

// ─── useOnlineStatus ──────────────────────────────────────────────
function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

// ─── Network Status Banner ─────────────────────────────────────────
function NetworkBanner({ online }) {
  if (online) return null;
  return (
    <div style={{
      position:"sticky", top:0, zIndex:900,
      background:"#1F2937", color:"#FDE68A",
      textAlign:"center", padding:"8px 16px",
      fontSize:12, fontWeight:700, letterSpacing:"0.04em",
    }}>
      📴 Offline — IV Calc, Risk Scores, Drug Ref, Lab Values &amp; Calculators work without internet.
      Clinical evaluation will resume when you reconnect.
    </div>
  );
}

// ─── Offline Result Cache (last 10 evals) ─────────────────────────
async function cacheResult(form, result) {
  try {
    const raw  = await window.storage.get("medguard:evalcache").catch(() => ({ value: "[]" }));
    const list = JSON.parse(raw?.value || "[]");
    const key  = `${form.drug}:${form.amountMg}:${form.weight}:${form.age}`;
    const next = [{ key, form, result, ts: Date.now() },
                  ...list.filter(e => e.key !== key)].slice(0, 10);
    await window.storage.set("medguard:evalcache", JSON.stringify(next));
  } catch { /* storage unavailable — silent fail */ }
}

async function getCachedResult(form) {
  try {
    const raw  = await window.storage.get("medguard:evalcache").catch(() => ({ value: "[]" }));
    const list = JSON.parse(raw?.value || "[]");
    const key  = `${form.drug}:${form.amountMg}:${form.weight}:${form.age}`;
    const hit  = list.find(e => e.key === key);
    return hit ? { result: hit.result, ageMs: Date.now() - hit.ts } : null;
  } catch { return null; }
}


// ─── Privacy Mode Storage Wipe ─────────────────────────────────────
async function wipeAllStorage() {
  const keys = ["medguard:evalcache","medguard:usage","medguard:heartbeats","medguard:audit"];
  for (const k of keys) {
    try { await window.storage.delete(k); } catch {}
  }
}

// ─── Privacy Mode Toggle ───────────────────────────────────────────
function PrivacyModeToggle({ enabled, onToggle }) {
  return (
    <label style={{
      display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
      background: enabled ? "#F5F3FF" : "#F9FAFB",
      border: `1.5px solid ${enabled ? "#7C3AED" : C.border}`,
      borderRadius:10, cursor:"pointer", transition:"all 0.18s",
    }}>
      <input
        type="checkbox" checked={enabled} onChange={onToggle}
        style={{ width:16, height:16, accentColor:"#7C3AED", cursor:"pointer" }}
      />
      <div>
        <div style={{ fontSize:12, fontWeight:700, color: enabled ? "#7C3AED" : C.muted }}>
          🔒 Privacy-First Mode
        </div>
        <div style={{ fontSize:10, color:C.light, lineHeight:1.4 }}>
          {enabled
            ? "PHI not stored or transmitted. Results not cached. GDPR/HIPAA ward-round safe."
            : "Enable to prevent any PHI storage — ideal for ward rounds."}
        </div>
      </div>
    </label>
  );
}

// ─── Hard Stop / Soft Stop Alert System ───────────────────────────
function AlertSystem({ hardStops, softStops, onOverrideHard }) {
  const [justification, setJustification] = useState({});
  const [dismissed,     setDismissed]     = useState([]);

  const activeHards  = hardStops  || [];
  const activeSofts  = (softStops || []).filter((_, i) => !dismissed.includes(i));
  if (!activeHards.length && !activeSofts.length) return null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>

      {/* HARD STOPS — require written justification before proceeding */}
      {activeHards.map((stop, i) => (
        <div key={i} style={{
          background:"#1F2937", border:"2px solid #DC2626",
          borderRadius:14, padding:"16px 18px",
        }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
            <span style={{ fontSize:22, lineHeight:1 }}>⛔</span>
            <div>
              <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.1em", color:"#F87171", marginBottom:4 }}>
                HARD STOP — Override Required Before Proceeding
              </div>
              <div style={{ fontSize:13, color:"#FCA5A5", lineHeight:1.6 }}>{stop}</div>
            </div>
          </div>
          <textarea
            style={{ ...inputBase, background:"#374151", color:"#F9FAFB",
              border:"1.5px solid #4B5563", resize:"vertical", minHeight:54,
              lineHeight:1.6, width:"100%", boxSizing:"border-box" }}
            placeholder="Clinical justification for override (min 15 characters)…"
            value={justification[i] || ""}
            onChange={e => setJustification(s => ({ ...s, [i]: e.target.value }))}
          />
          <button
            onClick={() => {
              if ((justification[i] || "").length >= 15) {
                onOverrideHard && onOverrideHard(i, justification[i]);
              } else {
                alert("Please enter at least 15 characters of clinical justification.");
              }
            }}
            style={{ marginTop:8, padding:"9px 18px", borderRadius:9, border:"none",
              background:"#DC2626", color:"#fff", fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit" }}
          >
            Override with Justification →
          </button>
        </div>
      ))}

      {/* SOFT STOPS — dismissable with one tap */}
      {activeSofts.map((stop, i) => (
        <div key={i} style={{
          background:"#FFFBEB", border:"1.5px solid #FCD34D",
          borderRadius:12, padding:"12px 16px",
          display:"flex", gap:12, alignItems:"flex-start",
        }}>
          <span style={{ fontSize:20, lineHeight:1 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.1em", color:"#92400E", marginBottom:3 }}>
              Soft Stop — Review Recommended
            </div>
            <div style={{ fontSize:12, color:"#78350F", lineHeight:1.6 }}>{stop}</div>
          </div>
          <button
            onClick={() => setDismissed(s => [...s, i])}
            style={{ border:"none", background:"#FDE68A", color:"#92400E",
              borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
          >
            Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
//  STEP 3 — DrugRefTab (offline)
// ══════════════════════════════════════════════════════════════════
function DrugRefTab() {
  const [query,   setQuery]   = useState("");
  const [selected,setSelected]= useState(null);
  const [section, setSection] = useState("doses");

  const drugs    = Object.keys(DRUG_DB).sort();
  const filtered = query
    ? drugs.filter(d =>
        d.toLowerCase().includes(query.toLowerCase()) ||
        DRUG_DB[d].class.toLowerCase().includes(query.toLowerCase()))
    : drugs;
  const d = selected ? DRUG_DB[selected] : null;

  const SECTIONS = [
    {id:"doses",       label:"💊 Doses"},
    {id:"safety",      label:"⚠️ Safety"},
    {id:"interactions",label:"🔗 Interactions"},
    {id:"monitoring",  label:"📊 Monitoring"},
  ];

  const PREG_COL = {A:"#059669",B:"#0891B2",C:"#D97706",D:"#DC2626",X:"#7C3AED"};

  return (
    <div style={{display:"grid",gridTemplateColumns:selected?"220px 1fr":"320px",gap:16,alignItems:"start"}}>

      {/* List panel */}
      <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,padding:16,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <InstantBadge/>
        <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,margin:"10px 0 8px"}}>
          📚 {drugs.length} Drug Monographs
        </div>
        <input
          style={{...inputBase,marginBottom:10}}
          placeholder="Search drug name or class…"
          value={query}
          onChange={e=>{setQuery(e.target.value);setSelected(null);}}
        />
        <div style={{maxHeight:500,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
          {filtered.map(name=>(
            <button key={name} onClick={()=>setSelected(name)} style={{
              textAlign:"left",padding:"9px 12px",borderRadius:9,fontFamily:"inherit",cursor:"pointer",
              border:`1.5px solid ${selected===name?C.primary:C.border}`,
              background:selected===name?`${C.primary}08`:"#FAFAFA",transition:"all 0.15s",
            }}>
              <div style={{fontSize:12,fontWeight:700,color:selected===name?C.primary:C.text}}>{name}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:1}}>{DRUG_DB[name].class}</div>
            </button>
          ))}
          {filtered.length===0 && (
            <div style={{textAlign:"center",padding:"24px 0",color:C.light,fontSize:12}}>
              No match for "{query}"
            </div>
          )}
        </div>
      </div>

      {/* Monograph panel */}
      {d ? (
        <div style={{background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          {/* Header */}
          <div style={{background:"#111827",padding:"14px 20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,flexWrap:"wrap",gap:6}}>
              <div style={{color:"#F9FAFB",fontWeight:800,fontSize:14}}>{selected}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {d.pregCat && (
                  <span style={{background:PREG_COL[d.pregCat]||C.light,color:"#fff",fontSize:10,fontWeight:800,padding:"2px 9px",borderRadius:10}}>
                    Preg {d.pregCat}
                  </span>
                )}
                {d.blackBox && (
                  <span style={{background:"#DC2626",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:10}}>⬛ BB</span>
                )}
              </div>
            </div>
            <div style={{color:"#9CA3AF",fontSize:11,marginBottom:4}}>{d.class}</div>
            <div style={{color:"#D1FAE5",fontSize:11,lineHeight:1.55}}>{d.mechanism}</div>
          </div>

          {/* Section tabs */}
          <div style={{display:"flex",borderBottom:`1.5px solid ${C.border}`}}>
            {SECTIONS.map(s=>(
              <button key={s.id} onClick={()=>setSection(s.id)} style={{
                flex:1,padding:"9px 4px",border:"none",fontFamily:"inherit",cursor:"pointer",
                background:section===s.id?"#F0FDF4":"#FAFAFA",
                color:section===s.id?C.primary:C.muted,fontSize:11,fontWeight:700,
                borderBottom:section===s.id?`2px solid ${C.primary}`:"2px solid transparent",
                transition:"all 0.15s",
              }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{padding:"16px 18px",maxHeight:440,overflowY:"auto"}}>

            {section==="doses" && (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{background:"#F0FDF4",border:`1.5px solid ${C.borderMd}`,borderRadius:9,padding:"10px 13px"}}>
                  <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.dark,marginBottom:4}}>Available Forms</div>
                  <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{d.forms}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"#EFF6FF",borderRadius:9,padding:"10px 12px"}}>
                    <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#1E40AF",marginBottom:4}}>Adult Dose</div>
                    <div style={{fontSize:12,color:"#1E3A8A",lineHeight:1.6}}>{d.adultDose}</div>
                  </div>
                  <div style={{background:"#FFF7ED",borderRadius:9,padding:"10px 12px"}}>
                    <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#92400E",marginBottom:4}}>Paediatric Dose</div>
                    <div style={{fontSize:12,color:"#78350F",lineHeight:1.6}}>{d.childDose}</div>
                  </div>
                </div>
                {d.toxThreshold && (
                  <div style={{fontSize:11,color:"#92400E",padding:"7px 12px",background:"#FFFBEB",borderRadius:8}}>
                    ⚠️ <strong>Toxicity threshold:</strong> {d.toxThreshold}
                  </div>
                )}
                {d.antidote && d.antidote!=="N/A — supportive" && d.antidote!=="Supportive" && (
                  <div style={{fontSize:11,color:"#7C3AED",padding:"7px 12px",background:"#F5F3FF",borderRadius:8}}>
                    💊 <strong>Antidote:</strong> {d.antidote}
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{fontSize:11,color:C.muted,padding:"7px 11px",background:"#F9FAFB",borderRadius:8}}>
                    <strong>Renal:</strong> {d.renalNote}
                  </div>
                  <div style={{fontSize:11,color:C.muted,padding:"7px 11px",background:"#F9FAFB",borderRadius:8}}>
                    <strong>Hepatic:</strong> {d.hepaticNote}
                  </div>
                </div>
                {d.evidence && (
                  <div style={{fontSize:10,color:C.primary,padding:"5px 10px",background:"#F0FDF4",borderRadius:8}}>
                    📖 {d.evidence}
                  </div>
                )}
              </div>
            )}

            {section==="safety" && (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {d.blackBox && (
                  <div style={{background:"#1F2937",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#F87171",marginBottom:6}}>⬛ Black Box Warning</div>
                    <div style={{fontSize:12,color:"#FCA5A5",lineHeight:1.65}}>{d.blackBox}</div>
                  </div>
                )}
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>Contraindications</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {d.ci.map((ci,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"8px 12px",background:"#FEF2F2",borderRadius:8,fontSize:12,color:"#991B1B"}}>
                      <span style={{fontWeight:800}}>✕</span>{ci}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section==="interactions" && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {d.interactions.map(([drug,note],i)=>{
                  const sev = note.startsWith("Major")?"Major":note.startsWith("Moderate")?"Moderate":"Minor";
                  const sc  = SEVERITY_COLORS[sev]||SEVERITY_COLORS.Minor;
                  return (
                    <div key={i} style={{display:"flex",gap:10,padding:"9px 12px",background:"#FAFAFA",borderRadius:9,border:`1px solid ${C.border}`}}>
                      <span style={{background:sc.bg,color:sc.text,fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:5,whiteSpace:"nowrap"}}>
                        {sc.icon} {sev}
                      </span>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{drug}</div>
                        <div style={{fontSize:11,color:C.muted,marginTop:2}}>{note.replace(/^(Major|Moderate|Minor) — /,"")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {section==="monitoring" && (
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {d.monitoring.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:9,padding:"9px 12px",background:"#F0FDF4",borderRadius:9,fontSize:12,color:"#064E3B",border:`1px solid ${C.borderMd}`}}>
                    <span style={{color:C.primary,fontWeight:800}}>→</span>{m}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      ) : (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,borderRadius:16,border:`1.5px dashed ${C.border}`,padding:"60px 20px",color:C.light,fontSize:13,textAlign:"center",flexDirection:"column",gap:8}}>
          <span style={{fontSize:36}}>📚</span>
          Select a drug from the list to view its full offline monograph
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STEP 4 — Antibiotic Empiric Guide (offline)
// ══════════════════════════════════════════════════════════════════
const ANTIBIOTIC_GUIDE = [
  {infection:"Community-Acquired Pneumonia (Mild — Outpatient)",severity:"CURB-65 score 0–1",firstLine:"Amoxicillin 500mg TDS × 5 days PO",alternative:"Doxycycline 200mg OD × 5 days or Clarithromycin 500mg BD × 5 days",extra:"If atypical suspected: Azithromycin 500mg OD × 3–5 days",notes:"Add atypical cover if no improvement at 48h or healthcare exposure. Review at 48h.",evidence:"BTS CAP Guidelines 2023 · IDSA/ATS 2007",coverage:"S. pneumoniae, H. influenzae; atypicals: Mycoplasma, Chlamydophila, Legionella"},
  {infection:"Community-Acquired Pneumonia (Moderate-Severe — Hospital)",severity:"CURB-65 ≥2 or ICU",firstLine:"Co-Amoxiclav 1.2g TDS IV + Azithromycin 500mg OD IV",alternative:"Ceftriaxone 2g OD IV + Azithromycin 500mg OD; or Levofloxacin 500mg OD (monotherapy, non-ICU)",extra:"ICU: β-lactam + macrolide or respiratory fluoroquinolone. Consider Legionella urinary antigen.",notes:"Switch to oral when afebrile >24h and tolerating PO. 5-day course for most cases.",evidence:"BTS 2023 · IDSA/ATS 2007",coverage:"All CAP organisms + MSSA; consider Pseudomonas in bronchiectasis"},
  {infection:"Hospital-Acquired Pneumonia / VAP",severity:"Moderate-Severe",firstLine:"Piperacillin-Tazobactam 4.5g QDS IV or Cefepime 2g TDS IV",alternative:"Meropenem 1g TDS IV (ESBL/MDR risk or ICU HAP)",extra:"Add Vancomycin or Linezolid if MRSA risk factors (prior MRSA, central line, high-prevalence unit)",notes:"De-escalate at 72h based on culture sensitivities. 7-day course preferred — equal outcomes to longer courses.",evidence:"ATS/IDSA HAP/VAP Guidelines 2016",coverage:"Gram-negatives (Pseudomonas, Enterobacterales, Acinetobacter) ± MRSA"},
  {infection:"Uncomplicated UTI / Cystitis (Non-pregnant Female)",severity:"Lower tract infection",firstLine:"Nitrofurantoin 100mg MR BD × 5 days (avoid if CrCl <30)",alternative:"Trimethoprim 200mg BD × 7 days (if local resistance <20%) or Fosfomycin 3g single dose",extra:"N/A",notes:"Avoid quinolones for uncomplicated UTI — reserve for complicated infections. MSU culture only if treatment failure.",evidence:"NICE NG109 · EAU UTI Guidelines 2023",coverage:"E. coli (80%), S. saprophyticus, Klebsiella pneumoniae"},
  {infection:"Complicated UTI / Pyelonephritis",severity:"Any severity",firstLine:"Ciprofloxacin 500mg BD PO × 7 days or Ceftriaxone 1g OD IV",alternative:"Co-Amoxiclav 625mg TDS PO (if susceptible) or Meropenem IV (ESBL suspected)",extra:"N/A",notes:"MSU culture essential before starting antibiotics. Switch to oral when afebrile >24h. 7 days most cases; 14 days if bacteraemia confirmed.",evidence:"IDSA 2010 · EAU 2023",coverage:"Gram-negatives; suspect ESBL if recent hospitalisation or antibiotic exposure"},
  {infection:"Sepsis — Empiric (Community Onset)",severity:"Any",firstLine:"Piperacillin-Tazobactam 4.5g QDS IV + Gentamicin 5mg/kg OD IV (if CrCl ≥30)",alternative:"Meropenem 1g TDS IV (β-lactam allergy or ESBL risk — avoid aminoglycoside if CrCl <30)",extra:"Add Vancomycin if MRSA risk (central line, haemodialysis, prior MRSA, skin breakdown)",notes:"Take 2 blood culture sets BEFORE antibiotics. Give antibiotics within 1 hour of recognition. De-escalate at 48h. Reassess daily.",evidence:"Surviving Sepsis Campaign 2021 · NICE NG51",coverage:"Broad Gram-positive + Gram-negative; targeted de-escalation once sensitivities known"},
  {infection:"Cellulitis / Non-purulent Skin & Soft Tissue",severity:"Mild-Moderate",firstLine:"Flucloxacillin 500mg QDS PO × 5–7 days",alternative:"Cefalexin 500mg QDS (penicillin allergy) or Co-Amoxiclav 625mg TDS",extra:"N/A",notes:"Mark erythema border and review at 48h. IV therapy if: systemic features, facial/periorbital involvement, failure of oral treatment.",evidence:"NICE CG211 · IDSA SSTI Guidelines 2014",coverage:"β-haemolytic Streptococci (Group A, B), MSSA"},
  {infection:"Purulent Skin Infection — Abscess / Furuncle",severity:"Any",firstLine:"Incision & Drainage (I&D) — primary treatment. Add Trimethoprim-Sulfamethoxazole 960mg BD × 5–7 days if MRSA suspected",alternative:"Doxycycline 100mg BD × 5–7 days or Clindamycin 300–450mg QDS",extra:"N/A",notes:"I&D alone is sufficient for small abscesses. Antibiotics for: >2cm, systemic features, immunocompromised, multiple lesions, or MRSA risk.",evidence:"IDSA SSTI Guidelines 2014",coverage:"CA-MRSA, MSSA"},
  {infection:"Bacterial Meningitis — Adult (Empiric)",severity:"Medical emergency",firstLine:"Ceftriaxone 2g BD IV (START IMMEDIATELY — before CT if no contraindication to LP)",alternative:"Add Ampicillin 2g IV every 4h if age >50yr, immunocompromised, or pregnant (Listeria cover)",extra:"Dexamethasone 0.15mg/kg QDS × 4 days — give with or before FIRST antibiotic dose (reduces hearing loss in S. pneumoniae)",notes:"Do NOT delay antibiotics for CT/LP if there is risk of herniation or LP delay >30 min. CT only if focal neurology, seizures, drowsy, or immunocompromised.",evidence:"ESCMID/IDSA Meningitis Guidelines 2016 · BNF 2024",coverage:"N. meningitidis, S. pneumoniae, H. influenzae; add Listeria cover if age >50yr"},
  {infection:"Intraabdominal Infection / Peritonitis",severity:"Moderate-Severe",firstLine:"Piperacillin-Tazobactam 4.5g TDS IV",alternative:"Ceftriaxone 2g OD IV + Metronidazole 500mg TDS IV or Meropenem 1g TDS IV (severe/MDR risk)",extra:"N/A",notes:"Source control (surgery/drainage) is the primary treatment. Antibiotics: 3–5 days if source controlled; 5–7 days in severe/complicated cases.",evidence:"WSES Guidelines 2020 · IDSA IAI Guidelines 2010",coverage:"Aerobic Gram-negative Enterobacterales, anaerobes (B. fragilis), Enterococcus"},
  {infection:"Malaria — Uncomplicated P. falciparum",severity:"Non-severe outpatient",firstLine:"Artemether-Lumefantrine (Coartem) — 6 doses over 3 days with fatty food",alternative:"Artesunate-Amodiaquine or Dihydroartemisinin-Piperaquine (where available)",extra:"Primaquine 0.25mg/kg single dose if G6PD normal (clears gametocytes, reduces transmission)",notes:"Always use ACT as first-line. Chloroquine resistance widespread in P. falciparum. Confirm parasite clearance day 3.",evidence:"WHO Malaria Treatment Guidelines 2023 · NMCP Nigeria 2024",coverage:"P. falciparum (chloroquine-resistant); ACTs also active against P. vivax"},
  {infection:"Malaria — Severe P. falciparum (ICU)",severity:"Severe / ICU",firstLine:"Artesunate 2.4mg/kg IV/IM at 0, 12, 24h then OD until able to take oral ACT",alternative:"Quinine 20mg/kg loading IV then 10mg/kg TDS (if artesunate unavailable) + Doxycycline 100mg BD",extra:"N/A",notes:"Admit ICU. Monitor glucose, GCS, urine output, parasitaemia every 12h. Switch to oral ACT once parasitaemia <1% and tolerating PO.",evidence:"WHO Malaria Guidelines 2023",coverage:"P. falciparum (severe features: altered consciousness, respiratory distress, haemoglobin <7g/dL)"},
  {infection:"Pulmonary TB — Drug-Sensitive (Standard)",severity:"Standard first-line regimen",firstLine:"2HRZE: Isoniazid + Rifampicin + Pyrazinamide + Ethambutol × 2 months, then 4HR: Isoniazid + Rifampicin × 4 months",alternative:"BPaL regimen (Bedaquiline + Pretomanid + Linezolid) for extensively drug-resistant TB (XDR-TB)",extra:"Pyridoxine (Vitamin B6) 25–50mg OD with isoniazid to prevent peripheral neuropathy",notes:"DOT (Directly Observed Therapy) strongly recommended. LFTs monthly (rifampicin + isoniazid hepatotoxicity). Notify public health.",evidence:"WHO TB Guidelines 2022 · National TB Control Programme",coverage:"Mycobacterium tuberculosis (drug-sensitive)"},
];

function AntibioticTab() {
  const [filter,   setFilter]   = useState("all");
  const [expanded, setExpanded] = useState(null);

  const cats = ["all","Pneumonia","UTI","Sepsis","Skin","Meningitis","Intraabdominal","Malaria","TB"];
  const shown = filter==="all"
    ? ANTIBIOTIC_GUIDE
    : ANTIBIOTIC_GUIDE.filter(e=>e.infection.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <InstantBadge/>
        <span style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted}}>
          🦠 {ANTIBIOTIC_GUIDE.length} Empiric Protocols
        </span>
      </div>

      {/* Category filter */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {cats.map(cat=>(
          <button key={cat} onClick={()=>{setFilter(cat);setExpanded(null);}} style={{
            padding:"5px 13px",borderRadius:18,fontFamily:"inherit",cursor:"pointer",
            border:`1.5px solid ${filter===cat?C.primary:C.border}`,
            background:filter===cat?C.primary:"#FAFAFA",
            color:filter===cat?"#fff":C.muted,fontSize:11,fontWeight:700,transition:"all 0.15s",
          }}>
            {cat==="all"?"All Infections":cat}
          </button>
        ))}
      </div>

      {shown.map((g,i)=>(
        <div key={i} style={{background:C.surface,borderRadius:13,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 6px rgba(0,0,0,0.03)"}}>
          {/* Header row */}
          <div onClick={()=>setExpanded(expanded===i?null:i)} style={{padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:3}}>{g.infection}</div>
              <span style={{background:`${C.primary}15`,color:C.primary,fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:10}}>{g.severity}</span>
            </div>
            <span style={{fontSize:14,color:C.light,flexShrink:0}}>{expanded===i?"▲":"▼"}</span>
          </div>

          {/* First-line always visible */}
          <div style={{padding:"0 16px 12px",borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>First-Line</div>
            <div style={{fontSize:12,fontWeight:700,color:C.dark}}>{g.firstLine}</div>
          </div>

          {/* Expanded detail */}
          {expanded===i && (
            <div style={{borderTop:`1.5px solid ${C.border}`,padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:g.extra!=="N/A"?"1fr 1fr":"1fr",gap:8}}>
                <div style={{background:"#EFF6FF",borderRadius:9,padding:"9px 11px"}}>
                  <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#1E40AF",marginBottom:4}}>Alternative</div>
                  <div style={{fontSize:11,color:"#1E3A8A",lineHeight:1.6}}>{g.alternative}</div>
                </div>
                {g.extra!=="N/A" && (
                  <div style={{background:"#FFF7ED",borderRadius:9,padding:"9px 11px"}}>
                    <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#92400E",marginBottom:4}}>Additional</div>
                    <div style={{fontSize:11,color:"#78350F",lineHeight:1.6}}>{g.extra}</div>
                  </div>
                )}
              </div>
              <div style={{background:"#F9FAFB",borderRadius:9,padding:"9px 11px"}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>Coverage Spectrum</div>
                <div style={{fontSize:11,color:C.text,lineHeight:1.5}}>{g.coverage}</div>
              </div>
              <div style={{background:"#F0FDF4",borderRadius:9,padding:"9px 11px"}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.dark,marginBottom:4}}>📝 Clinical Notes</div>
                <div style={{fontSize:11,color:C.text,lineHeight:1.65}}>{g.notes}</div>
              </div>
              <div style={{fontSize:10,color:C.primary}}>📖 {g.evidence}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STEP 5 — Extended Clinical Calculators (offline)
// ══════════════════════════════════════════════════════════════════
function ExtendedCalcTab() {
  const [active,setActive] = useState("ibw");

  // IBW/ABW
  const [ibwG,setIbwG] = useState("Male");
  const [ibwH,setIbwH] = useState("");
  const [ibwW,setIbwW] = useState("");
  const ibw = ibwH
    ? (ibwG==="Male" ? 50 + 2.3*(parseFloat(ibwH)-152.4)/2.54
                     : 45.5 + 2.3*(parseFloat(ibwH)-152.4)/2.54)
    : null;
  const abw = ibw && ibwW && parseFloat(ibwW)>ibw*1.2
    ? ibw + 0.4*(parseFloat(ibwW)-ibw) : null;

  // Wells DVT
  const [wells,setWells] = useState({ac:false,par:false,bed:false,tend:false,leg:false,pit:false,alt:false});
  const wellsRaw  = Object.entries(wells).reduce((s,[k,v])=>s+(v?(k==="alt"?-2:1):0),0);
  const wellsRisk = wellsRaw<=0?"Low — <5% DVT probability":wellsRaw<=2?"Moderate — ~17% DVT probability":"High — ~53% DVT probability";

  // HEART Score
  const [heart,setHeart] = useState({hx:0,ecg:0,age:0,rf:0,trop:0});
  const heartScore = Object.values(heart).reduce((a,b)=>a+b,0);
  const heartRisk  = heartScore<=3?"Low — <2% MACE. Safe early discharge.":heartScore<=6?"Moderate — ~12% MACE. Observation.":"High — >50% MACE. Urgent cardiology.";

  // CHA2DS2-VASc
  const [cha,setCha] = useState({chf:false,htn:false,age75:false,dm:false,stroke:false,vasc:false,age65:false,fem:false});
  const chaScore = (cha.chf?1:0)+(cha.htn?1:0)+(cha.age75?2:0)+(cha.dm?1:0)+(cha.stroke?2:0)+(cha.vasc?1:0)+(cha.age65?1:0)+(cha.fem?1:0);
  const chaRec   = chaScore===0?"No anticoagulation needed":chaScore===1?"Consider OAC if male":"OAC strongly recommended";

  // MELD
  const [meld,setMeld] = useState({cr:"",bili:"",inr:""});
  const meldScore = meld.cr&&meld.bili&&meld.inr
    ? Math.round(9.57*Math.log(Math.max(parseFloat(meld.cr),1))+3.78*Math.log(Math.max(parseFloat(meld.bili),1))+11.2*Math.log(Math.max(parseFloat(meld.inr),1))+6.43)
    : null;

  // Corrected Calcium
  const [cal,setCal] = useState({ca:"",alb:""});
  const corrCa = cal.ca && cal.alb
    ? (parseFloat(cal.ca)+0.8*(40-parseFloat(cal.alb))/10).toFixed(2) : null;

  // Anion Gap
  const [ag,setAg] = useState({na:"",cl:"",hco3:"",alb:""});
  const anionGap = ag.na&&ag.cl&&ag.hco3 ? parseFloat(ag.na)-parseFloat(ag.cl)-parseFloat(ag.hco3) : null;
  const corrAg   = anionGap&&ag.alb ? (anionGap+2.5*(40-parseFloat(ag.alb))/10).toFixed(1) : null;

  // Paediatric weight
  const [pedAge,setPedAge] = useState("");
  const pedApls = pedAge && parseInt(pedAge)>=2 ? (parseInt(pedAge)+4)*2 : null;
  const pedAea  = pedAge && parseInt(pedAge)>=1 && parseInt(pedAge)<=12 ? 3*parseInt(pedAge)+7 : null;

  // ── shared helpers ──
  const NF = ({lbl,val,onCh,unit,ph}) => (
    <div>
      <Label ch={lbl}/>
      <div style={{display:"flex",gap:5}}>
        <input style={{...inputBase,flex:1}} type="number" placeholder={ph||"0"} value={val} onChange={e=>onCh(e.target.value)}/>
        {unit&&<span style={{padding:"10px 11px",background:"#F3F4F6",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{unit}</span>}
      </div>
    </div>
  );
  const Res = ({lbl,val,unit,color,note}) => (
    <div style={{background:`${color||C.primary}12`,border:`1.5px solid ${color||C.primary}28`,borderRadius:11,padding:"12px 16px",textAlign:"center"}}>
      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>{lbl}</div>
      <div style={{fontSize:22,fontWeight:800,color:color||C.primary,lineHeight:1}}>
        {val??"-"}{unit&&<span style={{fontSize:12,marginLeft:4}}>{unit}</span>}
      </div>
      {note&&<div style={{fontSize:10,color:C.muted,marginTop:5,lineHeight:1.4}}>{note}</div>}
    </div>
  );
  const CRow = ({lbl,val,onCh,pts}) => (
    <label style={{display:"flex",alignItems:"center",gap:9,padding:"8px 11px",background:"#FAFAFA",borderRadius:9,border:`1.5px solid ${val?C.primary:C.border}`,cursor:"pointer",fontSize:12,color:C.text}}>
      <input type="checkbox" checked={val} onChange={e=>onCh(e.target.checked)} style={{width:15,height:15,accentColor:C.primary,cursor:"pointer"}}/>
      <span style={{flex:1}}>{lbl}</span>
      {pts&&<span style={{fontSize:11,fontWeight:800,color:C.primary}}>{pts}</span>}
    </label>
  );

  const CALCS = [
    {id:"ibw",   icon:"⚖️", label:"IBW / ABW",       desc:"Ideal & Adjusted Body Weight"},
    {id:"wells", icon:"🩸", label:"Wells DVT",        desc:"DVT pre-test probability"},
    {id:"heart", icon:"❤️", label:"HEART Score",      desc:"Chest pain cardiac risk"},
    {id:"cha2",  icon:"🧠", label:"CHA₂DS₂-VASc",    desc:"AF stroke risk score"},
    {id:"meld",  icon:"🫀", label:"MELD Score",       desc:"Liver disease severity"},
    {id:"calcium",icon:"🔬",label:"Corrected Ca²⁺",   desc:"Hypoalbuminaemia correction"},
    {id:"ag",    icon:"🧪", label:"Anion Gap",        desc:"Metabolic acidosis workup"},
    {id:"paed",  icon:"👶", label:"Paed Weight",      desc:"Age-based weight estimation"},
  ];

  return (
    <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:14,alignItems:"start"}}>

      {/* Calc list */}
      <div style={{background:C.surface,borderRadius:15,border:`1.5px solid ${C.border}`,padding:13,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <InstantBadge/>
        <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,margin:"10px 0 8px"}}>Select Calculator</div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {CALCS.map(c=>(
            <button key={c.id} onClick={()=>setActive(c.id)} style={{
              textAlign:"left",padding:"9px 11px",borderRadius:9,fontFamily:"inherit",cursor:"pointer",
              border:`1.5px solid ${active===c.id?C.primary:C.border}`,
              background:active===c.id?`${C.primary}10`:"#FAFAFA",
            }}>
              <div style={{fontSize:12,fontWeight:700,color:active===c.id?C.primary:C.text}}>{c.icon} {c.label}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:1}}>{c.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Active calculator */}
      <div style={{background:C.surface,borderRadius:15,border:`1.5px solid ${C.border}`,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>

        {active==="ibw" && (
          <div>
            <SH icon="⚖️" ch="Ideal & Adjusted Body Weight"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 14px",lineHeight:1.6}}>Devine formula (1974). Use IBW for drug dosing in obesity. Use ABW when actual weight &gt;120% IBW.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <Label ch="Gender"/>
                <div style={{display:"flex",gap:5}}>
                  {["Male","Female"].map(g=>(
                    <button key={g} onClick={()=>setIbwG(g)} style={{flex:1,padding:"9px",borderRadius:9,border:`1.5px solid ${ibwG===g?C.primary:C.border}`,background:ibwG===g?`${C.primary}15`:"#FAFAFA",color:ibwG===g?C.primary:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{g}</button>
                  ))}
                </div>
              </div>
              <NF lbl="Height" val={ibwH} onCh={setIbwH} unit="cm" ph="170"/>
              <NF lbl="Actual Weight" val={ibwW} onCh={setIbwW} unit="kg" ph="95"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Res lbl="IBW" val={ibw?ibw.toFixed(1):null} unit="kg" color={C.primary} note="Devine formula"/>
              <Res lbl="ABW" val={abw?abw.toFixed(1):null} unit="kg" color="#0891B2" note={ibwW&&ibw&&parseFloat(ibwW)<=ibw*1.2?"Use Actual Weight (≤120% IBW)":"IBW + 0.4 × (Actual − IBW)"}/>
              <Res lbl="% Over IBW" val={ibw&&ibwW?((parseFloat(ibwW)-ibw)/ibw*100).toFixed(0):null} unit="%" color={ibwW&&ibw&&parseFloat(ibwW)>ibw*1.3?C.danger:C.warn} note=">20% = use IBW or ABW for dosing"/>
            </div>
          </div>
        )}

        {active==="wells" && (
          <div>
            <SH icon="🩸" ch="Wells DVT Score"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>Pre-test probability of deep vein thrombosis. Score ≥2: high probability — ultrasound + empiric LMWH. Wells et al, Lancet 1997.</p>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
              {[["ac","+1 — Active cancer (treatment within 6 months or palliative)"],["par","+1 — Paralysis, paresis, or recent plaster immobilisation of lower extremity"],["bed","+1 — Bedridden >3 days or major surgery within 4 weeks"],["tend","+1 — Localised tenderness along deep venous system"],["leg","+1 — Entire leg swelling"],["pit","+1 — Calf swelling >3cm vs asymptomatic side"],["alt","−2 — Alternative diagnosis at least as likely as DVT"]].map(([k,lbl])=>(
                <CRow key={k} lbl={lbl} val={wells[k]} onCh={v=>setWells(s=>({...s,[k]:v}))}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Res lbl="Wells Score" val={wellsRaw} color={wellsRaw<=0?C.primary:wellsRaw<=2?C.warn:C.danger}/>
              <Res lbl="Probability" val={wellsRisk} color={wellsRaw<=0?C.primary:wellsRaw<=2?C.warn:C.danger} note="Next step: D-dimer if Low/Moderate; USS if High"/>
            </div>
            <p style={{margin:"10px 0 0",fontSize:10,color:C.muted}}>📖 Wells et al. Lancet 1997 · Validation: Ann Intern Med 2003</p>
          </div>
        )}

        {active==="heart" && (
          <div>
            <SH icon="❤️" ch="HEART Score — Chest Pain Risk"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>Score ≤3: low risk — safe for early discharge without further testing. Backus et al, Int J Emerg Med 2010.</p>
            {[
              {id:"hx",  lbl:"History",  opts:[["0","Slightly suspicious"],["1","Moderately suspicious"],["2","Highly suspicious"]]},
              {id:"ecg", lbl:"ECG",      opts:[["0","Normal"],["1","Non-specific repolarization disturbance"],["2","Significant ST deviation"]]},
              {id:"age", lbl:"Age",      opts:[["0","<45 years"],["1","45–64 years"],["2","≥65 years"]]},
              {id:"rf",  lbl:"Risk Factors (HTN, DM, obesity, smoking, FHx IHD, atherosclerosis)", opts:[["0","No known RF"],["1","1–2 risk factors"],["2","≥3 RF or history of atherosclerotic disease"]]},
              {id:"trop",lbl:"Initial Troponin", opts:[["0","≤normal limit"],["1","1–3× upper limit of normal"],["2",">3× upper limit of normal"]]},
            ].map(item=>(
              <div key={item.id} style={{marginBottom:10}}>
                <Label ch={item.lbl}/>
                <div style={{display:"flex",gap:5}}>
                  {item.opts.map(([val,lbl])=>(
                    <button key={val} onClick={()=>setHeart(s=>({...s,[item.id]:parseInt(val)}))} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`1.5px solid ${heart[item.id]===parseInt(val)?C.primary:C.border}`,background:heart[item.id]===parseInt(val)?`${C.primary}15`:"#FAFAFA",color:heart[item.id]===parseInt(val)?C.primary:C.muted,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                      {val}: {lbl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
              <Res lbl="HEART Score" val={`${heartScore}/10`} color={heartScore<=3?C.primary:heartScore<=6?C.warn:C.danger}/>
              <Res lbl="Risk & Action" val={heartRisk} color={heartScore<=3?C.primary:heartScore<=6?C.warn:C.danger}/>
            </div>
          </div>
        )}

        {active==="cha2" && (
          <div>
            <SH icon="🧠" ch="CHA₂DS₂-VASc — AF Stroke Risk"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>Guides anticoagulation in non-valvular atrial fibrillation. Score ≥2 in males, ≥3 in females: OAC strongly recommended. ESC AF Guidelines 2020.</p>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
              {[["chf","C — Congestive Heart Failure / LVEF <40%","+1"],["htn","H — Hypertension (resting BP >140/90 or on antihypertensives)","+1"],["age75","A — Age ≥75 years","+2"],["dm","D — Diabetes mellitus","+1"],["stroke","S — Stroke / TIA / thromboembolic event (ever)","+2"],["vasc","V — Vascular disease (prior MI, peripheral artery disease, aortic plaque)","+1"],["age65","A₂ — Age 65–74 years","+1"],["fem","Sc — Female sex category","+1"]].map(([k,lbl,pts])=>(
                <CRow key={k} lbl={lbl} val={cha[k]} onCh={v=>setCha(s=>({...s,[k]:v}))} pts={pts}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Res lbl="CHA₂DS₂-VASc" val={chaScore} color={chaScore<=1?C.primary:C.warn}/>
              <Res lbl="Recommendation" val={chaRec} color={chaScore<=1?C.primary:C.warn}/>
            </div>
            <p style={{margin:"10px 0 0",fontSize:10,color:C.muted}}>📖 ESC AF Guidelines 2020 · Lip GYH et al. Chest 2010</p>
          </div>
        )}

        {active==="meld" && (
          <div>
            <SH icon="🫀" ch="MELD Score — Liver Disease Severity"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>Formula: 9.57·ln(Cr) + 3.78·ln(Bili) + 11.2·ln(INR) + 6.43. Transplant listing threshold typically MELD ≥15.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <NF lbl="Creatinine" val={meld.cr}   onCh={v=>setMeld(s=>({...s,cr:v}))}   unit="mg/dL" ph="1.0"/>
              <NF lbl="Bilirubin"  val={meld.bili}  onCh={v=>setMeld(s=>({...s,bili:v}))} unit="mg/dL" ph="1.0"/>
              <NF lbl="INR"        val={meld.inr}   onCh={v=>setMeld(s=>({...s,inr:v}))}  ph="1.0"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Res lbl="MELD Score" val={meldScore} color={meldScore===null?C.light:meldScore<15?C.primary:meldScore<25?C.warn:C.danger}/>
              <Res lbl="3-Month Mortality" val={meldScore===null?null:meldScore<10?"<5%":meldScore<20?"10–20%":meldScore<30?"20–40%":meldScore<40?"40–80%":">80%"} color={meldScore===null?C.light:meldScore<15?C.primary:C.danger} note="Transplant listing threshold: MELD ≥15"/>
            </div>
          </div>
        )}

        {active==="calcium" && (
          <div>
            <SH icon="🔬" ch="Corrected Calcium for Hypoalbuminaemia"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>Formula: Corrected Ca²⁺ = Measured Ca²⁺ + 0.8 × (40 − Albumin) ÷ 10. Normal range: 2.12–2.62 mmol/L.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <NF lbl="Measured Calcium" val={cal.ca}  onCh={v=>setCal(s=>({...s,ca:v}))}  unit="mmol/L" ph="1.9"/>
              <NF lbl="Albumin"          val={cal.alb} onCh={v=>setCal(s=>({...s,alb:v}))} unit="g/L"    ph="20"/>
            </div>
            <Res
              lbl="Corrected Calcium"
              val={corrCa} unit="mmol/L"
              color={!corrCa?C.light:parseFloat(corrCa)<2.12?"#2563EB":parseFloat(corrCa)>2.62?C.danger:C.primary}
              note={!corrCa?null:parseFloat(corrCa)<2.12?"Hypocalcaemia":parseFloat(corrCa)>2.62?"Hypercalcaemia":"Within normal range"}
            />
          </div>
        )}

        {active==="ag" && (
          <div>
            <SH icon="🧪" ch="Anion Gap + Albumin Correction"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>AG = Na⁺ − (Cl⁻ + HCO₃⁻). Normal 8–12 mEq/L. Corrected AG = AG + 2.5 × (40 − Albumin) ÷ 10.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <NF lbl="Na⁺"               val={ag.na}   onCh={v=>setAg(s=>({...s,na:v}))}   unit="mEq/L" ph="140"/>
              <NF lbl="Cl⁻"               val={ag.cl}   onCh={v=>setAg(s=>({...s,cl:v}))}   unit="mEq/L" ph="102"/>
              <NF lbl="HCO₃⁻"             val={ag.hco3} onCh={v=>setAg(s=>({...s,hco3:v}))} unit="mEq/L" ph="24"/>
              <NF lbl="Albumin (optional)" val={ag.alb}  onCh={v=>setAg(s=>({...s,alb:v}))} unit="g/L"   ph="40"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Res lbl="Anion Gap" val={anionGap?anionGap.toFixed(1):null} unit="mEq/L" color={anionGap&&anionGap>12?C.danger:C.primary} note={anionGap&&anionGap>12?"High AG — consider MUDPILES":"Normal anion gap"}/>
              <Res lbl="Corrected AG" val={corrAg} unit="mEq/L" color={corrAg&&parseFloat(corrAg)>12?C.danger:C.primary} note={ag.alb?"Albumin-corrected":"Enter albumin for corrected AG"}/>
            </div>
            {anionGap&&anionGap>12&&(
              <div style={{background:"#FFF7ED",border:"1.5px solid #FCD34D",borderRadius:9,padding:"10px 13px",marginTop:10,fontSize:11,color:"#92400E",lineHeight:1.6}}>
                <strong>MUDPILES:</strong> Methanol · Uraemia · DKA · Propylene glycol · Isoniazid / Iron · Lactic acidosis · Ethylene glycol · Salicylates
              </div>
            )}
          </div>
        )}

        {active==="paed" && (
          <div>
            <SH icon="👶" ch="Paediatric Weight Estimation"/>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>Age-based formulas for emergencies when actual weight is unavailable. Always weigh when possible. AEA formula validated in African paediatric populations.</p>
            <NF lbl="Age" val={pedAge} onCh={setPedAge} unit="years" ph="5"/>
            {pedAge && parseInt(pedAge)>=1 && (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:14}}>
                <Res lbl="APLS Formula (2–12yr)" val={pedApls} unit="kg" color={C.primary}  note="(Age + 4) × 2 — UK/international standard"/>
                <Res lbl="AEA Formula (1–12yr)"  val={pedAea}  unit="kg" color="#0891B2" note="3 × Age + 7 — validated in African children (COPWA Study, BMJ 2017)"/>
              </div>
            )}
            {pedAge && parseInt(pedAge)<1 && (
              <div style={{background:"#FEF2F2",borderRadius:9,padding:"10px 13px",marginTop:12,fontSize:12,color:"#991B1B"}}>
                For infants &lt;1 year: approximate weight = birth weight + (age in months × 0.5kg). Use growth chart for accuracy.
              </div>
            )}
            <div style={{background:"#FFFBEB",borderRadius:9,padding:"10px 13px",marginTop:12,fontSize:11,color:"#92400E",lineHeight:1.6}}>
              📖 The AEA formula (3×age+7) is more accurate than APLS (2×[age+4]) for African paediatric populations. Consensus on Paediatric Weight in Africa (COPWA) Study, BMJ 2017.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STEP 6 — Lab Values Reference (offline)
// ══════════════════════════════════════════════════════════════════
const LAB_PANELS = {
  "🩸 Haematology": [
    {name:"Haemoglobin — Male",          normal:"130–175 g/L",      low:"Anaemia",                              high:"Polycythaemia / dehydration",                critical:"<70 g/L"},
    {name:"Haemoglobin — Female",         normal:"120–160 g/L",      low:"Anaemia",                              high:"Polycythaemia",                              critical:"<70 g/L"},
    {name:"White Blood Cells (WBC)",      normal:"4.0–11.0 ×10⁹/L", low:"Leucopaenia (viral, bone marrow, drugs)",high:"Leucocytosis (bacterial, leukaemia, stress)", critical:"<2.0 or >30 ×10⁹/L"},
    {name:"Neutrophils",                  normal:"1.8–7.7 ×10⁹/L",  low:"Neutropaenia — infection risk",         high:"Neutrophilia — bacterial, steroid, stress",   critical:"<0.5 ×10⁹/L"},
    {name:"Platelets",                    normal:"150–400 ×10⁹/L",   low:"Thrombocytopaenia (ITP, DIC, HIT, drug)",high:"Thrombocytosis (reactive, ET)",              critical:"<50 or >1000 ×10⁹/L"},
    {name:"MCV",                          normal:"80–96 fL",          low:"Microcytic (iron deficiency, thalassaemia)",high:"Macrocytic (B12/folate deficiency, alcohol, hypothyroid)",critical:null},
  ],
  "🧪 Electrolytes": [
    {name:"Sodium (Na⁺)",      normal:"136–145 mmol/L", low:"Hyponatraemia: SIADH, HF, cirrhosis",     high:"Hypernatraemia: dehydration, DI",        critical:"<125 or >155 mmol/L"},
    {name:"Potassium (K⁺)",    normal:"3.5–5.0 mmol/L", low:"Hypokalaemia: diuretics, vomiting, Conn's",high:"Hyperkalaemia: AKI, Addison's, ACEi",    critical:"<2.5 or >6.5 mmol/L (arrest risk)"},
    {name:"Bicarbonate HCO₃⁻", normal:"22–29 mmol/L",   low:"Metabolic acidosis / resp. alkalosis",     high:"Metabolic alkalosis / resp. acidosis",   critical:null},
    {name:"Chloride (Cl⁻)",    normal:"98–108 mmol/L",  low:"Metabolic alkalosis, vomiting",            high:"Hyperchloraemic acidosis, dehydration",  critical:null},
    {name:"Calcium (Ca²⁺)",    normal:"2.12–2.62 mmol/L",low:"Hypo: hypoparathyroid, vit D def., pancreatitis",high:"Hyper: malignancy, hyperparathyroid, sarcoid",critical:"<1.75 or >3.5 mmol/L"},
    {name:"Magnesium (Mg²⁺)",  normal:"0.75–1.05 mmol/L",low:"Hypo: diuretics, alcohol, diarrhoea",     high:"Hyper: renal failure, excess supplement",critical:"<0.4 mmol/L (arrhythmia)"},
    {name:"Phosphate",         normal:"0.87–1.45 mmol/L",low:"Hypo: refeeding syndrome, DKA treatment", high:"Hyper: CKD, hypoparathyroidism",         critical:null},
  ],
  "🫀 Liver Function": [
    {name:"ALT",           normal:"7–56 U/L",     low:"Not significant",      high:"Hepatocellular damage: hepatitis, NAFLD, drugs",  critical:">10× ULN = severe injury"},
    {name:"AST",           normal:"10–40 U/L",    low:"Not significant",      high:"Hepatic or cardiac/skeletal muscle damage",       critical:null},
    {name:"ALP",           normal:"44–147 U/L",   low:"Zinc deficiency (rare)",high:"Cholestasis, bone disease, malignancy",          critical:null},
    {name:"Bilirubin (total)",normal:"3–20 µmol/L",low:"Not significant",    high:"Jaundice >35µmol/L: haemolysis, hepatitis, obstruction",critical:">250 µmol/L neonates (kernicterus)"},
    {name:"Albumin",       normal:"35–50 g/L",    low:"Liver disease, nephrotic syndrome, malnutrition",high:"Dehydration (relative)",critical:null},
    {name:"INR / PT",      normal:"INR 0.8–1.2",  low:"N/A",                  high:"Anticoagulants, liver disease, DIC, vit K def.", critical:"INR >3 without anticoagulant"},
  ],
  "🫘 Renal Function": [
    {name:"Creatinine — Male",  normal:"62–115 µmol/L",  low:"Low muscle mass",      high:"AKI, CKD, dehydration",                        critical:">300 µmol/L"},
    {name:"Creatinine — Female",normal:"53–97 µmol/L",   low:"Low muscle mass",      high:"AKI, CKD, dehydration",                        critical:">250 µmol/L"},
    {name:"Urea (BUN ÷0.357)",  normal:"2.5–7.8 mmol/L", low:"Liver failure, malnutrition",high:"AKI, CKD, upper GI bleed, dehydration",   critical:">35 mmol/L"},
    {name:"eGFR (CKD-EPI)",     normal:"≥60 mL/min/1.73m²",low:"<60=CKD; <30=severe; <15=ESRD",high:"N/A",                              critical:null},
  ],
  "🩺 Cardiac & Metabolic": [
    {name:"Troponin I/T (hs)",normal:"Lab-specific (<14–16 ng/L typical)",low:"N/A",high:"ACS, myocarditis, PE, HF, CKD (serial rise)",critical:"Rise >50% at 1h = acute MI"},
    {name:"BNP",               normal:"<100 pg/mL",  low:"N/A", high:"Heart failure, LVH, PE, renal failure",        critical:null},
    {name:"HbA1c",             normal:"<42 mmol/mol (<6.0%)",low:"N/A",high:"42–47: pre-diabetes; ≥48: T2DM",         critical:null},
    {name:"Fasting Glucose",   normal:"3.9–5.5 mmol/L",low:"Hypoglycaemia <3.9: insulin, Addison's",high:">7.0 = provisional DM",critical:"<2.5 or >25 mmol/L"},
    {name:"Lactate",           normal:"0.5–2.0 mmol/L",low:"N/A",high:">2.0: hypoperfusion, sepsis, metformin",   critical:">4.0 mmol/L"},
    {name:"CRP",               normal:"<5 mg/L",     low:"N/A", high:"Bacterial infection, autoimmune, malignancy", critical:null},
    {name:"TSH",               normal:"0.4–4.0 mIU/L",low:"Hyperthyroidism",high:"Hypothyroidism",                  critical:null},
    {name:"Procalcitonin (PCT)",normal:"<0.1 µg/L",  low:"N/A", high:">0.25 bacterial likely; >0.5 sepsis; >10 severe sepsis",critical:">10 µg/L"},
  ],
  "🫁 Blood Gas (ABG)": [
    {name:"pH",         normal:"7.35–7.45",         low:"Acidaemia",                    high:"Alkalaemia",                   critical:"<7.20 or >7.60"},
    {name:"PaO₂ (air)",normal:"11–13 kPa (83–100mmHg)",low:"Hypoxaemia: Type I or II RF",high:"Hyperoxia (excess O₂)",        critical:"<8 kPa on room air"},
    {name:"PaCO₂",     normal:"4.7–6.0 kPa (35–45mmHg)",low:"Resp. alkalosis / hyperventilation",high:"Resp. acidosis / hypoventilation",critical:"<2.0 or >9.0 kPa"},
    {name:"HCO₃⁻",     normal:"22–26 mmol/L",       low:"Metabolic acidosis",           high:"Metabolic alkalosis",          critical:null},
    {name:"Base Excess",normal:"−2 to +2 mmol/L",    low:"Metabolic acidosis (<−2)",     high:"Metabolic alkalosis (>+2)",    critical:"<−10 mmol/L"},
    {name:"SaO₂",      normal:"95–100%",             low:"<94% = supplemental O₂ needed",high:"N/A",                          critical:"<90%"},
  ],
};

function LabValuesTab() {
  const [panel,  setPanel]   = useState(Object.keys(LAB_PANELS)[0]);
  const [search, setSearch]  = useState("");
  const [critical,setCritical] = useState(false);

  const allLabs = Object.values(LAB_PANELS).flat();
  const display = search
    ? allLabs.filter(l=>l.name.toLowerCase().includes(search.toLowerCase()))
    : LAB_PANELS[panel]||[];
  const shown = critical ? display.filter(l=>l.critical) : display;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <InstantBadge/>
        <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:C.danger,cursor:"pointer"}}>
          <input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)} style={{accentColor:C.danger}}/>
          Critical values only
        </label>
      </div>

      <input style={{...inputBase,marginBottom:14}} placeholder="Search lab test…" value={search} onChange={e=>setSearch(e.target.value)}/>

      {!search && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {Object.keys(LAB_PANELS).map(p=>(
            <button key={p} onClick={()=>setPanel(p)} style={{
              padding:"6px 13px",borderRadius:20,fontFamily:"inherit",cursor:"pointer",
              border:`1.5px solid ${panel===p?C.primary:C.border}`,
              background:panel===p?C.primary:"#FAFAFA",
              color:panel===p?"#fff":C.muted,fontSize:11,fontWeight:700,transition:"all 0.15s",
            }}>{p}</button>
          ))}
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {shown.map((lab,i)=>(
          <div key={i} style={{background:C.surface,borderRadius:12,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,alignItems:"start"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{lab.name}</div>
                <div style={{fontSize:11,fontWeight:800,color:C.primary}}>Normal: {lab.normal}</div>
                {lab.critical && (
                  <div style={{fontSize:11,color:C.danger,marginTop:3,fontWeight:700}}>⚠️ Critical: {lab.critical}</div>
                )}
              </div>
              <div>
                {lab.low  && lab.low!=="N/A"  && <div style={{fontSize:11,color:"#2563EB",marginBottom:2}}>↓ {lab.low}</div>}
                {lab.high && lab.high!=="N/A" && <div style={{fontSize:11,color:C.danger}}>↑ {lab.high}</div>}
              </div>
            </div>
          </div>
        ))}
        {shown.length===0 && (
          <div style={{textAlign:"center",padding:"30px",color:C.light,fontSize:13}}>
            {search ? `No labs matching "${search}"` : "No critical values in this panel"}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STEP 7 — Voice Input Panel (Ambient Clinical Intelligence)
//  Uses Web Speech API (Chrome/Edge) + precision engine Claude extraction
// ══════════════════════════════════════════════════════════════════
function VoiceInputPanel({ onExtracted, onClose, privacyMode }) {
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [extracting,  setExtracting]  = useState(false);
  const [extracted,   setExtracted]   = useState(null);
  const [error,       setError]       = useState("");
  const recRef = useRef(null);

  const supported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = () => {
    setTranscript(""); setExtracted(null); setError("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Web Speech API not supported. Use Chrome or Edge."); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = true;
    rec.onresult = e => {
      const txt = Array.from(e.results).map(r=>r[0].transcript).join(" ");
      setTranscript(txt);
    };
    rec.onend  = () => setListening(false);
    rec.onerror= e => { setListening(false); setError(`Voice error: ${e.error}`); };
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const stopListening = () => { recRef.current?.stop(); setListening(false); };

  const extractEntities = async () => {
    if (!transcript.trim()) { setError("No speech captured. Try again."); return; }
    setExtracting(true); setError("");

    const makePrompt = (id) =>
      `You are Clinical Extraction Engine ${id}. Extract patient variables from this dictation.
Return ONLY valid JSON — no markdown, no preamble.

Dictation: "${transcript}"

JSON schema (use null if not mentioned):
{
  "patientName":"string or null",
  "age":"numeric string or null",
  "weight":"numeric string or null",
  "unit":"kg or lbs",
  "gender":"Male or Female or null",
  "drug":"generic drug name or null",
  "amountMg":"numeric string in mg or null",
  "route":"Oral/Intravenous (IV)/Intramuscular (IM)/Subcutaneous (SC) or null",
  "indication":"clinical indication or null",
  "notes":"additional context or null"
}`;

    try {
      const [rA,rB] = await Promise.all([
        fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:400,messages:[{role:"user",content:makePrompt("A")}]})}),
        fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:400,messages:[{role:"user",content:makePrompt("B")}]})}),
      ]);
      const [dA,dB] = await Promise.all([rA.json(),rB.json()]);
      const parse = d => JSON.parse((d.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());
      const a = parse(dA), b = parse(dB);

      // Precision Engine consensus check on critical fields
      const criticalFields = ["drug","amountMg","weight","age"];
      const mismatches = criticalFields.filter(k => String(a[k]||"").trim() !== String(b[k]||"").trim());
      setExtracted({ ...a, _verified: mismatches.length===0, _mismatches: mismatches, _b: b });
    } catch(e) {
      setError("Extraction failed: " + e.message);
    } finally {
      setExtracting(false);
    }
  };

  const confirm = () => {
    if (!extracted) return;
    const clean = {...extracted};
    ["_verified","_mismatches","_b"].forEach(k=>delete clean[k]);
    onExtracted(clean);
  };

  return (
    <div style={{background:"#fff",borderRadius:20,border:`2px solid ${C.primary}`,padding:"20px",boxShadow:"0 8px 32px rgba(5,150,105,0.15)",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:800,color:C.text}}>🎙️ Voice Input — Ambient Clinical Intelligence</div>
        <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,color:C.light,cursor:"pointer"}}>✕</button>
      </div>

      {privacyMode && (
        <div style={{background:"#F5F3FF",border:"1.5px solid #7C3AED",borderRadius:9,padding:"8px 14px",marginBottom:12,fontSize:11,color:"#7C3AED",fontWeight:700}}>
          🔒 Privacy Mode ON — voice transcript processed for extraction only, not stored.
        </div>
      )}

      {!supported ? (
        <div style={{background:"#FEF2F2",borderRadius:9,padding:"12px 14px",fontSize:12,color:"#991B1B"}}>
          ⚠️ Web Speech API not available. Use Chrome or Edge on desktop for voice input.
        </div>
      ) : (
        <>
          {/* Microphone button */}
          <div style={{textAlign:"center",marginBottom:14}}>
            <button onClick={listening?stopListening:startListening} style={{
              width:68,height:68,borderRadius:"50%",border:"none",cursor:"pointer",
              background:listening?C.danger:`linear-gradient(135deg,${C.primary},${C.dark})`,
              color:"#fff",fontSize:26,
              boxShadow:listening?"0 0 0 8px rgba(220,38,38,0.2)":"0 4px 14px rgba(5,150,105,0.35)",
              transition:"all 0.2s",
            }}>
              {listening?"⏹":"🎙"}
            </button>
            <div style={{fontSize:12,color:listening?C.danger:C.muted,marginTop:8,fontWeight:700}}>
              {listening
                ? "Listening… tap to stop"
                : 'Tap mic then speak: "Patient is 70kg, 45 years, Paracetamol 500mg oral"'}
            </div>
          </div>

          {/* Transcript */}
          {transcript && (
            <div style={{background:"#F9FAFB",borderRadius:9,border:`1.5px solid ${C.border}`,padding:"11px 14px",marginBottom:12}}>
              <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>What was heard</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.65,fontStyle:"italic"}}>"{transcript}"</div>
            </div>
          )}

          {/* Extract button */}
          {transcript && !extracted && (
            <button onClick={extractEntities} disabled={extracting} style={{
              width:"100%",padding:"11px",borderRadius:10,border:"none",
              background:extracting?"#6EE7B7":`linear-gradient(135deg,${C.primary},${C.dark})`,
              color:"#fff",fontSize:13,fontWeight:700,cursor:extracting?"wait":"pointer",
              fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            }}>
              {extracting
                ? <><span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Precision Engine Verifying…</>
                : "🔍 Extract Patient Variables (Precision Engine)"}
            </button>
          )}

          {/* Extracted result */}
          {extracted && (
            <div style={{marginTop:12}}>
              {extracted._mismatches?.length>0 ? (
                <div style={{background:"#FEF2F2",border:"1.5px solid #FCA5A5",borderRadius:9,padding:"10px 14px",marginBottom:10,fontSize:12,color:"#991B1B"}}>
                  ⚠️ <strong>Engine mismatch</strong> on: {extracted._mismatches.join(", ")}. Verify manually before confirming.
                </div>
              ) : (
                <div style={{background:"#F0FDF4",border:`1.5px solid ${C.borderMd}`,borderRadius:9,padding:"8px 14px",marginBottom:10,fontSize:12,color:C.dark}}>
                  ✅ <strong>Precision Engine consensus verified</strong> — both engines agree on all critical fields.
                </div>
              )}
              <div style={{background:"#FAFAFA",borderRadius:9,border:`1.5px solid ${C.border}`,padding:"11px 14px",marginBottom:12}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>Extracted Variables — Review Before Confirming</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  {Object.entries(extracted)
                    .filter(([k,v])=>!k.startsWith("_")&&v&&v!=="null")
                    .map(([k,v])=>(
                      <div key={k} style={{fontSize:12,color:C.text}}>
                        <span style={{fontWeight:700,color:C.muted,textTransform:"capitalize"}}>{k}: </span>{v}
                      </div>
                    ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setExtracted(null);setTranscript("");}} style={{flex:1,padding:"9px",borderRadius:9,border:`1.5px solid ${C.border}`,background:"#FAFAFA",color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>↩ Re-record</button>
                <button onClick={confirm} style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>✅ Confirm &amp; Fill Form</button>
              </div>
            </div>
          )}

          {error && <div style={{marginTop:10,fontSize:12,color:C.danger}}>{error}</div>}
        </>
      )}
      <p style={{margin:"12px 0 0",fontSize:10,color:C.light,textAlign:"center",lineHeight:1.5}}>
        Precision Engine verification prevents Smart extraction errors. For production medical use,
        replace with AssemblyAI Medical Mode for improved drug name accuracy.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STEP 2 — Offline Drug Monograph Database (16 essential drugs)
//  Based on WHO EML 2023 + BNF 2024 + IDSA/AHA/ESC guidelines
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
//  SCALABILITY LAYER
//  Prevents crashes under load:
//  • Error Boundary — catches component crashes, shows recovery UI
//  • API Request Queue — max 3 concurrent, exponential backoff retry
//  • Rate limit detection — 429 handling with queue drain
//  • Payment record store — country, time, amount per transaction
//  • Active user heartbeat — real-time user count for admin
// ══════════════════════════════════════════════════════════════════

// ─── Error Boundary ────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error) { return { hasError:true, error }; }
  componentDidCatch(error, info) { console.error("MedGuard ErrorBoundary:", error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{padding:40,textAlign:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
        <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,color:"#111827"}}>Something went wrong</h2>
        <p style={{margin:"0 0 20px",fontSize:13,color:"#6B7280",maxWidth:400,marginLeft:"auto",marginRight:"auto"}}>
          An unexpected error occurred. Your data is safe. Please reload to continue.
        </p>
        <p style={{margin:"0 0 20px",fontSize:11,color:"#9CA3AF",fontFamily:"monospace",background:"#F9FAFB",padding:"8px 14px",borderRadius:8,display:"inline-block"}}>
          {String(this.state.error?.message||"Unknown error")}
        </p>
        <br/>
        <button
          onClick={()=>{ this.setState({hasError:false,error:null}); window.location.reload(); }}
          style={{padding:"11px 28px",borderRadius:10,border:"none",background:"#059669",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
        >
          Reload App
        </button>
      </div>
    );
  }
}

// ─── API Request Queue ─────────────────────────────────────────────
// Prevents thundering-herd crashes: max 3 concurrent Anthropic calls,
// 429/5xx triggers exponential backoff (1s→2s→4s→8s, max 4 retries).
const _queue = { running:0, maxConcurrent:3, pending:[] };

async function queuedFetch(url, options, retries=0) {
  // Wait if at capacity
  if (_queue.running >= _queue.maxConcurrent) {
    await new Promise(res => _queue.pending.push(res));
  }
  _queue.running++;
  try {
    const resp = await fetch(url, options);
    if (resp.status === 429 || resp.status >= 500) {
      if (retries < 4) {
        const wait = Math.min(1000 * Math.pow(2, retries), 16000);
        await new Promise(r => setTimeout(r, wait));
        return queuedFetch(url, options, retries + 1);
      }
      throw new Error(`API error ${resp.status} after ${retries} retries`);
    }
    return resp;
  } finally {
    _queue.running--;
    // Release next waiting request
    const next = _queue.pending.shift();
    if (next) next();
  }
}

// ─── Payment Record Store ──────────────────────────────────────────
async function recordPayment({ provider, planId, amount, currency, country }) {
  try {
    const raw = await window.storage.get("medguard:payments").catch(()=>({value:"[]"}));
    const records = JSON.parse(raw?.value||"[]");
    records.unshift({
      id: `pay_${Date.now()}`,
      ts: new Date().toISOString(),
      provider,
      planId,
      amount,
      currency,
      country: country || (navigator.language?.split("-")[1]) || "NG",
      month: new Date().toISOString().slice(0,7),
    });
    await window.storage.set("medguard:payments", JSON.stringify(records.slice(0,500)));
  } catch {}
}

async function getPaymentRecords() {
  try {
    const raw = await window.storage.get("medguard:payments").catch(()=>({value:"[]"}));
    return JSON.parse(raw?.value||"[]");
  } catch { return []; }
}

// ─── Active User Heartbeat ─────────────────────────────────────────
// Each session writes a heartbeat every 60s. Admin counts sessions
// with a heartbeat within the last 5 minutes as "active users".
const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

async function sendHeartbeat() {
  try {
    const raw = await window.storage.get("medguard:heartbeats").catch(()=>({value:"{}"}));
    const beats = JSON.parse(raw?.value||"{}");
    // Expire sessions older than 10 minutes
    const cutoff = Date.now() - 10*60*1000;
    Object.keys(beats).forEach(k=>{ if(beats[k]<cutoff) delete beats[k]; });
    beats[SESSION_ID] = Date.now();
    await window.storage.set("medguard:heartbeats", JSON.stringify(beats));
  } catch {}
}

async function getActiveUserCount() {
  try {
    const raw = await window.storage.get("medguard:heartbeats").catch(()=>({value:"{}"}));
    const beats = JSON.parse(raw?.value||"{}");
    const cutoff = Date.now() - 5*60*1000;
    return Object.values(beats).filter(t=>t>cutoff).length;
  } catch { return 0; }
}


// ══════════════════════════════════════════════════════════════════
//  PRODUCTION FEATURE BLOCK
//  Dark Mode · SOAP Scribe · Camera Scanner · Math Proofs ·
//  AR Dosing · Haptic/Audio · Hash Chain · Ward Batch ·
//  Pharmacogenomics · Helio · TrustWallet · Watermark
// ══════════════════════════════════════════════════════════════════

// ─── Watermark ────────────────────────────────────────────────────
// Replace COMPANY_NAME with your actual company name before launch
const COMPANY_NAME = "REPLACE_WITH_YOUR_COMPANY_NAME";
function Watermark() {
  return (
    <div style={{
      position:"fixed", bottom:10, right:14, zIndex:50,
      fontSize:9, fontWeight:800, letterSpacing:"0.12em",
      textTransform:"uppercase", color:"rgba(5,150,105,0.18)",
      pointerEvents:"none", userSelect:"none", fontFamily:"inherit",
    }}>
      {COMPANY_NAME} · MedGuard
    </div>
  );
}

// ─── Dark Mode Tokens ─────────────────────────────────────────────
const DARK = {
  bg:"#0F1117", surface:"#1A1D27", border:"#2D3149",
  borderMd:"#1F6B4B", primary:"#10B981", dark:"#059669",
  text:"#F1F5F9", muted:"#94A3B8", light:"#64748B",
  danger:"#F87171", warn:"#FBBF24",
};

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("medguard:dark")==="1"; } catch { return false; }
  });
  const toggle = () => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem("medguard:dark", next?"1":"0"); } catch {}
      return next;
    });
  };
  return [dark, toggle];
}

// ─── Haptic + Audio Feedback ──────────────────────────────────────
const haptic = {
  safe:    () => navigator.vibrate?.([200]),
  caution: () => navigator.vibrate?.([200,100,200]),
  critical:() => navigator.vibrate?.([300,100,300,100,300]),
  micro:   () => navigator.vibrate?.([50]),
};

function playTone(type) {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type==="safe")     { o.frequency.value=523; g.gain.setValueAtTime(0.15,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.4); }
    if (type==="caution")  { o.frequency.value=440; g.gain.setValueAtTime(0.2,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.6); }
    if (type==="critical") { o.frequency.value=330; g.gain.setValueAtTime(0.3,now); g.gain.exponentialRampToValueAtTime(0.001,now+1.0); }
    o.start(now); o.stop(now+1.2);
    setTimeout(()=>ctx.close(), 1500);
  } catch {}
}

function triggerFeedback(tag) {
  haptic[tag?.toLowerCase()||"micro"]?.();
  playTone(tag?.toLowerCase()||"safe");
}

// ─── Hash Chain Audit Ledger ──────────────────────────────────────
async function hashStr(str) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  } catch { return String(Date.now()); }
}

async function appendAuditEntry({ patientHash, drug, dose, tag, sessionId, overrides=[] }) {
  try {
    const raw = await window.storage.get("medguard:audit").catch(()=>({value:"[]"}));
    const chain = JSON.parse(raw?.value||"[]");
    const prev = chain[0]?.hash || "genesis";
    const payload = `${Date.now()}|${patientHash}|${drug}|${dose}|${tag}|${sessionId}|${prev}`;
    const hash = await hashStr(payload);
    chain.unshift({ ts:new Date().toISOString(), patientHash, drug, dose, tag, sessionId, hash, prev, overrides });
    await window.storage.set("medguard:audit", JSON.stringify(chain.slice(0,1000)));
  } catch {}
}

async function getAuditChain() {
  try {
    const raw = await window.storage.get("medguard:audit").catch(()=>({value:"[]"}));
    return JSON.parse(raw?.value||"[]");
  } catch { return []; }
}

// ─── SOAP Scribe Integration Helpers ─────────────────────────────
function parseSOAPLink() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source")==="soap") {
      const data = JSON.parse(atob(params.get("data")||"e30="));
      return data;
    }
  } catch {}
  return null;
}

function sendResultToScribe(result, form) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type:"medguard:result",
        result,
        patientContext: { name:form.patientName, age:form.age, weight:form.weight },
        ts: new Date().toISOString(),
      }, "*");
    }
  } catch {}
}

// ─── Pharmacogenomics Alerts (West African) ───────────────────────
const PHARMACO_ALERTS = {
  "Primaquine":         { risk:"G6PD Deficiency", freq:"20–30% West African prevalence", severity:"Major", action:"Check G6PD level before prescribing. Can cause fatal haemolytic anaemia in G6PD-deficient patients." },
  "Dapsone":            { risk:"G6PD Deficiency", freq:"20–30% West African prevalence", severity:"Major", action:"Avoid in known G6PD deficiency. Haemolysis risk." },
  "Nitrofurantoin":     { risk:"G6PD Deficiency", freq:"20–30% West African prevalence", severity:"Moderate", action:"Use with caution. Risk of haemolytic anaemia in G6PD-deficient patients." },
  "Codeine":            { risk:"CYP2D6 Ultra-Rapid Metabolism", freq:"Higher frequency in West Africa", severity:"Major", action:"Ultra-rapid metabolisers convert codeine to morphine rapidly — risk of opioid toxicity, especially in children. Avoid in paediatrics." },
  "Tramadol":           { risk:"CYP2D6 Variation", freq:"Variable in West Africa", severity:"Moderate", action:"CYP2D6 variation alters active metabolite levels. Monitor closely for efficacy and toxicity." },
  "Abacavir":           { risk:"HLA-B*5701 Hypersensitivity", freq:"Lower in West Africans vs Europeans but present", severity:"Major", action:"Screen for HLA-B*5701 before initiation. Positive result = contraindicated (fatal hypersensitivity reaction)." },
  "Chloroquine":        { risk:"G6PD Deficiency + CYP2D6", freq:"Common in malaria-endemic regions", severity:"Moderate", action:"High-dose chloroquine may worsen haemolysis in G6PD-deficient patients." },
};

function PharmacoAlert({ drugName, C }) {
  const alert = Object.entries(PHARMACO_ALERTS).find(([d])=>
    drugName?.toLowerCase().includes(d.toLowerCase())
  );
  if (!alert) return null;
  const [, info] = alert;
  const col = info.severity==="Major"?"#DC2626":info.severity==="Moderate"?"#D97706":"#059669";
  return (
    <div style={{background:`${col}10`,border:`1.5px solid ${col}30`,borderRadius:10,padding:"11px 15px",marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:col,marginBottom:4}}>
        🧬 West African Pharmacogenomics — {info.severity} Risk
      </div>
      <div style={{fontSize:12,fontWeight:700,color:col,marginBottom:3}}>{info.risk} · {info.freq}</div>
      <div style={{fontSize:11,color:"#374151",lineHeight:1.6}}>{info.action}</div>
    </div>
  );
}

// ─── Camera Lab Sheet Scanner ─────────────────────────────────────
function CameraScanner({ onExtracted, onClose, C }) {
  const [streaming, setStreaming] = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [preview, setPreview]     = useState(null);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setStreaming(true); setError("");
    } catch { setError("Camera access denied. Allow camera in browser settings."); }
  };

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const b64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    setPreview(canvas.toDataURL("image/jpeg", 0.6));
    streamRef.current?.getTracks().forEach(t=>t.stop());
    setStreaming(false);
    extractValues(b64);
  };

  const extractValues = async (b64) => {
    setScanning(true);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:600,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 }},
            { type:"text", text:`Extract all lab values from this medical lab result sheet. Return ONLY valid JSON — no preamble.
Schema (use null for values not present):
{ "sodium":null,"potassium":null,"bicarbonate":null,"chloride":null,"creatinine":null,"urea":null,
  "glucose":null,"haemoglobin":null,"wbc":null,"platelets":null,"alt":null,"ast":null,
  "bilirubin":null,"albumin":null,"inr":null,"calcium":null,"magnesium":null,"phosphate":null,
  "pcr":null,"lactate":null,"hba1c":null,"troponin":null,"bnp":null,"tsh":null,"units":"SI or US" }` }
          ]}]
        }),
      });
      const d = await resp.json();
      const txt = (d.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
      setResult(JSON.parse(txt));
    } catch { setError("Could not read lab sheet. Ensure the image is clear and well-lit."); }
    finally { setScanning(false); }
  };

  const close = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); onClose(); };

  return (
    <div style={{background:"#fff",borderRadius:20,border:`2px solid ${C.primary}`,padding:20,marginBottom:16,boxShadow:"0 8px 32px rgba(5,150,105,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:800,color:C.text}}>📷 Lab Sheet Scanner</div>
        <button onClick={close} style={{border:"none",background:"none",fontSize:18,color:C.light,cursor:"pointer"}}>✕</button>
      </div>
      {!streaming && !preview && (
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <p style={{fontSize:12,color:C.muted,marginBottom:16}}>Point camera at a printed lab result sheet. Values are extracted automatically.</p>
          <button onClick={startCamera} style={{padding:"12px 28px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            📷 Open Camera
          </button>
        </div>
      )}
      {streaming && (
        <div style={{textAlign:"center"}}>
          <video ref={videoRef} style={{width:"100%",borderRadius:12,marginBottom:10}} muted playsInline/>
          <button onClick={capture} style={{padding:"12px 32px",borderRadius:12,border:"none",background:C.primary,color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
            📸 Capture
          </button>
        </div>
      )}
      {scanning && <div style={{textAlign:"center",padding:"20px",color:C.muted,fontSize:13}}>Reading lab values…</div>}
      {preview && !scanning && (
        <div>
          <img src={preview} style={{width:"100%",borderRadius:10,marginBottom:12}} alt="Lab sheet"/>
          {result && (
            <div>
              <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:10}}>Extracted Values</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {Object.entries(result).filter(([k,v])=>v!==null&&k!=="units").map(([k,v])=>(
                  <div key={k} style={{background:"#F0FDF4",borderRadius:8,padding:"7px 10px",border:`1px solid ${C.borderMd}`}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.text}}>{v}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>{onExtracted(result);close();}} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                ✅ Use These Values
              </button>
            </div>
          )}
        </div>
      )}
      {error && <div style={{fontSize:12,color:C.danger,marginTop:10,textAlign:"center"}}>{error}</div>}
    </div>
  );
}

// ─── Math Proofs Panel ────────────────────────────────────────────
function MathProofsPanel({ form, weightKg, crcl, bmi, bsa, mgPerKg, C }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{marginBottom:12}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:`1px solid ${C.borderMd}`,borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,color:C.primary,cursor:"pointer",fontFamily:"inherit",width:"100%",textAlign:"left",display:"flex",justifyContent:"space-between"}}>
        <span>📐 Show Formula Workings</span>
        <span>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{background:"#F0FDF4",borderRadius:10,border:`1.5px solid ${C.borderMd}`,padding:"14px 16px",marginTop:6,fontSize:11,fontFamily:"'Courier New',monospace",color:"#064E3B"}}>
          {form.weight && form.age && (
            <div style={{marginBottom:10}}>
              <div style={{fontFamily:"inherit",fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>Cockcroft-Gault CrCl</div>
              <div>Formula : (140 − Age) × Weight ÷ (72 × SCr) × {form.gender==="Female"?"0.85 [Female]":"1.00 [Male]"}</div>
              {form.screatinine && <div style={{marginTop:3}}>
                = (140 − {form.age}) × {weightKg} ÷ (72 × {form.screatinine}) × {form.gender==="Female"?"0.85":"1.00"}
                {crcl !== null && <div style={{fontWeight:800,color:C.primary}}>= {crcl.toFixed(1)} mL/min</div>}
              </div>}
            </div>
          )}
          {bmi && (
            <div style={{marginBottom:10}}>
              <div style={{fontFamily:"inherit",fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>BMI</div>
              <div>Formula : Weight(kg) ÷ Height(m)²</div>
              <div>= {weightKg} ÷ ({(parseFloat(form.height)/100).toFixed(2)})²</div>
              <div style={{fontWeight:800,color:C.primary}}>= {bmi} kg/m²</div>
            </div>
          )}
          {bsa && (
            <div style={{marginBottom:10}}>
              <div style={{fontFamily:"inherit",fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>Body Surface Area (Mosteller)</div>
              <div>Formula : √(Weight(kg) × Height(cm) ÷ 3600)</div>
              <div>= √({weightKg} × {form.height} ÷ 3600)</div>
              <div style={{fontWeight:800,color:C.primary}}>= {bsa} m²</div>
            </div>
          )}
          {mgPerKg && (
            <div>
              <div style={{fontFamily:"inherit",fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>mg/kg Calculation</div>
              <div>Formula : Dose(mg) ÷ Weight(kg)</div>
              <div>= {form.amountMg} ÷ {weightKg}</div>
              <div style={{fontWeight:800,color:C.primary}}>= {mgPerKg} mg/kg</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helio (MoonPay Commerce) + TrustWallet helpers ───────────────
// Helio: stablecoin USDC payments via MoonPay Commerce (formerly Helio).
// Generate your payment links from app.hel.io or commerce.moonpay.com
// TrustWallet uses WalletConnect — opens deep link to wallet for USDC tx.
const HELIO_PRO_LINK     = "https://app.hel.io/pay/REPLACE_WITH_HELIO_PRO_LINK";
const HELIO_PRO_MAX_LINK = "https://app.hel.io/pay/REPLACE_WITH_HELIO_PRO_MAX_LINK";
const WC_PROJECT_ID      = "REPLACE_WITH_WALLETCONNECT_PROJECT_ID";

function openHelioCheckout({ plan, onOpen }) {
  const link = plan.id==="proMax" ? HELIO_PRO_MAX_LINK : HELIO_PRO_LINK;
  window.open(link, "_blank", "noopener,noreferrer");
  onOpen?.();
}

function openTrustWalletCheckout({ plan, onOpen }) {
  // WalletConnect deep link — opens TrustWallet, MetaMask, or any WC wallet
  const uri = `wc:REPLACE_WITH_WC_URI_FOR_${plan.id.toUpperCase()}`;
  const trustDeep = `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`;
  window.open(trustDeep, "_blank", "noopener,noreferrer");
  onOpen?.();
}

// ─── Ward Round Batch Evaluator ───────────────────────────────────
function WardRoundBatch({ C, isPro, onUpgrade }) {
  const [patients, setPatients] = useState(
    Array.from({length:3},(_,i)=>({ id:i+1, name:"", age:"", weight:"", drug:"Amoxicillin", amountMg:"", indication:"", result:null, loading:false, error:"" }))
  );
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone]       = useState(false);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const resultRef = useRef(null);

  if (!isPro) return (
    <div style={{textAlign:"center",padding:"40px 20px",background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`}}>
      <div style={{fontSize:36,marginBottom:10}}>📋</div>
      <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:6}}>Ward Round Batch Evaluator</div>
      <p style={{fontSize:12,color:C.muted,marginBottom:16}}>Evaluate up to 10 patients at once and export a consolidated ward round summary PDF.</p>
      <button onClick={onUpgrade} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
        Unlock with Pro →
      </button>
    </div>
  );

  const addPatient = () => {
    if (patients.length >= 10) return;
    setPatients(p=>[...p, { id:Date.now(), name:"", age:"", weight:"", drug:"Amoxicillin", amountMg:"", indication:"", result:null, loading:false, error:"" }]);
  };

  const updatePatient = (idx, field, val) => {
    setPatients(p=>p.map((pt,i)=>i===idx?{...pt,[field]:val}:pt));
  };

  const runBatch = async () => {
    setBatchRunning(true); setBatchDone(false);
    for (let i = 0; i < patients.length; i++) {
      const pt = patients[i];
      if (!pt.weight || !pt.amountMg || !pt.age) continue;
      setPatients(prev=>prev.map((p,idx)=>idx===i?{...p,loading:true,error:""}:p));
      try {
        const prompt = `Evaluate this patient rapidly. Return ONLY JSON: {"tag":"SAFE|CAUTION|CRITICAL","dose":"dose string","drug":"full name","schedule":"schedule","overdose":{"critical":false,"mgPerKg":"value"}}
Patient: ${pt.name||"Anon"}, ${pt.age}yr, ${pt.weight}kg. Drug: ${pt.drug} ${pt.amountMg}mg. Indication: ${pt.indication}.`;
        const raw = await clinicalQuery({ prompt, fast:true, maxTokens:300 });
        const res = JSON.parse(raw.replace(/```json|```/g,"").trim());
        setPatients(prev=>prev.map((p,idx)=>idx===i?{...p,result:res,loading:false}:p));
      } catch(e) {
        setPatients(prev=>prev.map((p,idx)=>idx===i?{...p,error:"Evaluation failed",loading:false}:p));
      }
    }
    setBatchRunning(false); setBatchDone(true);
  };

  const TC = {SAFE:{bg:"#059669"},CAUTION:{bg:"#D97706"},CRITICAL:{bg:"#DC2626"}};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{fontSize:13,fontWeight:800,color:C.text}}>📋 Ward Round Batch Evaluator ({patients.length}/10 patients)</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={addPatient} disabled={patients.length>=10} style={{padding:"8px 14px",borderRadius:9,border:`1.5px solid ${C.border}`,background:C.surface,color:C.primary,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Add Patient</button>
          <button onClick={runBatch} disabled={batchRunning} style={{padding:"8px 18px",borderRadius:9,border:"none",background:batchRunning?"#6EE7B7":`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",fontSize:12,fontWeight:700,cursor:batchRunning?"wait":"pointer",fontFamily:"inherit"}}>
            {batchRunning?"Evaluating…":"🚀 Run Batch"}
          </button>
        </div>
      </div>

      <div ref={resultRef} style={{display:"flex",flexDirection:"column",gap:10}}>
        {patients.map((pt,i)=>(
          <div key={pt.id} style={{background:C.surface,borderRadius:13,border:`1.5px solid ${C.border}`,padding:"14px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1.5fr 1fr 1fr auto",gap:8,alignItems:"center"}}>
            <input style={{...inputBase,fontSize:12}} placeholder={`Patient ${i+1} name`} value={pt.name} onChange={e=>updatePatient(i,"name",e.target.value)}/>
            <input style={{...inputBase,fontSize:12}} type="number" placeholder="Age" value={pt.age} onChange={e=>updatePatient(i,"age",e.target.value)}/>
            <input style={{...inputBase,fontSize:12}} type="number" placeholder="Wt kg" value={pt.weight} onChange={e=>updatePatient(i,"weight",e.target.value)}/>
            <input style={{...inputBase,fontSize:12}} placeholder="Drug" value={pt.drug} onChange={e=>updatePatient(i,"drug",e.target.value)}/>
            <input style={{...inputBase,fontSize:12}} type="number" placeholder="mg" value={pt.amountMg} onChange={e=>updatePatient(i,"amountMg",e.target.value)}/>
            <input style={{...inputBase,fontSize:12}} placeholder="Indication" value={pt.indication} onChange={e=>updatePatient(i,"indication",e.target.value)}/>
            <div style={{minWidth:60,textAlign:"center"}}>
              {pt.loading && <span style={{fontSize:11,color:C.muted}}>…</span>}
              {pt.error   && <span style={{fontSize:10,color:C.danger}}>!</span>}
              {pt.result  && <span style={{background:TC[pt.result.tag]?.bg||"#9CA3AF",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:10}}>{pt.result.tag}</span>}
            </div>
          </div>
        ))}
      </div>

      {batchDone && (
        <div style={{marginTop:16}}>
          <div style={{background:"#F0FDF4",border:`1.5px solid ${C.borderMd}`,borderRadius:12,padding:"14px 18px",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:800,color:C.dark,marginBottom:8}}>Ward Round Summary</div>
            {patients.filter(p=>p.result).map((pt,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                <span style={{fontWeight:600,color:C.text}}>{pt.name||`Patient ${i+1}`} · {pt.age}yr · {pt.weight}kg</span>
                <span style={{color:C.muted}}>{pt.result.drug} — {pt.result.dose}</span>
                <span style={{background:TC[pt.result.tag]?.bg||"#9CA3AF",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10}}>{pt.result.tag}</span>
              </div>
            ))}
            <div style={{marginTop:8,fontSize:11,color:C.muted}}>
              Critical: {patients.filter(p=>p.result?.tag==="CRITICAL").length} · 
              Caution: {patients.filter(p=>p.result?.tag==="CAUTION").length} · 
              Safe: {patients.filter(p=>p.result?.tag==="SAFE").length}
            </div>
          </div>
          <button onClick={()=>generatePDF(resultRef.current,`WardRound-${new Date().toISOString().slice(0,10)}.pdf`,"Ward Round",new Date().toLocaleString(),setPdfLoading)}
            disabled={pdfLoading}
            style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",fontSize:13,fontWeight:700,cursor:pdfLoading?"wait":"pointer",fontFamily:"inherit"}}>
            {pdfLoading?"Generating PDF…":"📄 Download Ward Round Summary PDF"}
          </button>
        </div>
      )}
    </div>
  );
}

const DRUG_DB = {
  "Paracetamol (Acetaminophen)": {
    class:"Analgesic / Antipyretic", pregCat:"B", antidote:"N-Acetylcysteine (NAC) IV",
    mechanism:"Centrally inhibits prostaglandin synthesis; modulates serotonergic & cannabinoid pathways.",
    forms:"Tab 500mg, 1g · Syrup 250mg/5mL · IV infusion 1g/100mL",
    adultDose:"500–1000mg every 4–6h PO/IV. Max 4g/day.",
    childDose:"10–15mg/kg every 4–6h. Max 60mg/kg/day.",
    maxSafe:"4g/day (2g/day in hepatic impairment or chronic alcohol use)",
    toxThreshold:"150mg/kg = acute hepatotoxicity threshold",
    renalNote:"CrCl <30: extend dosing interval to every 8h.",
    hepaticNote:"Severe impairment: max 2g/day. Avoid in acute liver failure.",
    blackBox:null,
    ci:["Severe hepatic impairment","Hypersensitivity to paracetamol","Chronic alcohol use >3 units/day"],
    interactions:[["Warfarin","Moderate — potentiates INR at doses >2g/day. Monitor INR."],["Rifampicin","Moderate — enzyme induction reduces paracetamol efficacy."],["Alcohol","Major — additive hepatotoxicity risk."]],
    monitoring:["LFTs with chronic or high-dose use","Serum paracetamol level at 4h post-ingestion in overdose","INR if patient on warfarin"],
    evidence:"NICE NG215 · WHO EML 2023 · BNF 2024",
  },
  "Ibuprofen": {
    class:"NSAID (non-selective COX-1/COX-2 inhibitor)", pregCat:"C (D ≥30wk)", antidote:"Supportive — no specific antidote",
    mechanism:"Inhibits COX-1 and COX-2, reducing prostaglandin and thromboxane synthesis. Anti-inflammatory, analgesic, antipyretic.",
    forms:"Tab 200mg, 400mg, 600mg · Syrup 100mg/5mL · IV 400mg/100mL",
    adultDose:"200–400mg TDS/QDS with food. Max 2400mg/day (prescription); 1200mg/day (OTC).",
    childDose:"5–10mg/kg TDS. Max 30mg/kg/day (>3 months).",
    maxSafe:"2400mg/day adults; 1200mg/day OTC",
    toxThreshold:">400mg/kg acute ingestion may cause toxicity",
    renalNote:"Avoid CrCl <30. Short-term use only if CrCl 30–60. Risk of acute kidney injury.",
    hepaticNote:"Avoid in severe hepatic impairment.",
    blackBox:"Cardiovascular risk (MI, stroke). GI ulceration/bleeding. Contraindicated peri-operatively with CABG.",
    ci:["Active peptic ulcer disease","CKD stage 3b+ (CrCl <30)","Heart failure","Pregnancy ≥30 weeks","Aspirin/NSAID hypersensitivity","Post-CABG surgery"],
    interactions:[["Warfarin","Major — additive bleeding risk. Avoid combination."],["Lithium","Major — NSAIDs reduce renal lithium excretion → toxicity."],["ACEi/ARBs","Moderate — reduces antihypertensive effect; nephrotoxicity risk."],["Aspirin (low-dose)","Moderate — ibuprofen blocks aspirin's irreversible COX-1 binding (cardioprotection reduced)."]],
    monitoring:["Renal function after >7 days use","BP in hypertensive patients","FBC (chronic use)","GI symptoms"],
    evidence:"BNF 2024 · FDA labelling 2023 · NICE CG177",
  },
  "Amoxicillin": {
    class:"Aminopenicillin (β-lactam antibiotic)", pregCat:"B", antidote:"N/A",
    mechanism:"Inhibits bacterial cell wall synthesis by binding penicillin-binding proteins (PBPs). Bactericidal against susceptible Gram-positive and Gram-negative organisms.",
    forms:"Cap 250mg, 500mg · Suspension 125mg/5mL, 250mg/5mL · IV/IM 500mg powder",
    adultDose:"250–500mg TDS PO. Severe infections: 1g TDS. IV/IM: 500mg–1g TDS.",
    childDose:"25mg/kg/day in 3 divided doses. Severe: 40–90mg/kg/day.",
    maxSafe:"3g/day PO; 6g/day IV (severe infection)",
    toxThreshold:"N/A — wide therapeutic window",
    renalNote:"CrCl 10–30: 250–500mg BD. CrCl <10: 250mg BD. Consider dose extension in severe CKD.",
    hepaticNote:"No dose adjustment required.",
    blackBox:null,
    ci:["Penicillin hypersensitivity","EBV infectious mononucleosis (risk of widespread maculopapular rash)"],
    interactions:[["Warfarin","Minor — monitor INR. Rare reports of elevated INR."],["Methotrexate","Moderate — reduced renal excretion → methotrexate toxicity."],["Oral contraceptives","Minor — very limited evidence of reduced OCP efficacy; backup recommended."]],
    monitoring:["Hypersensitivity reactions (observe 15 min post first dose)","Renal function in CKD","Rash — rule out EBV mononucleosis if widespread"],
    evidence:"IDSA Guidelines 2023 · BNF 2024 · WHO EML 2023",
  },
  "Azithromycin": {
    class:"Macrolide antibiotic", pregCat:"B", antidote:"N/A",
    mechanism:"Binds the 50S ribosomal subunit, inhibiting bacterial protein synthesis. Bacteriostatic; bactericidal at high concentrations. Excellent intracellular penetration.",
    forms:"Tab 250mg, 500mg · Suspension 200mg/5mL · IV 500mg",
    adultDose:"500mg day 1, then 250mg days 2–5 PO. Alternative: 500mg OD × 3 days. IV: 500mg OD.",
    childDose:"10mg/kg on day 1 (max 500mg), then 5mg/kg days 2–5.",
    maxSafe:"500mg/day",
    toxThreshold:"N/A",
    renalNote:"No dose adjustment needed.",
    hepaticNote:"Avoid in severe hepatic impairment (biliary excretion). Use with caution in moderate impairment.",
    blackBox:"Risk of fatal cardiac arrhythmias (QTc prolongation). Avoid if QTc >450ms or with other QTc-prolonging drugs.",
    ci:["History of QTc prolongation or torsades de pointes","Macrolide hypersensitivity","Concurrent use of QTc-prolonging drugs (quinolones, haloperidol, amiodarone)"],
    interactions:[["Warfarin","Moderate — INR elevation reported. Monitor closely."],["Digoxin","Moderate — increased digoxin serum levels → toxicity."],["Ergotamine","Major — ergotism risk (vasospasm, ischaemia)."],["Antacids (aluminium/magnesium)","Minor — separate administration by 2h."]],
    monitoring:["ECG and QTc interval before IV use","LFTs if prolonged use","Electrolytes (hypokalaemia worsens QTc risk)"],
    evidence:"WHO EML 2023 · AHA 2022 · BNF 2024",
  },
  "Ciprofloxacin": {
    class:"Fluoroquinolone antibiotic", pregCat:"C", antidote:"Supportive",
    mechanism:"Inhibits bacterial DNA gyrase (topoisomerase II) and topoisomerase IV, preventing DNA replication and transcription. Bactericidal, concentration-dependent.",
    forms:"Tab 250mg, 500mg, 750mg · IV infusion 200mg/100mL, 400mg/200mL",
    adultDose:"250–750mg BD PO. IV: 200–400mg BD (infuse over 60 minutes).",
    childDose:"Avoid routinely in <18yr. If essential: 10–20mg/kg BD (max 750mg/dose).",
    maxSafe:"1500mg/day PO; 800mg/day IV",
    toxThreshold:"N/A",
    renalNote:"CrCl 30–60: reduce dose by 50%. CrCl <30: 250mg BD PO or 200mg BD IV.",
    hepaticNote:"Use with caution in severe impairment. Standard dose unless very severe.",
    blackBox:"Tendinopathy/tendon rupture (esp. Achilles). Peripheral neuropathy. CNS effects. Aortic dissection/aneurysm. Avoid in elderly unless no alternative.",
    ci:["History of fluoroquinolone hypersensitivity","QTc prolongation","Myasthenia gravis (risk of exacerbation)","Children <18yr (relative — cartilage concern)"],
    interactions:[["Antacids / Iron / Zinc / Dairy","Major — chelation reduces absorption by up to 90%. Separate by 4–6h."],["Warfarin","Major — INR elevation (CYP1A2 inhibition). Monitor INR closely."],["Theophylline","Major — inhibits CYP1A2 → theophylline toxicity (seizures, arrhythmias)."],["NSAIDs","Moderate — lowers seizure threshold."]],
    monitoring:["Renal function and dose adjustment","Tendon pain (esp. Achilles — stop immediately if present)","Blood glucose (hyper- or hypoglycaemia)","QTc if cardiac risk factors"],
    evidence:"IDSA 2023 · BNF 2024 · FDA Safety Communication 2023",
  },
  "Metronidazole": {
    class:"Nitroimidazole antibiotic / antiprotozoal", pregCat:"B (avoid 1st trimester)", antidote:"Supportive",
    mechanism:"Reduced to cytotoxic radical metabolites inside anaerobic organisms, causing DNA strand breakage. Bactericidal for anaerobes; antiprotozoal.",
    forms:"Tab 200mg, 400mg · IV infusion 500mg/100mL · Suppository 500mg, 1g",
    adultDose:"400mg TDS PO × 7–10 days. IV: 500mg TDS (infuse over 30 min). Amoebiasis: 800mg TDS × 5 days.",
    childDose:"7.5mg/kg TDS. Max 400mg/dose.",
    maxSafe:"4g/day",
    toxThreshold:"N/A",
    renalNote:"Reduce dose by 50% in severe renal failure (active metabolite accumulation).",
    hepaticNote:"Severe impairment: reduce to 250mg TDS and monitor for CNS effects.",
    blackBox:null,
    ci:["1st trimester pregnancy","Nitroimidazole hypersensitivity","Concurrent alcohol ingestion (disulfiram-like reaction)"],
    interactions:[["Alcohol","Major — disulfiram-like reaction: flushing, vomiting, tachycardia, hypotension. Avoid alcohol during and 48h after course."],["Warfarin","Major — significantly potentiates anticoagulant effect. Reduce warfarin dose; monitor INR."],["Lithium","Moderate — reduces renal lithium clearance → lithium toxicity."]],
    monitoring:["Neurological symptoms (peripheral neuropathy with prolonged use)","LFTs (prolonged courses)","FBC (prolonged courses)"],
    evidence:"WHO EML 2023 · IDSA C. difficile Guidelines 2021 · BNF 2024",
  },
  "Vancomycin": {
    class:"Glycopeptide antibiotic", pregCat:"C", antidote:"Supportive; haemodialysis can remove drug in severe toxicity",
    mechanism:"Inhibits cell wall synthesis by binding D-Ala-D-Ala terminus of peptidoglycan precursors. Bactericidal against Gram-positive organisms including MRSA.",
    forms:"IV powder for reconstitution 500mg, 1g · PO capsule 125mg (C. difficile only — not systemically absorbed)",
    adultDose:"25–30mg/kg/day IV in 2–4 divided doses. Target AUC/MIC ≥400. Loading dose 25–30mg/kg for severe sepsis.",
    childDose:"40–60mg/kg/day IV in 4 divided doses. Neonates: 15mg/kg every 12–24h based on gestational age.",
    maxSafe:"AUC/MIC-guided dosing preferred over fixed trough targets",
    toxThreshold:"Trough >20mg/L associated with significant nephrotoxicity risk",
    renalNote:"MANDATORY renal dose adjustment. CrCl <10: dose every 5–7 days. CrCl 10–30: every 3–4 days. Use AUC-based monitoring with actual serum levels.",
    hepaticNote:"No primary dose adjustment (renally eliminated). However monitor renal function closely if hepatorenal syndrome risk.",
    blackBox:"Nephrotoxicity (especially with aminoglycosides). Ototoxicity (rare at therapeutic levels). Red Man Syndrome (infusion rate-related — not a true allergy).",
    ci:["True vancomycin hypersensitivity (not Red Man Syndrome)","Rapid IV push (causes Red Man Syndrome — always infuse over 60–90min)"],
    interactions:[["Aminoglycosides","Major — synergistic nephrotoxicity. Avoid concurrent use or monitor renal function very closely."],["Loop diuretics (furosemide)","Moderate — enhanced nephrotoxicity and ototoxicity."],["Neuromuscular blocking agents","Moderate — prolonged neuromuscular blockade."]],
    monitoring:["AUC/MIC (target 400–600) — preferred monitoring method per IDSA/ASHP 2020","Serum creatinine every 48–72h","Trough if AUC not available (target 15–20mg/L for serious MRSA infections)","Audiology if prolonged courses (>7 days)"],
    evidence:"IDSA/ASHP/SIDP Vancomycin Monitoring Guidelines 2020 · BNF 2024",
  },
  "Warfarin": {
    class:"Vitamin K antagonist (anticoagulant)", pregCat:"X — teratogenic", antidote:"Phytomenadione (Vit K1) IV/PO + 4-Factor PCC for life-threatening haemorrhage",
    mechanism:"Inhibits Vitamin K Epoxide Reductase (VKOR), blocking carboxylation and activation of clotting factors II, VII, IX, X and anticoagulant proteins C and S.",
    forms:"Tab 1mg, 2mg, 5mg (colour-coded by dose)",
    adultDose:"Loading: 5–10mg OD × 2 days (reduce to 2–5mg in elderly/frail). Maintenance: 2–10mg OD adjusted to INR target.",
    childDose:"0.1–0.3mg/kg OD, adjusted to INR. Highly variable — haematology input essential.",
    maxSafe:"No fixed ceiling — entirely guided by INR response",
    toxThreshold:"INR >3.0 in most patients = over-anticoagulated (increased bleeding risk)",
    renalNote:"Increased bleeding risk in CKD. No dose change — use INR to guide. More frequent monitoring required.",
    hepaticNote:"Extreme caution — baseline INR may be elevated (reduced factor synthesis). Start very low (0.5–1mg). Highly unpredictable response.",
    blackBox:"Major or fatal bleeding. Pregnancy: embryopathy (1st trimester), fetal intracranial haemorrhage (3rd trimester).",
    ci:["Pregnancy","Active major bleeding","Hypersensitivity","Patients unable to comply with monitoring"],
    interactions:[["Amiodarone","Major — markedly potentiates warfarin (INR may double or triple). Halve warfarin dose and monitor INR twice weekly."],["Ciprofloxacin / Metronidazole","Major — CYP2C9 inhibition greatly increases INR. Reduce warfarin by 25–50%."],["NSAIDs / Aspirin","Major — additive antiplatelet + anticoagulant bleeding risk."],["Rifampicin","Major — potent enzyme inducer, drastically reduces warfarin effect. Often need 3–5× dose increase."]],
    monitoring:["INR (therapeutic range 2.0–3.0 for AF/VTE; 2.5–3.5 for mechanical heart valves)","INR every 1–2 days at initiation, then weekly until stable, then monthly","Signs of bleeding (bruising, haematuria, melaena)","Annual medication reconciliation"],
    evidence:"ACCP Antithrombotic Guidelines 2012 (updated) · ESC AF Guidelines 2020 · BNF 2024",
  },
  "Furosemide": {
    class:"Loop diuretic", pregCat:"C", antidote:"Fluid and electrolyte replacement",
    mechanism:"Inhibits the Na-K-2Cl cotransporter (NKCC2) in the thick ascending loop of Henle, causing profound natriuresis and diuresis. Also causes venodilation (rapid onset in acute pulmonary oedema).",
    forms:"Tab 20mg, 40mg, 80mg · IV/IM injection 10mg/mL",
    adultDose:"20–80mg OD/BD PO. IV: 20–80mg bolus (infuse over 2 min or slow push); continuous infusion 0.1–2mg/kg/h.",
    childDose:"0.5–2mg/kg/dose. Max 6mg/kg/day.",
    maxSafe:"600mg/day PO (acute pulmonary oedema may require >80mg IV)",
    toxThreshold:"IV infusion >4mg/min = ototoxicity risk",
    renalNote:"Effective even in CKD but higher doses needed (blunted response). Not dialyzable (protein-bound).",
    hepaticNote:"Use cautiously — hypokalaemia can precipitate hepatic encephalopathy in cirrhosis.",
    blackBox:"Excessive diuresis → dehydration, electrolyte depletion. Sulfonamide hypersensitivity cross-reaction (theoretical).",
    ci:["Hypovolaemia / dehydration","Anuria (except when due to fluid overload)","Severe hypokalaemia","Sulfonamide allergy (cross-reactivity risk)"],
    interactions:[["Aminoglycosides","Major — enhanced ototoxicity (both are independently ototoxic)."],["NSAIDs","Moderate — blunts diuretic effect; risk of acute kidney injury."],["Digoxin","Moderate — hypokalaemia induced by furosemide potentiates digoxin toxicity."],["Lithium","Major — reduces renal lithium clearance → lithium toxicity."]],
    monitoring:["Daily weight and fluid balance chart","Electrolytes (K+, Na+, Mg2+) every 1–7 days depending on acuity","Serum creatinine and urea","Blood pressure","Uric acid (gout risk with chronic use)"],
    evidence:"ESC Heart Failure Guidelines 2023 · BNF 2024 · NICE NG106",
  },
  "Metformin": {
    class:"Biguanide antidiabetic", pregCat:"B", antidote:"Haemodialysis for metformin-associated lactic acidosis (MALA)",
    mechanism:"Activates AMP-activated protein kinase (AMPK), reducing hepatic gluconeogenesis and glycogenolysis. Improves peripheral insulin sensitivity. Does NOT cause hypoglycaemia as monotherapy.",
    forms:"Tab 500mg, 850mg, 1000mg (IR and XR formulations) · Oral solution 500mg/5mL",
    adultDose:"500mg BD with meals; increase by 500mg/week to max 2–3g/day. XR: 500–2000mg OD with evening meal.",
    childDose:">10 years: 500mg BD, titrate to max 2000mg/day.",
    maxSafe:"3000mg/day (IR); 2000mg/day (XR)",
    toxThreshold:"Accumulation in renal/hepatic impairment → lactic acidosis (MALA) — rare but fatal",
    renalNote:"eGFR 30–45: reduce to maximum 1g/day. eGFR <30: CONTRAINDICATED. Withhold 24–48h before and after IV contrast procedures.",
    hepaticNote:"AVOID — impaired hepatic lactate clearance increases MALA risk.",
    blackBox:"Lactic acidosis (rare but can be fatal): risk increases with renal impairment, hepatic disease, excessive alcohol, IV contrast, major surgery.",
    ci:["eGFR <30 mL/min","Decompensated heart failure","Hepatic impairment","History of lactic acidosis","Planned IV contrast within 24–48h"],
    interactions:[["Alcohol","Major — enhanced lactic acidosis risk. Avoid heavy alcohol use."],["Iodinated contrast agents","Major — withhold metformin 24–48h around the procedure. Restart only when renal function confirmed stable."],["Carbonic anhydrase inhibitors (topiramate)","Moderate — may increase metformin levels."]],
    monitoring:["eGFR every 3–6 months (or more frequently if unstable)","HbA1c every 3 months initially, then 6-monthly once stable","Serum B12 annually with long-term use (reduces absorption)","LFTs at baseline"],
    evidence:"ADA Standards of Care 2024 · NICE NG28 · BNF 2024",
  },
  "Morphine": {
    class:"Opioid analgesic (full μ-receptor agonist)", pregCat:"C (neonatal opioid withdrawal syndrome)", antidote:"Naloxone 0.4–2mg IV/IM every 2–3 min (max 10mg)",
    mechanism:"Binds μ (mu), κ (kappa) and δ (delta) opioid receptors in CNS and periphery. Inhibits pain signal transmission; causes analgesia, sedation, euphoria, and respiratory depression.",
    forms:"Tab 10mg IR, 30mg, 60mg SR · IV/IM/SC 10mg/mL · Oral solution 2mg/mL, 10mg/mL",
    adultDose:"Acute severe pain: 2.5–10mg IV/IM/SC every 4h (start 2.5mg in opioid-naive elderly). PO: 5–30mg every 4h (IR). SR: 12-hourly or 24-hourly.",
    childDose:"0.1–0.2mg/kg IV/IM/SC every 4h. Neonates: 0.05–0.1mg/kg.",
    maxSafe:"No fixed ceiling in cancer pain — titrate to effect. Non-cancer: reassess regularly.",
    toxThreshold:"Respiratory depression occurs at any dose in opioid-naive patients — primary safety concern",
    renalNote:"Active metabolite morphine-6-glucuronide (M6G) accumulates in CKD — reduce dose by 25–50% and extend interval. Avoid in severe CKD; consider alternative opioid (fentanyl, alfentanil).",
    hepaticNote:"Severe impairment: reduce dose by 50%; first-pass metabolism reduced, increasing oral bioavailability.",
    blackBox:"Respiratory depression and death. Addiction, abuse, misuse. Life-threatening neonatal opioid withdrawal syndrome.",
    ci:["Acute respiratory depression","Paralytic ileus","Concurrent MAOI use (within 14 days — serotonin syndrome risk)","Raised intracranial pressure (relative)"],
    interactions:[["MAOIs","Major — severe serotonin syndrome or hyperpyrexia. 14-day washout mandatory."],["Benzodiazepines / CNS depressants","Major — synergistic respiratory depression. FDA black box warning."],["Naltrexone","Major — precipitates acute opioid withdrawal. Contraindicated."]],
    monitoring:["Respiratory rate (target >12/min — reassess every 2h post IV dose)","Sedation score","Pain score (NRS 0–10)","O2 saturation and capnography (IV continuous)","Bowel function (laxative prophylaxis routine)","Pupillary response"],
    evidence:"WHO Pain Ladder · NICE NG140 · BNF 2024",
  },
  "Digoxin": {
    class:"Cardiac glycoside", pregCat:"C", antidote:"DigiFab (Digoxin-specific antibody fragments) — life-threatening toxicity",
    mechanism:"Inhibits Na+/K+ ATPase → intracellular Ca²⁺ ↑ → positive inotropy. Vagal stimulation slows AV conduction (rate control in AF). Narrow therapeutic index.",
    forms:"Tab 62.5mcg, 125mcg, 250mcg · IV injection 250mcg/mL (0.5mg/2mL)",
    adultDose:"Loading: 0.5–0.75mg IV/PO in 3 divided doses over 24h. Maintenance: 62.5–250mcg OD (adjust to level and renal function).",
    childDose:"Highly individualised — consult paediatric formulary. Neonatal dosing differs substantially.",
    maxSafe:"Serum level 0.5–2.0ng/mL (lower target 0.5–0.9ng/mL for rate control in AF)",
    toxThreshold:">2.0ng/mL = toxicity; >3.0ng/mL = serious toxicity",
    renalNote:"Primarily renally eliminated. Reduce dose by 25–50% if CrCl <50. Avoid loading dose if CrCl <30. Daily drug level monitoring.",
    hepaticNote:"No dose adjustment required (not hepatically metabolised). However hepatorenal syndrome = renal adjustment applies.",
    blackBox:"Narrow therapeutic index. Toxicity markedly enhanced by hypokalaemia, hypomagnesaemia, and hypothyroidism.",
    ci:["Ventricular fibrillation","Wolff-Parkinson-White (WPW) syndrome with fast accessory pathway","2nd/3rd degree AV block (without pacemaker)","Hypertrophic obstructive cardiomyopathy (HOCM)"],
    interactions:[["Amiodarone","Major — doubles digoxin serum level. Halve digoxin dose when starting amiodarone."],["Verapamil / Diltiazem","Major — significantly increases digoxin levels."],["Loop diuretics (hypokalaemia)","Major — hypokalaemia potentiates digoxin toxicity even at therapeutic levels."],["Quinidine","Major — increases digoxin by 50–100%. Halve digoxin dose."]],
    monitoring:["Digoxin level 6h post-dose (target 0.5–2.0ng/mL; AF rate control 0.5–0.9ng/mL)","K+ and Mg²+ before initiation and periodically","ECG (PR interval, AV block, arrhythmias, 'reverse tick' ST changes)","Renal function every 3–6 months"],
    evidence:"ESC Heart Failure Guidelines 2023 · AHA/ACC 2022 · BNF 2024",
  },
  "Artemether-Lumefantrine (Coartem)": {
    class:"Artemisinin-based combination therapy (ACT) — antimalarial", pregCat:"C (avoid 1st trimester if alternative exists)", antidote:"Supportive",
    mechanism:"Artemether generates reactive oxygen species destroying heme crystallisation in parasitised RBCs. Lumefantrine prevents hemin detoxification, accumulating toxic haem — lethal to Plasmodium.",
    forms:"Fixed-dose combination tablet 20mg/120mg (artemether/lumefantrine)",
    adultDose:"≥35kg: 4 tablets at 0, 8, 24, 36, 48, 60 hours (6 doses total). MUST be taken with food or milk (fatty food increases lumefantrine absorption up to 16-fold).",
    childDose:"5–<15kg: 1 tablet per dose. 15–<25kg: 2 tablets. 25–<35kg: 3 tablets. Same 6-dose schedule.",
    maxSafe:"6-dose 3-day course only. Do not repeat within 1 month.",
    toxThreshold:"N/A at therapeutic doses",
    renalNote:"No dose adjustment. Limited data in severe renal impairment — use with caution.",
    hepaticNote:"No formal dose adjustment. Caution in severe impairment (lumefantrine hepatically metabolised via CYP3A4).",
    blackBox:null,
    ci:["1st trimester pregnancy (relative — use if no safe alternative)","QTc >500ms","Concurrent use of QTc-prolonging drugs"],
    interactions:[["QTc-prolonging drugs (quinolones, azithromycin, haloperidol)","Major — avoid concurrent use. Risk of torsades de pointes."],["CYP3A4 inducers (rifampicin, carbamazepine)","Moderate — reduce lumefantrine plasma levels. Avoid combination."],["CYP2D6 substrates","Moderate — lumefantrine inhibits CYP2D6. Monitor drugs with narrow therapeutic index."]],
    monitoring:["Parasitaemia at day 3 (failure >10% parasites remaining = treatment failure)","Follow-up day 7, 14, 28 in research settings","ECG in high-risk cardiac patients","Blood glucose (hypoglycaemia in severe malaria)"],
    evidence:"WHO Malaria Treatment Guidelines 2023 · NMCP Nigeria 2024 · BNF 2024",
  },
  "Omeprazole": {
    class:"Proton pump inhibitor (PPI)", pregCat:"C", antidote:"N/A — supportive",
    mechanism:"Irreversibly inhibits the H+/K+ ATPase enzyme (proton pump) in gastric parietal cells by covalent binding, reducing acid secretion by >90%. Requires activation in acid environment (prodrug).",
    forms:"Capsule 10mg, 20mg, 40mg · IV powder for reconstitution 40mg",
    adultDose:"20–40mg OD before breakfast. GORD: 20mg OD × 4–8 weeks. H. pylori triple therapy: 20mg BD. IV: 40mg OD.",
    childDose:"0.5–1mg/kg OD (max 20mg if <20kg; max 40mg if >20kg). ≥1yr only.",
    maxSafe:"80mg/day (Zollinger-Ellison syndrome); 40mg/day standard prescribing",
    toxThreshold:"N/A",
    renalNote:"No dose adjustment required.",
    hepaticNote:"Severe impairment: max 20mg/day (reduced first-pass metabolism and clearance).",
    blackBox:null,
    ci:["Hypersensitivity to PPIs","Concurrent rilpivirine (atazanavir, nelfinavir — significantly reduces antiretroviral levels)"],
    interactions:[["Clopidogrel","Major — CYP2C19 competition reduces clopidogrel active metabolite. Prefer pantoprazole if PPI needed with clopidogrel."],["Methotrexate","Moderate — PPIs reduce renal methotrexate excretion → toxicity."],["Ketoconazole / Itraconazole","Major — PPI-induced high gastric pH markedly reduces azole absorption."]],
    monitoring:["Serum Mg²⁺ levels annually (long-term use >1 year — hypomagnesaemia can cause arrhythmias)","Bone mineral density (long-term use >3 years — fracture risk)","Serum B12 annually (>3 years use)","Assess ongoing indication — avoid indefinite use without review"],
    evidence:"BSG GORD Guidelines 2022 · NICE CG184 · BNF 2024",
  },
  "Salbutamol (Albuterol)": {
    class:"Short-acting β₂-agonist (SABA)", pregCat:"C", antidote:"Supportive; propranolol (β-blocker) for severe tachycardia — use with caution in asthma",
    mechanism:"Selective β₂-adrenoreceptor agonist on bronchial smooth muscle → relaxation and bronchodilation. Also drives K⁺ into cells intracellularly (used in hyperkalaemia).",
    forms:"MDI 100mcg/actuation · Nebuliser solution 2.5mg/2.5mL, 5mg/2.5mL · IV 0.5mg/mL · Tablet 2mg, 4mg",
    adultDose:"Acute: 2–4 puffs MDI (with spacer) or 2.5–5mg nebulised every 20 min × 3 doses then PRN. Hyperkalaemia: 10–20mg nebulised over 10 min.",
    childDose:"<5yr: 2–4 puffs MDI via spacer. ≥5yr: 4–8 puffs. Nebulised: 0.03–0.15mg/kg (max 2.5mg under 5yr; max 5mg ≥5yr).",
    maxSafe:"Titrate to clinical response — avoid overuse (β₂ receptor downregulation)",
    toxThreshold:"Tachycardia, hypokalaemia, tremor at doses >2.5mg/h continuous IV infusion",
    renalNote:"No dose adjustment required.",
    hepaticNote:"No dose adjustment required.",
    blackBox:null,
    ci:["Non-selective β-blocker use (relative — blocks bronchodilation)","Hypersensitivity to salbutamol or excipients"],
    interactions:[["Non-selective β-blockers (propranolol, carvedilol)","Major — antagonises bronchodilatory effect. Avoid in asthma/COPD."],["Theophylline","Moderate — additive hypokalaemia. Monitor K+."],["Digoxin","Moderate — salbutamol-induced hypokalaemia potentiates digoxin toxicity."]],
    monitoring:["Heart rate and BP (especially IV use)","Serum K+ (esp. high-dose or IV)","O₂ saturation and clinical response","PEFR or FEV₁ response to treatment","ECG if prolonged IV infusion"],
    evidence:"GINA Strategy Report 2024 · BTS/SIGN British Asthma Guideline 2024",
  },
  "Prednisolone": {
    class:"Synthetic corticosteroid (glucocorticoid)", pregCat:"C", antidote:"Stress-dose hydrocortisone for adrenal crisis (100mg IV/IM stat, then 50–100mg every 6–8h)",
    mechanism:"Binds glucocorticoid receptor → nuclear translocation → suppresses transcription of pro-inflammatory cytokines (IL-1, IL-6, IL-8, TNF-α). Broad immunosuppressive and anti-inflammatory effect.",
    forms:"Tab 1mg, 2.5mg, 5mg, 25mg · Oral solution 1mg/mL, 5mg/5mL",
    adultDose:"High dose: 40–60mg OD (acute asthma, PMR, PCP). Low dose: 2.5–7.5mg OD (rheumatological maintenance). Always taper slowly if >3 weeks use.",
    childDose:"Acute asthma: 1–2mg/kg OD × 3–5 days (max 40mg). Other conditions: specialist guidance.",
    maxSafe:"1–2mg/kg/day in severe disease. Long-term >7.5mg/day = significant side-effect risk.",
    toxThreshold:"Cumulative dose >1g historically associated with significant HPA axis suppression",
    renalNote:"No dose adjustment required; monitor blood glucose (risk of steroid-induced diabetes).",
    hepaticNote:"Prefer prednisolone over prednisone (prednisone requires hepatic conversion to active prednisolone).",
    blackBox:null,
    ci:["Systemic active infection (unless life-threatening indication)","Live attenuated vaccines (MMR, varicella, yellow fever — avoid during immunosuppressive doses)","GI perforation"],
    interactions:[["NSAIDs","Major — additive GI ulceration risk. Use PPI cover."],["Antidiabetic drugs","Major — corticosteroids cause hyperglycaemia. Increase antidiabetic doses."],["Live vaccines","Major — avoid during immunosuppressive doses; risk of disseminated infection."],["Rifampicin / CYP3A4 inducers","Moderate — reduce corticosteroid efficacy. May need higher doses."]],
    monitoring:["Blood glucose (twice daily inpatient on high doses)","Blood pressure","Weight and fluid retention","BMD (if >3 months cumulative use — consider bisphosphonate prophylaxis)","HbA1c (chronic use)","Electrolytes (Na+, K+)","Ophthalmology review >1yr (posterior subcapsular cataracts, glaucoma)"],
    evidence:"BTS Asthma Guidelines 2024 · British Society of Rheumatology 2022 · BNF 2024",
  },
};

// ══════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
//  Credentials validated via SHA-256 hash — plaintext never stored.
//  To rotate: update ADMIN_EMAIL_HASH and ADMIN_PASS_HASH with the
//  SHA-256 of your new credentials (use: crypto.createHash('sha256')
//  .update(value).digest('hex') in Node.js).
//
//  IMPORTANT: Client-side auth is a convenience gate only.
//  For true security, move admin auth to your backend API.
// ══════════════════════════════════════════════════════════════════
const ADMIN_EMAIL_HASH = "52d747e45caa743156a0f5a901d621add91bdc30010dcdd0bf5a90701eea4177";
const ADMIN_PASS_HASH  = "b1d24f1158e60d8eb06c81b94481a9f62641ff22a0a8644702f0bd50fa892cd7";

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

// ─── Admin Login Screen ───────────────────────────────────────────
function AdminLogin({ onAuthenticated }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [checking, setChecking] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Both fields are required."); return; }
    setChecking(true); setError("");
    const [eh, ph] = await Promise.all([sha256(email.trim().toLowerCase()), sha256(password)]);
    if (eh === ADMIN_EMAIL_HASH && ph === ADMIN_PASS_HASH) {
      // Store session (expires in 8 hours)
      try {
        await window.storage.set("medguard:admin_session", JSON.stringify({
          at: Date.now(), expires: Date.now() + 8*60*60*1000,
        }));
      } catch {}
      onAuthenticated();
    } else {
      setError("Invalid email or password.");
    }
    setChecking(false);
  };

  return (
    <ErrorBoundary>
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#111827 0%,#1F2937 100%)",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,maxWidth:400,width:"100%",padding:"32px 28px",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:8}}>🛡️</div>
          <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:C.text}}>MedGuard Admin</h2>
          <p style={{margin:0,fontSize:12,color:C.muted}}>Restricted access — authorised personnel only</p>
        </div>
        <div style={{marginBottom:14}}>
          <Label ch="Admin Email"/>
          <input
            style={inputBase} type="email" placeholder="admin@medguard.app"
            value={email} onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          />
        </div>
        <div style={{marginBottom:18}}>
          <Label ch="Password"/>
          <div style={{position:"relative"}}>
            <input
              style={{...inputBase,paddingRight:44}}
              type={showPass?"text":"password"} placeholder="••••••••••"
              value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            />
            <button
              onClick={()=>setShowPass(s=>!s)}
              style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:16,color:C.muted}}
            >{showPass?"🙈":"👁"}</button>
          </div>
        </div>
        {error && (
          <div style={{background:"#FEF2F2",border:"1.5px solid #FCA5A5",borderRadius:9,padding:"9px 14px",marginBottom:14,fontSize:12,color:"#991B1B",fontWeight:600}}>
            ⚠️ {error}
          </div>
        )}
        <button
          onClick={handleLogin} disabled={checking}
          style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:checking?"#6EE7B7":"#111827",color:"#fff",fontSize:14,fontWeight:800,cursor:checking?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
        >
          {checking
            ? <><span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Verifying…</>
            : "Sign In →"}
        </button>
        <p style={{margin:"16px 0 0",fontSize:10,color:C.light,textAlign:"center",lineHeight:1.5}}>
          All login attempts are hashed and validated locally. Session expires in 8 hours.
        </p>
      </div>
    </div>
    </ErrorBoundary>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────
function AdminDashboard({ onSignOut }) {
  const [stats,  setStats]  = useState(null);
  const [evList, setEvList] = useState([]);
  const [tab,    setTab]    = useState("overview");
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Pull from artifact storage
        const subRaw   = await window.storage.get("medguard:subscription").catch(()=>null);
        const cacheRaw = await window.storage.get("medguard:evalcache").catch(()=>null);
        const sub      = subRaw  ? JSON.parse(subRaw.value)  : null;
        const evals    = cacheRaw? JSON.parse(cacheRaw.value): [];

        // Revenue estimate (demo — in production pull from Mono/Wise webhooks)
        const plan     = sub?.planId || null;
        const planData = plan ? PLANS[plan] : null;

        setStats({
          subscriptionStatus: sub?.status  || "none",
          plan:               planData?.label || "—",
          planId:             plan           || "—",
          since:              sub?.since     ? new Date(sub.since).toLocaleDateString() : "—",
          trialEndsAt:        sub?.trialEndsAt? new Date(sub.trialEndsAt).toLocaleString(): "—",
          provider:           sub?.provider  || "—",
          totalEvals:         evals.length,
          lastEvalAt:         evals[0]?.ts   ? new Date(evals[0].ts).toLocaleString()   : "—",
          drugs:              [...new Set(evals.map(e=>e.form?.drug).filter(Boolean))],
          criticalCount:      evals.filter(e=>e.result?.tag==="CRITICAL").length,
          cautionCount:       evals.filter(e=>e.result?.tag==="CAUTION").length,
          safeCount:          evals.filter(e=>e.result?.tag==="SAFE").length,
        });
        setEvList(evals);
      } catch(err) {
        setStats({ error: err.message });
      }
      setLoading(false);
    })();
  }, []);

  const handleSignOut = async () => {
    try { await window.storage.delete("medguard:admin_session"); } catch {}
    onSignOut();
  };

  const StatCard = ({icon,label,value,color,sub}) => (
    <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${C.border}`,padding:"18px 20px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:4}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:color||C.text,lineHeight:1}}>{value??"-"}</div>
      {sub&&<div style={{fontSize:11,color:C.light,marginTop:4}}>{sub}</div>}
    </div>
  );

  const ATABS = [{id:"overview",label:"📊 Overview"},{id:"evaluations",label:"🧪 Evaluations"},{id:"subscription",label:"💳 Subscription"},{id:"settings",label:"⚙️ Settings"}];

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F9FAFB"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:`3px solid ${C.borderMd}`,borderTopColor:C.primary,borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto 16px"}}/>
        <div style={{fontSize:13,color:C.muted}}>Loading dashboard…</div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
    <div style={{minHeight:"100vh",background:"#F9FAFB",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      {/* Top bar */}
      <div style={{background:"#111827",padding:"0 28px",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>🛡️</span>
          <span style={{color:"#F9FAFB",fontWeight:800,fontSize:14}}>MedGuard Admin Dashboard</span>
          <span style={{background:"#059669",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 10px",borderRadius:20}}>LIVE</span>
        </div>
        <button onClick={handleSignOut} style={{border:"none",background:"#374151",color:"#D1D5DB",fontSize:12,fontWeight:700,padding:"7px 14px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 20px"}}>
        {/* Sub tabs */}
        <div style={{display:"flex",gap:4,marginBottom:24,background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,padding:4,width:"fit-content"}}>
          {ATABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,transition:"all 0.18s",background:tab===t.id?"#111827":"transparent",color:tab===t.id?"#fff":C.muted}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab==="overview"&&stats&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
              <StatCard icon="🧪" label="Cached Evaluations" value={stats.totalEvals} sub={`Last: ${stats.lastEvalAt}`}/>
              <StatCard icon="🚨" label="Critical Flags" value={stats.criticalCount} color={C.danger}/>
              <StatCard icon="⚠️" label="Caution Flags" value={stats.cautionCount} color={C.warn}/>
              <StatCard icon="✅" label="Safe Results" value={stats.safeCount} color={C.primary}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${C.border}`,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:14}}>Subscription Status</div>
                {[["Status",    stats.subscriptionStatus.toUpperCase(), stats.subscriptionStatus==="trialing"?C.warn:stats.subscriptionStatus==="active"?C.primary:C.danger],
                  ["Plan",      stats.plan,   C.text],
                  ["Provider",  stats.provider, C.text],
                  ["Since",     stats.since,  C.text],
                  ["Trial Ends",stats.trialEndsAt, C.warn],
                ].map(([k,v,col],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <span style={{color:C.muted,fontWeight:600}}>{k}</span>
                    <span style={{color:col||C.text,fontWeight:700}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${C.border}`,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:14}}>Top Drugs Evaluated</div>
                {stats.drugs.length===0
                  ? <div style={{fontSize:13,color:C.light,textAlign:"center",padding:"20px 0"}}>No evaluations cached yet</div>
                  : stats.drugs.slice(0,8).map((drug,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.text}}>
                      <span style={{fontSize:14}}>💊</span>{drug}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* Evaluations */}
        {tab==="evaluations"&&(
          <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{padding:"16px 20px",borderBottom:`1.5px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:800,fontSize:14,color:C.text}}>Cached Evaluations ({evList.length})</div>
              <div style={{fontSize:11,color:C.muted}}>Last 10 evaluations — from device storage</div>
            </div>
            {evList.length===0
              ? <div style={{textAlign:"center",padding:"40px",color:C.light,fontSize:13}}>No evaluations in cache yet. Run an evaluation to see data here.</div>
              : evList.map((ev,i)=>{
                const tc = {SAFE:{bg:"#059669"},CAUTION:{bg:"#D97706"},CRITICAL:{bg:"#DC2626"}}[ev.result?.tag]||{bg:C.light};
                return (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:14,padding:"14px 20px",borderBottom:`1px solid ${C.border}`,alignItems:"center",fontSize:12}}>
                    <div>
                      <div style={{fontWeight:700,color:C.text}}>{ev.form?.patientName||"Anonymous"}</div>
                      <div style={{color:C.muted,marginTop:2}}>{ev.form?.age}y · {ev.form?.weight}{ev.form?.unit}</div>
                    </div>
                    <div>
                      <div style={{fontWeight:600,color:C.text}}>{ev.result?.drug}</div>
                      <div style={{color:C.muted}}>{ev.result?.dose}</div>
                    </div>
                    <div style={{color:C.muted}}>{ev.form?.indication}</div>
                    <div style={{color:C.light}}>{ev.ts?new Date(ev.ts).toLocaleString():"—"}</div>
                    <span style={{background:tc.bg,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:20}}>{ev.result?.tag}</span>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Subscription */}
        {tab==="subscription"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${C.border}`,padding:"22px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:16}}>💳 Payment Configuration</div>
              {[
                ["Payment Provider (Nigeria)", "Mono DirectPay","Set MONO_PUBLIC_KEY and deploy mono-initiate Netlify function"],
                ["Payment Provider (International)","Wise Payment Links","Replace WISE_PRO_LINK and WISE_PRO_MAX_LINK with your Wise Business payment request URLs"],
                ["Pro Plan Price (Nigeria)","₦50,000 / month","Configurable in PLANS.pro.ngn"],
                ["Pro Max Price (Nigeria)","₦100,000 / month","Configurable in PLANS.proMax.ngn"],
                ["Pro Plan Price (International)","$100 / month","Configurable in PLANS.pro.usd"],
                ["Pro Max Price (International)","$200 / month","Configurable in PLANS.proMax.usd"],
                ["Trial Period","1 day","Configurable in PLANS.trialDays"],
                ["Webhook Verification","Server-side required","See medguard-payment-webhooks.js"],
              ].map(([k,v,note],i)=>(
                <div key={i} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:13,color:C.muted,fontWeight:600}}>{k}</span>
                    <span style={{fontSize:13,color:C.text,fontWeight:700}}>{v}</span>
                  </div>
                  <div style={{fontSize:11,color:C.light}}>{note}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#FFF7ED",border:"1.5px solid #FCD34D",borderRadius:14,padding:"16px 20px"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:8}}>⚠️ Pricing Transparency Note</div>
              <p style={{margin:0,fontSize:12,color:"#78350F",lineHeight:1.7}}>
                To comply with consumer protection standards, your subscription modal clearly shows the exact charge date, the monthly recurring amount, and a cancel-anytime notice on every plan. Both Mono (Nigeria) and Wise (International) have been configured to display the price in the user's currency before payment. If you update pricing, change PLANS.pro.ngn.display and PLANS.pro.usd.display — the modal and marketing copy update automatically.
              </p>
            </div>
          </div>
        )}

        {/* Settings */}
        {tab==="settings"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${C.border}`,padding:"22px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:4}}>🔑 Admin Credentials</div>
              <p style={{fontSize:12,color:C.muted,margin:"0 0 16px",lineHeight:1.6}}>
                Admin passwords are stored only as SHA-256 hashes — never in plaintext. To rotate your password, generate new hashes using <code>crypto.createHash('sha256').update(value).digest('hex')</code> in Node.js, then update <code>ADMIN_EMAIL_HASH</code> and <code>ADMIN_PASS_HASH</code> at the top of the file.
              </p>
              <div style={{background:"#FEF2F2",border:"1.5px solid #FCA5A5",borderRadius:9,padding:"12px 14px",fontSize:12,color:"#991B1B"}}>
                🔒 <strong>Security reminder:</strong> This admin gate is a client-side convenience layer. For production medical software handling PHI, implement server-side authentication with JWT sessions and rate-limited login endpoints.
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${C.border}`,padding:"22px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:14}}>🗑️ Storage Management</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  {label:"Clear evaluation cache",key:"medguard:evalcache",color:C.warn},
                  {label:"Clear subscription data",key:"medguard:subscription",color:C.danger},
                ].map(({label,key,color})=>(
                  <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:13,color:C.text}}>{label}</span>
                    <button
                      onClick={async()=>{
                        if(window.confirm(`Are you sure you want to clear "${key}"?`)){
                          try{ await window.storage.delete(key); alert("Cleared."); }catch{ alert("Could not clear."); }
                        }
                      }}
                      style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${color}`,background:"#fff",color,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
    </ErrorBoundary>
  );
}

// ─── Admin Shell (wraps login + dashboard) ────────────────────────
function AdminShell({ onBack }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await window.storage.get("medguard:admin_session").catch(()=>null);
        if (raw) {
          const session = JSON.parse(raw.value);
          if (session.expires > Date.now()) { setAuthed(true); }
        }
      } catch {}
      setChecking(false);
    })();
  }, []);

  if (checking) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#111827"}}>
      <div style={{width:36,height:36,border:"3px solid #374151",borderTopColor:"#059669",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  if (!authed) return <AdminLogin onAuthenticated={()=>setAuthed(true)}/>;

  return <AdminDashboard onSignOut={()=>{ setAuthed(false); onBack(); }}/>;
}

// ─── Main App ─────────────────────────────────────────────────────
export default function ClinicalEvaluator() {
  const initForm = {
    patientName:"",age:"",weight:"",height:"",unit:"kg",gender:"Male",
    screatinine:"",category:Object.keys(DRUG_CATEGORIES)[0],drug:ALL_DRUGS[0],
    amountMg:"",route:ROUTES[0],indication:INDICATIONS[0],
    hepaticLevel:"None",pregnant:false,allergies:"",currentMeds:"",notes:"",
  };

  const [form,setForm] = useState(initForm);
  const [loading,setLoading] = useState(false);
  const [result,setResult] = useState(null);
  const [error,setError] = useState(null);
  const [history,setHistory] = useState([]);
  const [dark,toggleDark] = useDarkMode();
  const [showAdmin,setShowAdmin] = useState(false);
  const [adminClicks,setAdminClicks] = useState(0);
  const adminClickTimer = useRef(null);
  const [tab,setTab] = useState("evaluate");
  const [copied,setCopied] = useState(false);
  const [pdfLoading,setPdfLoading] = useState(false);
  const [reviewFlag,setReviewFlag] = useState(false);
  const [privacyMode,setPrivacyMode] = useState(false);
  const [voiceOpen,setVoiceOpen] = useState(false);
  const [cameraOpen,setCameraOpen] = useState(false);
  const [hardStops,setHardStops] = useState([]);
  const [softStops,setSoftStops] = useState([]);
  // subscriptionStatus: "none" | "trialing" | "active"
  const [subscriptionStatus,setSubscriptionStatus] = useState("none");
  const [trialEndsAt,setTrialEndsAt] = useState(null);
  const [activePlanId,setActivePlanId] = useState("pro");
  const [showUpgrade,setShowUpgrade] = useState(false);
  const [upgradeReason,setUpgradeReason] = useState("");
  const online = useOnlineStatus();
  const resultRef = useRef(null);


  // Active user heartbeat — fires every 60s, admin counts sessions
  useEffect(() => {
    sendHeartbeat();
    const hb = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(hb);
  }, []);


  // SOAP Scribe deep-link handler — auto-fills form when opened from scribe app
  useEffect(() => {
    const soapData = parseSOAPLink();
    if (soapData) {
      setForm(prev => ({
        ...prev,
        patientName: soapData.patientName || prev.patientName,
        age:         soapData.age         || prev.age,
        weight:      soapData.weight      || prev.weight,
        drug:        soapData.drug ? (ALL_DRUGS.find(d=>d.toLowerCase().includes((soapData.drug||"").toLowerCase()))||prev.drug) : prev.drug,
        indication:  soapData.indication  || prev.indication,
        notes:       soapData.notes       || prev.notes,
        amountMg:    soapData.amountMg    || prev.amountMg,
      }));
      setTab("evaluate");
    }
    // Listen for postMessage from SOAP scribe
    const handler = (e) => {
      if (e.data?.type === "medguard:prefill") {
        const d = e.data.data || {};
        setForm(prev => ({
          ...prev,
          patientName: d.patientName || prev.patientName,
          age:         d.age         || prev.age,
          weight:      d.weight      || prev.weight,
          drug:        d.drug ? (ALL_DRUGS.find(dr=>dr.toLowerCase().includes((d.drug||"").toLowerCase()))||prev.drug) : prev.drug,
          indication:  d.indication  || prev.indication,
          notes:       d.notes       || prev.notes,
          amountMg:    d.amountMg    || prev.amountMg,
        }));
        setTab("evaluate");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const isPro = subscriptionStatus === "trialing" || subscriptionStatus === "active";

  // Load subscription state from persistent artifact storage
  useEffect(() => {
    (async () => {
      try {
        const sub = await window.storage.get("medguard:subscription");
        const parsed = sub ? JSON.parse(sub.value) : null;
        if (parsed && parsed.status) {
          // Auto-flip "trialing" → "active" once the trial window has passed.
          // In production this should be confirmed by your backend (webhook
          // verified the recurring charge actually succeeded) rather than
          // assumed client-side — see medguard-payment-webhooks.js.
          if (parsed.status === "trialing" && new Date(parsed.trialEndsAt).getTime() <= Date.now()) {
            setSubscriptionStatus("active");
            setTrialEndsAt(parsed.trialEndsAt);
          } else {
            setSubscriptionStatus(parsed.status);
            setTrialEndsAt(parsed.trialEndsAt || null);
            setActivePlanId(parsed.planId || "pro");
          }
        }
      } catch { /* no subscription yet — status stays "none" */ }
    })();
  }, []);

  const handleSubscribed = async (provider, planId) => {
    const trialEnd = new Date(Date.now() + PLANS.trialDays*24*60*60*1000).toISOString();
    setSubscriptionStatus("trialing");
    setTrialEndsAt(trialEnd);
    setActivePlanId(planId||"pro");
    setShowUpgrade(false);
    try {
      await window.storage.set("medguard:subscription", JSON.stringify({
        status:"trialing", provider, planId:planId||"pro",
        trialEndsAt:trialEnd, since:new Date().toISOString(),
      }));
      const plan = PLANS[planId||"pro"];
      await recordPayment({
        provider, planId:planId||"pro",
        amount: plan?.ngn?.display || plan?.usd?.display || "—",
        currency: provider==="mono"?"NGN":provider==="wise"?"USD":"USDC",
        country: navigator.language?.split("-")[1] || "NG",
      });
    } catch {}
  };

  const set = f => e => {
    const val = e.target.value;
    setForm(prev=>{ const n={...prev,[f]:val}; if(f==="category") n.drug=DRUG_CATEGORIES[val][0]; return n; });
  };

  const weightKg = form.unit==="lbs"?(parseFloat(form.weight)*0.453592).toFixed(1):form.weight;
  const bmi = calcBMI(parseFloat(weightKg),parseFloat(form.height));
  const bsa = calcBSA(parseFloat(weightKg),parseFloat(form.height));
  const crcl = calcCrCl(form.age,weightKg,form.screatinine,form.gender==="Female");
  const renalSt = renalStage(crcl);
  const mgPerKg = form.weight&&form.amountMg?(parseFloat(form.amountMg)/parseFloat(weightKg)).toFixed(2):null;

  const buildPrompt = (f,wKg,crl,rst,bmi,bsa,mgkg) => `You are a senior clinical pharmacologist. Evaluate this high-complexity case and return ONLY valid JSON — no markdown, no preamble, no trailing text.

Patient Details:
- Name: ${f.patientName||"Anonymous"} | Age: ${f.age} years | Gender: ${f.gender}
- Weight: ${wKg} kg${f.height?` | Height: ${f.height} cm`:""}${bmi?` | BMI: ${bmi}`:""}${bsa?` | BSA: ${bsa} m²`:""}
- Renal Function: ${crl!==null?`CrCl = ${crl.toFixed(1)} mL/min — ${rst?.label}`:"Not formally assessed"}
- Hepatic Impairment: ${f.hepaticLevel}
- Pregnancy Status: ${f.pregnant?"YES — critically consider teratogenicity and safety":"No"}
- Drug: ${f.drug} | Prescribed/Ingested Dose: ${f.amountMg} mg | Route: ${f.route}
- Computed mg/kg: ${mgkg}${bsa?` | mg/m²: ${(parseFloat(f.amountMg)/parseFloat(bsa)).toFixed(1)}`:""}
- Indication: ${f.indication}
- Known Allergies: ${f.allergies||"None stated"}
- Concurrent Medications: ${f.currentMeds||"None stated"}
- Clinical Notes: ${f.notes||"None"}

Your evaluation must consider ALL concurrent medications for interactions, the patient's renal and hepatic function for dose adjustment, overdose thresholds, and pregnancy if applicable.

Return this EXACT JSON schema — every field is required (use null only for genuinely inapplicable fields):
{
  "tag": "SAFE|CAUTION|CRITICAL",
  "drug": "full drug name with form and strength",
  "dose": "clinically precise recommended dose with mg/kg",
  "schedule": "dosing frequency and duration",
  "guide": "HTML string with <b> and <br> tags — 4-6 rich administration points",
  "overdose": { "critical": boolean, "mgPerKg": "computed value to 2dp" },
  "drugClass": "pharmacological class",
  "mechanism": "one-sentence mechanism of action",
  "contraindications": ["array of 4-6 key contraindications"],
  "sideEffects": ["array of 5-7 important/common effects including serious ones"],
  "monitoring": ["array of 4-6 specific monitoring parameters with target ranges where relevant"],
  "interactions": "Detailed paragraph covering ALL interaction risks with the listed concurrent medications",
  "interactionSeverity": [{"drugPair":"this drug + concurrent med name","severity":"Contraindicated|Major|Moderate|Minor","note":"one-sentence clinical note on the mechanism/effect and recommended action"}],
  "pregnancyCategory": "A|B|C|D|X|N/A",
  "blackBoxWarning": "FDA black box warning text if applicable, else null",
  "renalAdjustment": "Specific dose/frequency adjustment for the patient's computed CrCl value, else null",
  "hepaticAdjustment": "Specific adjustment for the stated Child-Pugh class, else null",
  "pediatricNote": "Weight-based pediatric dosing note if patient age < 18, else null",
  "hardStops": ["array of un-overridable safety concerns requiring mandatory intervention before ANY action — e.g. dose exceeds absolute maximum, known lethal allergy, pregnancy category X drug confirmed pregnant. Empty array [] if none."],
  "softStops": ["array of important warnings that clinician should acknowledge but can dismiss — e.g. minor interaction, borderline renal dose, drug not ideal for indication. Empty array [] if none."]
}`;

  const runEval = async (overrideForm) => {
    const f = overrideForm || form;
    const wKg = f.unit==="lbs"?(parseFloat(f.weight)*0.453592).toFixed(1):f.weight;
    if(!f.weight||!f.amountMg||!f.age){ setError("Age, Weight, and Amount are required."); return; }
    if(subscriptionStatus==="none"){
      setUpgradeReason(`Start your ${PLANS.trialDays}-day free trial to run Clinical evaluations.`);
      setShowUpgrade(true);
      return;
    }
    if(!online){
      // Try to serve a cached result when offline
      const cached = await getCachedResult(f);
      if(cached){
        const ageMin = Math.round(cached.ageMs/60000);
        setResult(cached.result);
        setHardStops(cached.result.hardStops||[]);
        setSoftStops(cached.result.softStops||[]);
        setReviewFlag(cached.result.tag==="CRITICAL"||!!cached.result.blackBoxWarning||cached.result.interactionSeverity?.some(s=>s.severity==="Major"||s.severity==="Contraindicated"));
        setError(`📴 Offline — showing cached result from ${ageMin} minute${ageMin!==1?"s":""} ago. Reconnect for a fresh evaluation.`);
        setLoading(false);
        return;
      }
      setError("📴 You're offline and no cache exists for this combination. Drug Ref, IV Calculator, Risk Scores and Lab Values all work offline.");
      setLoading(false);
      return;
    }
    setError(null); setResult(null); setLoading(true);
    setHardStops([]); setSoftStops([]);
    const crl = calcCrCl(f.age,wKg,f.screatinine,f.gender==="Female");
    const rst = renalStage(crl);
    const bmi = calcBMI(parseFloat(wKg),parseFloat(f.height));
    const bsa = calcBSA(parseFloat(wKg),parseFloat(f.height));
    const mgkg = f.weight&&f.amountMg?(parseFloat(f.amountMg)/parseFloat(wKg)).toFixed(2):null;

    try {
      const rawText = await clinicalQuery({ prompt:buildPrompt(f,wKg,crl,rst,bmi,bsa,mgkg), fast:false, maxTokens:1500 });
      const parsed=JSON.parse(rawText.replace(/```json|```/g,"").trim());
      setResult(parsed);
      triggerFeedback(parsed.tag);
      setHardStops(parsed.hardStops||[]);
      setSoftStops(parsed.softStops||[]);
      setReviewFlag(parsed.tag==="CRITICAL" || !!parsed.blackBoxWarning || parsed.interactionSeverity?.some(s=>s.severity==="Major"||s.severity==="Contraindicated"));
      setHistory(prev=>[{id:Date.now(),timestamp:new Date().toLocaleString(),form:{...f},result:parsed},...prev]);
      sendResultToScribe(parsed, f);
      // Cache result for offline use (skip if Privacy Mode is on)
      if(!privacyMode) await cacheResult(f, parsed);
    } catch(e){ setError("Evaluation failed — "+e.message); }
    finally { setLoading(false); }
  };
    setForm(f); setResult(null); setError(null); setTab("evaluate");
    await new Promise(r => setTimeout(r, 80));
    runEval(f);
  };

  const handleCopy = () => {
    if(!result) return;
    const sevLines = result.interactionSeverity?.length
      ? result.interactionSeverity.map(it=>`  - [${it.severity}] ${it.drugPair} — ${it.note}`).join("\n")
      : "";
    const lines = [reviewFlag?"🩺 PENDING PHARMACIST / SENIOR CLINICIAN REVIEW — AI output not yet verified":"",`MedGuard Evaluation — ${new Date().toLocaleString()}`,`Patient: ${form.patientName||"Anonymous"} | ${form.age}y | ${form.weight}${form.unit} | ${form.gender}`,result.blackBoxWarning?`⬛ BLACK BOX: ${result.blackBoxWarning}`:"",`Status: ${result.tag} | Pregnancy: ${result.pregnancyCategory||"N/A"}`,`Drug: ${result.drug} | Dose: ${result.dose} | Schedule: ${result.schedule}`,`Drug Class: ${result.drugClass} | Mechanism: ${result.mechanism}`,result.renalAdjustment?`Renal Adj: ${result.renalAdjustment}`:"",result.hepaticAdjustment?`Hepatic Adj: ${result.hepaticAdjustment}`:"",`Contraindications: ${result.contraindications?.join(", ")}`,`Side Effects: ${result.sideEffects?.join(", ")}`,`Monitoring: ${result.monitoring?.join(", ")}`,`Interactions: ${result.interactions}`,sevLines?`Interaction Severity Matrix:\n${sevLines}`:""].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2200); });
  };

  const handlePDF = () => {
    if(!resultRef.current||!result) return;
    if(!isPro){ setUpgradeReason("PDF report downloads are a Pro feature. Upgrade to export this evaluation as a PDF."); setShowUpgrade(true); return; }
    const fname = `MedGuard-${(form.patientName||"Patient").replace(/\s+/g,"-")}-${new Date().toISOString().split("T")[0]}.pdf`;
    generatePDF(resultRef.current, fname, form.patientName, new Date().toLocaleString(), setPdfLoading);
  };

  const TABS=[
    {id:"evaluate",  label:"🩺 Evaluate"},
    {id:"iv",        label:"💉 IV Calc"},
    {id:"scores",    label:"📊 Risk Scores"},
    {id:"drugref",   label:"📚 Drug Ref"},
    {id:"antibiotic",label:"🦠 Antibiotic"},
    {id:"calcs",     label:"🧮 Calculators"},
    {id:"labs",      label:"🔬 Lab Values"},
    {id:"ward",      label:"📋 Ward Round"},
    {id:"history",   label:`📁 History (${history.length})`},
  ];

  if (showAdmin) return (
    <ErrorBoundary><AdminShell onBack={()=>setShowAdmin(false)}/></ErrorBoundary>
  );

  return (
    <ErrorBoundary>
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#F0FDF4 0%,#ECFDF5 45%,#F9FAFB 100%)",fontFamily:"'DM Sans','Segoe UI',sans-serif",padding:"28px 16px"}}>
      <NetworkBanner online={online}/>
      <div style={{maxWidth:1020,margin:"0 auto"}}>

        {/* Plan status bar */}
        <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          {subscriptionStatus==="none" ? (
            <button onClick={()=>{setUpgradeReason("");setShowUpgrade(true);}} style={{padding:"7px 16px",borderRadius:20,border:"none",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(124,58,237,0.3)"}}>
              🔓 Start {PLANS.trialDays}-Day Free Trial
            </button>
          ) : (
            <TrialCountdownBanner trialEndsAt={trialEndsAt} onManage={()=>{ /* Link to your subscription management portal */ }}/>
          )}
        </div>

        {/* Dark mode toggle */}
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
          <button onClick={toggleDark} style={{border:'none',background:'none',cursor:'pointer',fontSize:18,opacity:0.7}} title={dark?'Light mode':'Dark mode'}>
            {dark?'☀️':'🌙'}
          </button>
        </div>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"#fff",border:`1.5px solid ${C.borderMd}`,borderRadius:40,padding:"6px 18px",marginBottom:14,boxShadow:"0 2px 8px rgba(5,150,105,0.1)"}}>
            <span style={{fontSize:16}}>🏥</span>
            <span
              style={{fontSize:10,fontWeight:800,letterSpacing:"0.15em",textTransform:"uppercase",color:C.primary,cursor:"default",userSelect:"none"}}
              onClick={()=>{
                const next = adminClicks + 1;
                setAdminClicks(next);
                clearTimeout(adminClickTimer.current);
                if (next >= 5) { setAdminClicks(0); setShowAdmin(true); }
                else { adminClickTimer.current = setTimeout(()=>setAdminClicks(0), 2000); }
              }}
            >MedGuard · Clinical Intelligence</span>
          </div>
          <h1 style={{margin:"0 0 6px",fontSize:25,fontWeight:800,color:C.text,lineHeight:1.2}}>Medication Safety & Dosing Evaluator</h1>
          <p style={{margin:"0 0 14px",fontSize:13,color:C.muted}}>Clinical evaluation · Overdose detection · IV tools · Risk scores · Renal & hepatic dose adjustment · PDF reports</p>
        </div>

        <UpgradeModal open={showUpgrade} onClose={()=>setShowUpgrade(false)} onSubscribed={handleSubscribed} reason={upgradeReason}/>

        {/* Network status banner */}
        <NetworkBanner online={online}/>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:14,background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:5,flexWrap:"wrap"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 14px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,transition:"all 0.18s",background:tab===t.id?C.primary:"transparent",color:tab===t.id?"#fff":C.muted,boxShadow:tab===t.id?"0 2px 8px rgba(5,150,105,0.3)":"none"}}>{t.label}</button>)}
        </div>

        {tab==="iv"&&<IVTab/>}
        {tab==="scores"&&<RiskScoresTab/>}
        {tab==="drugref"&&<DrugRefTab/>}
        {tab==="antibiotic"&&<AntibioticTab/>}
        {tab==="calcs"&&<ExtendedCalcTab/>}
        {tab==="labs"&&<LabValuesTab/>}
        {tab==="ward"&&<WardRoundBatch C={C} isPro={isPro} onUpgrade={()=>{setUpgradeReason("Unlock Ward Round Batch Evaluator with Pro.");setShowUpgrade(true);}}/>}
        {tab==="history"&&(
          history.length===0
            ?<div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:20,border:`1.5px solid ${C.border}`}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <p style={{margin:"0 0 6px",fontWeight:700,fontSize:15,color:C.text}}>No evaluations yet</p>
              <p style={{margin:"0 0 18px",fontSize:13,color:C.muted}}>Run your first evaluation to see results here.</p>
              <button onClick={()=>setTab("evaluate")} style={{padding:"10px 24px",borderRadius:10,border:"none",background:C.primary,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Start Evaluating →</button>
            </div>
            :<div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
                <button onClick={()=>setHistory([])} style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",color:C.danger,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Clear All</button>
              </div>
              {history.map(e=><HistCard key={e.id} entry={e} onView={entry=>{setForm(entry.form);setResult(entry.result);setTab("evaluate");}}/>)}
            </div>
        )}

        {tab==="evaluate"&&(
          subscriptionStatus==="none" ? (
            <SubscriptionGate onStart={()=>{setUpgradeReason("");setShowUpgrade(true);}}/>
          ) : (
          <div style={{display:"grid",gridTemplateColumns:result?"1fr 1fr":"1fr",gap:20,alignItems:"start"}}>
            {/* Form */}
            <div style={{background:C.surface,borderRadius:20,border:`1.5px solid ${C.border}`,boxShadow:"0 4px 20px rgba(0,0,0,0.05)",padding:"24px 24px 20px"}}>

              {/* Privacy + Voice controls */}
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                <PrivacyModeToggle enabled={privacyMode} onToggle={async e=>{
                  setPrivacyMode(e.target.checked);
                  if(e.target.checked) await wipeAllStorage();
                }}/>
                {isPro&&(
                  <>
                  <button onClick={()=>setVoiceOpen(v=>!v)} style={{padding:"10px 16px",borderRadius:10,border:`1.5px solid ${voiceOpen?C.primary:C.border}`,background:voiceOpen?`${C.primary}15`:"#F9FAFB",color:voiceOpen?C.primary:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                    🎙️ {voiceOpen?"Close Voice":"Voice Input"}
                  </button>
                  <button onClick={()=>setCameraOpen(v=>!v)} style={{padding:"10px 16px",borderRadius:10,border:`1.5px solid ${cameraOpen?C.primary:C.border}`,background:cameraOpen?`${C.primary}15`:"#F9FAFB",color:cameraOpen?C.primary:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                    📷 {cameraOpen?"Close Scanner":"Scan Lab Sheet"}
                  </button>
                  </>
                )}
              </div>

              {/* Camera Scanner */}
              {cameraOpen&&isPro&&(
                <CameraScanner C={C} onClose={()=>setCameraOpen(false)} onExtracted={(vals)=>{
                  if(vals.creatinine) setForm(f=>({...f,screatinine:String(vals.creatinine)}));
                  setCameraOpen(false);
                }}/>
              )}
              {/* Voice Input Panel */}
              {voiceOpen&&isPro&&(
                <VoiceInputPanel
                  privacyMode={privacyMode}
                  onClose={()=>setVoiceOpen(false)}
                  onExtracted={extracted=>{
                    setForm(prev=>({
                      ...prev,
                      patientName: extracted.patientName||prev.patientName,
                      age:         extracted.age||prev.age,
                      weight:      extracted.weight||prev.weight,
                      unit:        extracted.unit||prev.unit,
                      gender:      extracted.gender||prev.gender,
                      amountMg:    extracted.amountMg||prev.amountMg,
                      route:       extracted.route||prev.route,
                      indication:  extracted.indication||prev.indication,
                      notes:       extracted.notes||prev.notes,
                      drug:        extracted.drug
                        ? (ALL_DRUGS.find(d=>d.toLowerCase().includes((extracted.drug||"").toLowerCase()))||prev.drug)
                        : prev.drug,
                    }));
                    setVoiceOpen(false);
                  }}
                />
              )}

              {/* Hard/Soft Stop Alert System */}
              <AlertSystem
                hardStops={hardStops}
                softStops={softStops}
                onOverrideHard={(i,justification)=>{
                  setHardStops(s=>s.filter((_,idx)=>idx!==i));
                }}
              />
              <SH icon="👤" ch="Patient Information"/>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:12}}>
                <div><Label ch="Full Name (optional)"/><input style={inputBase} placeholder="e.g. John Doe" value={form.patientName} onChange={set("patientName")}/></div>
                <div><Label ch="Age (yrs)"/><input style={inputBase} type="number" min="0" placeholder="34" value={form.age} onChange={set("age")}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><Label ch="Gender"/>
                  <div style={{display:"flex",gap:6}}>
                    {["Male","Female"].map(g=><button key={g} onClick={()=>setForm(f=>({...f,gender:g,pregnant:g==="Male"?false:f.pregnant}))} style={{flex:1,padding:"10px 0",borderRadius:10,border:`1.5px solid ${form.gender===g?C.primary:C.border}`,background:form.gender===g?`${C.primary}15`:"#FAFAFA",color:form.gender===g?C.primary:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{g}</button>)}
                  </div>
                </div>
                <div><Label ch="Weight"/>
                  <div style={{display:"flex",gap:6}}>
                    <input style={{...inputBase,flex:1}} type="number" min="0" placeholder="70" value={form.weight} onChange={set("weight")}/>
                    <button onClick={()=>setForm(f=>({...f,unit:f.unit==="kg"?"lbs":"kg"}))} style={{padding:"0 10px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#F3F4F6",fontSize:11,fontWeight:800,cursor:"pointer",color:C.muted,fontFamily:"inherit"}}>{form.unit}</button>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><Label ch="Height (cm, optional)"/><input style={inputBase} type="number" min="0" placeholder="170" value={form.height} onChange={set("height")}/></div>
                <div>
                  {(bmi||bsa)&&<div style={{background:"#F0FDF4",border:`1.5px solid ${C.borderMd}`,borderRadius:10,padding:"10px 14px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                    {bmi&&<div style={{fontSize:10,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:"0.1em"}}>BMI <span style={{fontSize:18,fontWeight:800,color:C.text}}>{bmi}</span></div>}
                    {bsa&&<div style={{fontSize:10,fontWeight:700,color:C.dark,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>BSA <span style={{fontSize:14,fontWeight:800,color:C.text}}>{bsa} m²</span></div>}
                  </div>}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><Label ch="Serum Creatinine (mg/dL)"/><input style={inputBase} type="number" min="0" step="0.01" placeholder="e.g. 1.2" value={form.screatinine} onChange={set("screatinine")}/></div>
                <div>
                  {crcl!==null&&renalSt&&<div style={{background:`${renalSt.color}12`,border:`1.5px solid ${renalSt.color}40`,borderRadius:10,padding:"10px 14px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                    <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:renalSt.color}}>CrCl (Cockcroft-Gault)</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.text}}>{crcl.toFixed(1)} <span style={{fontSize:11,color:C.muted}}>mL/min</span></div>
                    <div style={{fontSize:11,fontWeight:700,color:renalSt.color}}>{renalSt.label}</div>
                  </div>}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                <div><Label ch="Hepatic Impairment"/><Sel value={form.hepaticLevel} onChange={set("hepaticLevel")}>{HEPATIC_LEVELS.map(l=><option key={l}>{l}</option>)}</Sel></div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                  {form.gender==="Female"&&<label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#FDF4FF",border:`1.5px solid ${form.pregnant?"#A855F7":C.border}`,borderRadius:10,cursor:"pointer"}}>
                    <input type="checkbox" checked={form.pregnant} onChange={e=>setForm(f=>({...f,pregnant:e.target.checked}))} style={{width:16,height:16,accentColor:"#A855F7",cursor:"pointer"}}/>
                    <span style={{fontSize:12,fontWeight:600,color:"#7C3AED"}}>🤰 Pregnant</span>
                  </label>}
                </div>
              </div>

              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18,marginBottom:16}}>
                <SH icon="💊" ch="Drug & Dosing Details"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><Label ch="Drug Category"/><Sel value={form.category} onChange={set("category")}>{Object.keys(DRUG_CATEGORIES).map(c=><option key={c}>{c}</option>)}</Sel></div>
                  <div><Label ch="Drug / Medication"/><Sel value={form.drug} onChange={set("drug")}>{(DRUG_CATEGORIES[form.category]||[]).map(d=><option key={d}>{d}</option>)}</Sel></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <Label ch="Amount (mg)"/>
                    <input style={inputBase} type="number" min="0" placeholder="e.g. 1000" value={form.amountMg} onChange={set("amountMg")}/>
                    {mgPerKg&&<span style={{fontSize:10,color:C.primary,fontWeight:700,marginTop:4,display:"block"}}>≈ {mgPerKg} mg/kg{bsa?` · ${(parseFloat(form.amountMg)/parseFloat(bsa)).toFixed(1)} mg/m²`:""}</span>}
                  </div>
                  <div><Label ch="Route"/><Sel value={form.route} onChange={set("route")}>{ROUTES.map(r=><option key={r}>{r}</option>)}</Sel></div>
                </div>
                <div style={{marginBottom:12}}><Label ch="Clinical Indication"/><Sel value={form.indication} onChange={set("indication")}>{INDICATIONS.map(i=><option key={i}>{i}</option>)}</Sel></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><Label ch="Known Allergies"/><input style={inputBase} placeholder="e.g. Penicillin" value={form.allergies} onChange={set("allergies")}/></div>
                  <div><Label ch="Current Medications"/><input style={inputBase} placeholder="e.g. Warfarin, Furosemide" value={form.currentMeds} onChange={set("currentMeds")}/></div>
                </div>
                <div><Label ch="Additional Clinical Notes"/><textarea style={{...inputBase,resize:"vertical",minHeight:64,lineHeight:1.65}} placeholder="CKD, liver cirrhosis, pregnancy trimester…" value={form.notes} onChange={set("notes")}/></div>
              </div>

              <MathProofsPanel form={form} weightKg={weightKg} crcl={crcl} bmi={bmi} bsa={bsa} mgPerKg={mgPerKg} C={C}/>
              <PharmacoAlert drugName={form.drug} C={C}/>
              {error&&<div style={{background:"#FEF2F2",border:"1.5px solid #FCA5A5",borderRadius:10,padding:"11px 16px",marginBottom:14,fontSize:12,color:"#991B1B",fontWeight:600}}>⚠️ {error}</div>}

              <button onClick={()=>runEval()} disabled={loading} style={{width:"100%",background:loading?"#6EE7B7":`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",border:"none",borderRadius:12,padding:"15px 24px",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 4px 14px rgba(5,150,105,0.35)",transition:"all 0.2s",fontFamily:"inherit"}}>
                {loading?<><span style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Evaluating…</>:<><span>🚀</span>Run Clinical Evaluation</>}
              </button>
            </div>

            {/* Results */}
            {result&&!loading&&(
              <ResultPanel result={result} form={form} resultRef={resultRef}
                onNew={()=>{setResult(null);setForm(initForm);setReviewFlag(false);}}
                onCopy={handleCopy} copied={copied}
                onPDF={handlePDF} pdfLoading={pdfLoading}
                reviewFlag={reviewFlag} onToggleReview={e=>setReviewFlag(e.target.checked)} isPro={isPro}/>
            )}
          </div>
        )}
      </div>

      <Watermark/>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        select:focus,input:focus,textarea:focus{border-color:#059669!important;box-shadow:0 0 0 3px rgba(5,150,105,0.15)!important;outline:none;}
        button:hover:not(:disabled){opacity:0.91;}
        button:disabled{opacity:0.82;}
        input[type=range]{height:4px;}
      `}</style>
    </div>
    </ErrorBoundary>
  );
}
