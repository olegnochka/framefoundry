// Stripe -> Slack: posts paid deposits and full payments to #frame-foundry-leads.
// Needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET (whsec_..., from the webhook endpoint in the Stripe dashboard).
// Endpoint URL to register in Stripe: https://framefoundrypc.com/api/stripe-webhook  (event: checkout.session.completed)
import Stripe from "stripe";
import { BUILDS, formatUSD } from "./lib/catalog.mjs";
import { postSlack, slackEscape } from "./lib/slack.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return new Response("Not configured", { status: 503 });

  const stripe = new Stripe(key);
  const raw = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, req.headers.get("stripe-signature") || "", secret);
  } catch (err) {
    console.error("Stripe signature check failed:", err?.message);
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const m = s.metadata || {};
    const build = BUILDS[m.build]?.name || m.build || "build";
    const paid = formatUSD(s.amount_total ?? 0);
    const balance = Number(m.balance_cents || 0);
    const addr = s.collected_information?.shipping_details?.address || s.customer_details?.address || {};
    const test = event.livemode ? "" : " _(TEST MODE - no real money)_";
    const lines = [
      `:moneybag: *${m.mode === "full" ? "Paid in full" : "Deposit paid"}* - ${slackEscape(build)}${test}`,
      `*Paid:* ${paid} (incl. tax ${formatUSD(s.total_details?.amount_tax ?? 0)})` +
        (balance > 0 ? `   *Balance due at delivery:* ${formatUSD(balance)} + tax` : ""),
      `*Customer:* ${slackEscape(s.customer_details?.name) || "-"}   ${slackEscape(s.customer_details?.email) || ""}   ${slackEscape(s.customer_details?.phone) || ""}`,
      `*Deliver to:* ${slackEscape([addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")) || "-"} (ZIP given on site: ${slackEscape(m.zip) || "-"})`,
      "*Next:* order the parts today, email the customer to schedule delivery, add the order to the Leads Tracker.",
    ];
    await postSlack(lines.join("\n"));
  }
  return new Response("ok", { status: 200 });
};
