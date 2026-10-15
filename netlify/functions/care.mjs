// Tune-up ($79 one-time) and Frame Foundry Care ($99/year, auto-renewing subscription) via Stripe Checkout.
// Uses the same STRIPE_SECRET_KEY / STRIPE_AUTOMATIC_TAX as checkout.mjs.
// Optional STRIPE_PORTAL_LOGIN_URL: the Stripe customer portal login link (Stripe dashboard -> Settings -> Billing ->
// Customer portal -> "Login link"). The services page shows it as "Manage or cancel" - California's auto-renewal law
// requires an online way to cancel.
import Stripe from "stripe";
import { SERVICES, SERVICE_ZIPS, formatUSD } from "./lib/catalog.mjs";

const SITE = process.env.URL || "https://framefoundrypc.com";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default async (req) => {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  const portal = /^https:\/\/billing\.stripe\.com\//.test(process.env.STRIPE_PORTAL_LOGIN_URL || "")
    ? process.env.STRIPE_PORTAL_LOGIN_URL
    : "";

  if (req.method === "GET") return json({ enabled: Boolean(key), live, portal });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!key) return json({ error: "Online booking isn't open yet - please use the quote form." }, 503);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const planId = body.plan === "care" ? "care" : body.plan === "tuneup" ? "tuneup" : "";
  const plan = SERVICES[planId];
  const zip = String(body.zip || "").trim().slice(0, 5);
  if (!plan) return json({ error: "Unknown plan." }, 400);
  if (!/^\d{5}$/.test(zip)) return json({ error: "Please enter a 5-digit ZIP code." }, 400);
  if (!SERVICE_ZIPS.has(zip)) {
    return json({ error: "outside_area", message: "That ZIP is outside our usual service area - send a quote request and we'll check." }, 400);
  }
  if (body.agreed !== true) return json({ error: "Please accept the terms first." }, 400);
  // Separate, explicit consent to automatic renewal (California Business and Professions Code 17602).
  if (planId === "care" && body.autorenew !== true) return json({ error: "Please confirm the automatic yearly renewal." }, 400);

  const metadata = { kind: planId, zip };
  const price_data = {
    currency: "usd",
    unit_amount: plan.amountCents,
    tax_behavior: "exclusive",
    product_data: { name: plan.name, description: plan.description },
    ...(plan.interval ? { recurring: { interval: plan.interval } } : {}),
  };
  const submitMessage =
    planId === "care"
      ? `Frame Foundry Care renews automatically every year at ${formatUSD(plan.amountCents)} plus any sales tax until you cancel. We email you before each renewal; cancel online any time (framefoundrypc.com/services.html) or by emailing hello@framefoundrypc.com. Full terms: framefoundrypc.com/terms.html#care`
      : "We email you within one business day to book your tune-up visit. Cancel before the visit for a full refund. Terms: framefoundrypc.com/terms.html#care";

  const stripe = new Stripe(key);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: planId === "care" ? "subscription" : "payment",
      line_items: [{ quantity: 1, price_data }],
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      ...(planId === "care"
        ? { subscription_data: { description: plan.name, metadata } }
        : { customer_creation: "always", payment_intent_data: { description: plan.name, metadata } }),
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US"] },
      custom_text: {
        shipping_address: { message: "Address of the PC - tune-ups are done at your home." },
        submit: { message: submitMessage },
      },
      metadata,
      success_url: `${SITE}/care-thanks.html?plan=${planId}`,
      cancel_url: `${SITE}/services.html#${planId === "care" ? "care-plan" : "tuneup"}`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error("Stripe care checkout error", err?.type, err?.message);
    return json({ error: "Checkout couldn't start. Please try again or use the quote form." }, 502);
  }
};
