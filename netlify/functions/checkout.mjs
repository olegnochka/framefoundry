// Buy-as-is checkout for the three reference builds (Stripe Checkout).
// Needs STRIPE_SECRET_KEY (sk_test_... while testing, sk_live_... after the seller's permit + insurance are active).
// Sales tax: Stripe Tax is on (California registration added 2026-10-17); set STRIPE_AUTOMATIC_TAX=false to turn it off.
import Stripe from "stripe";
import { BUILDS, SERVICES, SERVICE_ZIPS, depositCents, formatUSD } from "./lib/catalog.mjs";
import { priceId } from "./lib/stripe-catalog.mjs";

const SITE = process.env.URL || "https://framefoundrypc.com";

// Short order number that ties the online deposit to the balance collected at delivery (Tap to Pay description,
// Stripe search, receipts, Slack). Format FF-MMDD-NNNN (Los Angeles date + 4 random digits).
function orderNumber() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const mmdd = String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return `FF-${mmdd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default async (req) => {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");

  // The builds page asks first, and only shows the Buy buttons when checkout is configured.
  if (req.method === "GET") {
    const builds = Object.entries(BUILDS).map(([id, b]) => ({
      id, name: b.name, summary: b.summary, totalCents: b.totalCents, depositCents: depositCents(b.totalCents),
    }));
    return json({ enabled: Boolean(key), live, builds, care: { priceCents: SERVICES.care.amountCents } });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!key) return json({ error: "Online checkout isn't open yet - please use the quote form." }, 503);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const buildId = String(body.build || "");
  const mode = body.mode === "full" ? "full" : "deposit";
  const zip = String(body.zip || "").trim().slice(0, 5);
  const build = BUILDS[buildId];
  if (!build) return json({ error: "Unknown build." }, 400);
  if (!/^\d{5}$/.test(zip)) return json({ error: "Please enter a 5-digit delivery ZIP code." }, 400);
  if (!SERVICE_ZIPS.has(zip)) {
    return json({ error: "outside_area", message: "That ZIP is outside our usual delivery area - send a quote request and we'll check." }, 400);
  }
  if (body.agreed !== true) return json({ error: "Please accept the terms first." }, 400);
  // Optional Frame Foundry Care ($99/year, auto-renewing). Needs its own explicit consent to automatic
  // renewal (California Business and Professions Code 17602), same as care.mjs.
  const care = body.care === true;
  if (care && body.autorenew !== true) return json({ error: "Please confirm the automatic yearly renewal for Frame Foundry Care." }, 400);

  const total = build.totalCents;
  const amount = mode === "full" ? total : depositCents(total);
  const balance = total - amount;
  const order = orderNumber();
  const name = `${order} ${build.name} - ${mode === "full" ? "paid in full" : "30% deposit"}`;
  const stripe = new Stripe(key);
  try {
    // Prices come from the Stripe catalog (synced from catalog.mjs by lookup key).
    const buildItem = { quantity: 1, price: await priceId(stripe, `ff_build_${buildId}_${mode}`) };
    const careItem = care ? { quantity: 1, price: await priceId(stripe, "ff_care_yearly") } : null;
    const metadata = { order, build: buildId, mode, zip, build_total_cents: String(total), balance_cents: String(balance), care: care ? "yes" : "no" };
    const submitMessage = care
      ? `Order ${order}. By paying you agree to Frame Foundry's terms (framefoundrypc.com/terms.html). Frame Foundry Care renews automatically every year at ${formatUSD(SERVICES.care.amountCents)} plus any sales tax until you cancel; we email you before each renewal and you can cancel online or by email. We order your parts today and contact you within 24 hours to schedule delivery.`
      : `Order ${order}. By paying you agree to Frame Foundry's terms (framefoundrypc.com/terms.html). We order your parts today and contact you within 24 hours to schedule delivery.`;
    const session = await stripe.checkout.sessions.create({
      // With Care the session is a subscription: the build is a one-time item on the first invoice.
      mode: care ? "subscription" : "payment",
      line_items: care ? [buildItem, careItem] : [buildItem],
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX !== "false" }, // Stripe Tax, CA permit 238-973920
      ...(care
        ? { subscription_data: { description: `${SERVICES.care.name} (${order})`, metadata: { kind: "care", order, build: buildId, zip } } }
        : {
            customer_creation: "always",
            payment_intent_data: {
              description: name,
              statement_descriptor_suffix: "FRAME FOUNDRY",
              metadata: { order, build: buildId, mode, zip, balance_cents: String(balance) },
            },
          }),
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US"] },
      custom_text: {
        shipping_address: { message: "Delivery address - we deliver and set up across the San Fernando Valley, Conejo Valley, Simi Valley, Camarillo, Malibu and the Westside." },
        submit: { message: submitMessage },
      },
      metadata,
      success_url: `${SITE}/order-thanks.html?order=${order}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/checkout.html?build=${buildId}`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err?.type, err?.message);
    return json({ error: "Checkout couldn't start. Please try again or use the quote form." }, 502);
  }
};
