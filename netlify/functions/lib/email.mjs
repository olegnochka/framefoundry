// Customer emails (order and booking confirmations) through Resend (resend.com).
// Needs RESEND_API_KEY in Netlify (created by Oleg in Resend, domain framefoundrypc.com verified there).
// Without it, nothing is sent and the webhook carries on - Stripe's own receipt still goes out in live mode.
// Optional EMAIL_FROM, default "Frame Foundry <hello@framefoundrypc.com>". Replies go to hello@framefoundrypc.com.

const FROM = process.env.EMAIL_FROM || "Frame Foundry <hello@framefoundrypc.com>";
const REPLY_TO = "hello@framefoundrypc.com";
const SITE = "https://framefoundrypc.com";

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, text, idempotencyKey }) {
  if (!emailEnabled() || !to) return { sent: false, reason: !to ? "no recipient" : "RESEND_API_KEY not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      // Stripe can deliver the same event twice; Resend drops repeats with the same key.
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error("Resend error:", res.status, body.slice(0, 300));
    return { sent: false, reason: `Resend ${res.status}` };
  }
  return { sent: true };
}

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Plain, table-based layout with inline styles - the only thing every mail app renders the same way.
function layout({ preheader, heading, intro, rows, sections, testMode }) {
  const rowHtml = rows
    .map(([k, v, strong]) =>
      `<tr><td style="padding:8px 0;color:#5b6270;font-size:14px;border-bottom:1px solid #eceef2">${esc(k)}</td>` +
      `<td style="padding:8px 0;text-align:right;font-size:14px;color:#14161a;border-bottom:1px solid #eceef2;${strong ? "font-weight:700" : ""}">${esc(v)}</td></tr>`)
    .join("");
  const secHtml = sections
    .map(([title, items]) =>
      `<h2 style="font-size:16px;margin:28px 0 8px;color:#14161a">${esc(title)}</h2>` +
      (Array.isArray(items)
        ? `<ol style="margin:0;padding-left:20px;color:#2b2f36;font-size:14px;line-height:1.6">${items.map((i) => `<li style="margin:4px 0">${esc(i)}</li>`).join("")}</ol>`
        : `<p style="margin:0;color:#2b2f36;font-size:14px;line-height:1.6">${esc(items)}</p>`))
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#101216;padding:20px 28px;color:#ffffff;font-size:13px;letter-spacing:2px;font-weight:700">FRAME FOUNDRY</td></tr>
<tr><td style="padding:28px">
${testMode ? `<p style="margin:0 0 16px;padding:8px 12px;background:#fff4e5;color:#8a4b00;font-size:13px;border-radius:6px">TEST ORDER - no real money was charged.</p>` : ""}
<h1 style="font-size:22px;margin:0 0 10px;color:#14161a">${esc(heading)}</h1>
<p style="margin:0 0 20px;color:#2b2f36;font-size:15px;line-height:1.6">${esc(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>
${secHtml}
<p style="margin:28px 0 0;color:#2b2f36;font-size:14px;line-height:1.6">Questions? Just reply to this email or write to <a href="mailto:${REPLY_TO}" style="color:#d9661f">${REPLY_TO}</a>.</p>
</td></tr>
<tr><td style="padding:18px 28px;background:#f8f9fb;color:#8a909c;font-size:12px;line-height:1.5">Pacific Front Desk LLC dba Frame Foundry - custom gaming PCs, built to order in Canoga Park, Los Angeles. <a href="${SITE}" style="color:#8a909c">framefoundrypc.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

function toText({ heading, intro, rows, sections }) {
  return [
    heading, "", intro, "",
    ...rows.map(([k, v]) => `${k}: ${v}`), "",
    ...sections.flatMap(([t, items]) => [t, ...(Array.isArray(items) ? items.map((i, n) => `${n + 1}. ${i}`) : [items]), ""]),
    `Questions? Reply to this email or write to ${REPLY_TO}.`,
    "Pacific Front Desk LLC dba Frame Foundry - framefoundrypc.com",
  ].join("\n");
}

// Order confirmation for one of the three current builds (checkout.mjs).
export function buildOrderEmail({ order, buildName, summary, mode, paidCents, taxCents, balanceCents, balanceTaxCents, care, careCents, testMode, money }) {
  const deposit = mode !== "full" && balanceCents > 0;
  const rows = [
    ["Order number", order || "-", true],
    ["Build", buildName],
    ["Paid today", `${money(paidCents)}${taxCents ? ` (incl. ${money(taxCents)} sales tax)` : ""}`],
    ...(care ? [["Frame Foundry Care", `${money(careCents)} a year, included in today's payment`]] : []),
    ...(deposit ? [["Due at delivery", `${money(balanceCents + balanceTaxCents)} (balance ${money(balanceCents)} + ${money(balanceTaxCents)} sales tax)`, true]] : []),
  ];
  const sections = [
    ["What's in your PC", summary],
    ["What happens next", [
      "Today we order your parts, and within 24 hours we email you to confirm the build and pick a delivery day.",
      "We assemble, set up BIOS and memory, install Windows and drivers, stress-test it and send you photos.",
      deposit
        ? `We deliver it and make sure it works. You pay the balance then by tapping your card or phone - we use your order number ${order} to match it to your deposit.`
        : "We deliver it, set it up with you and make sure it works. Nothing more to pay.",
    ]],
    ["If a part sells out", "We contact you with options first - wait, an equal-or-better part at no extra cost, or a full refund. We never swap a part without your OK."],
    ...(care ? [["Frame Foundry Care", `Your plan renews automatically every year at ${money(careCents)} plus any sales tax until you cancel. We email you before each renewal, and you can cancel online any time from ${SITE}/services.html.`]] : []),
  ];
  const heading = `Thanks - your ${buildName} is ordered`;
  const intro = deposit
    ? `We got your 30% deposit for order ${order}. Here's everything in one place.`
    : `We got your payment for order ${order}. Here's everything in one place.`;
  const data = { preheader: `Order ${order}: ${buildName}`, heading, intro, rows, sections, testMode };
  return { subject: `Your Frame Foundry order ${order}${testMode ? " (test)" : ""}`, html: layout(data), text: toText(data) };
}

// Tune-up booking or new Care membership (care.mjs).
export function serviceEmail({ kind, paidCents, taxCents, careCents, testMode, money }) {
  const care = kind === "care";
  const rows = [
    [care ? "Plan" : "Service", care ? "Frame Foundry Care (yearly)" : "PC tune-up visit", true],
    ["Paid today", `${money(paidCents)}${taxCents ? ` (incl. ${money(taxCents)} sales tax)` : ""}`],
  ];
  const sections = care
    ? [
        ["What's included", "A yearly tune-up, free repair labor on PCs we built (20% off for other PCs), priority replies and remote help sessions."],
        ["What happens next", ["Within one business day we email you to book this year's tune-up.", "Your plan renews automatically every year until you cancel; we email you before each renewal."]],
        ["Cancel any time", `Online from ${SITE}/services.html (Manage or cancel), or reply to this email.`],
      ]
    : [["What happens next", ["Within one business day we email you to pick a visit time.", "We come to you, clean and check the PC, update drivers and settings, and tell you what we found.", "Cancel before the visit for a full refund."]]];
  const heading = care ? "Welcome to Frame Foundry Care" : "Your tune-up is booked";
  const intro = care ? "Thanks for joining - here's how your plan works." : "Thanks - we got your payment. Here's what happens next.";
  const data = { preheader: heading, heading, intro, rows, sections, testMode };
  return { subject: `${heading}${testMode ? " (test)" : ""}`, html: layout(data), text: toText(data) };
}
