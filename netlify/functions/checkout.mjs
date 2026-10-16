// Buy-as-is checkout for the three reference builds (Stripe Checkout).
// Needs STRIPE_SECRET_KEY (sk_test_... while testing, sk_live_... after the seller's permit + insurance are active).
// Optional: STRIPE_AUTOMATIC_TAX=true once Stripe Tax is set up for California in the Stripe dashboard.
import Stripe from "stripe";
import { BUILDS, SERVICE_ZIPS, depositCents, formatUSD } from "./lib/catalog.mjs";

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

  // The builds page asks first, and only shows the Buy buttons when checkout is configured.
  if (req.method === "GET") {
    const builds = Object.entries(BUILDS).map(([id, b]) => ({
      id, name: b.name, summary: b.summary, totalCents: b.totalCents, depositCents: depositCents(b.totalCents),
    }));
    return json({ enabled: Boolean(key), live, builds });
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

  const total = build.totalCents;
  const amount = mode === "full" ? total : depositCents(total);
  const balance = total - amount;
  const name = mode === "full" ? `${build.name} - paid in full` : `${build.name} - 30% deposit`;
  const description =
    mode === "full"
      ? `${build.summary}. Build price ${formatUSD(total)} before sales tax.`
      : `${build.summary}. Build price ${formatUSD(total)} before sales tax; balance ${formatUSD(balance)} due at delivery.`;

  const stripe = new Stripe(key);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            tax_behavior: "exclusive",
            product_data: { name, description },
          },
        },
      ],
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US"] },
      custom_text: {
        shipping_address: { message: "Delivery address - we deliver and set up in the West Valley and Conejo Valley." },
        submit: {
          message:
            "By paying you agree to Frame Foundry's terms (framefoundrypc.com/terms.html). We order your parts today and contact you within 24 hours to schedule delivery.",
        },
      },
      metadata: { build: buildId, mode, zip, build_total_cents: String(total), balance_cents: String(balance) },
      payment_intent_data: {
        description: name,
        metadata: { build: buildId, mode, zip, balance_cents: String(balance) },
      },
      success_url: `${SITE}/order-thanks.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/checkout.html?build=${buildId}`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err?.type, err?.message);
    return json({ error: "Checkout couldn't start. Please try again or use the quote form." }, 502);
  }
};
