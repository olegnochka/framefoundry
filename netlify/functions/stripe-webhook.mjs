// Stripe -> Slack: posts paid deposits and full payments to #frame-foundry-leads.
// Needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET (whsec_..., from the webhook endpoint in the Stripe dashboard).
// Endpoint URL to register in Stripe: https://framefoundrypc.com/api/stripe-webhook
// Events: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted
import Stripe from "stripe";
import { BUILDS, SERVICES, formatUSD } from "./lib/catalog.mjs";
import { postSlack, slackEscape } from "./lib/slack.mjs";
import { PARTS_BY_ID } from "./lib/parts-catalog.mjs";

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

  const test = event.livemode ? "" : " _(TEST MODE - no real money)_";

  if (event.type === "checkout.session.completed" && SERVICES[event.data.object.metadata?.kind]) {
    // Tune-up booking or new Frame Foundry Care member (care.mjs).
    const s = event.data.object;
    const m = s.metadata;
    const addr = s.collected_information?.shipping_details?.address || s.customer_details?.address || {};
    const care = m.kind === "care";
    const lines = [
      `${care ? ":shield: *New Frame Foundry Care member*" : ":wrench: *Tune-up booked and paid*"}${test}`,
      `*Paid:* ${formatUSD(s.amount_total ?? 0)}${care ? " (renews yearly)" : ""}`,
      `*Customer:* ${slackEscape(s.customer_details?.name) || "-"}   ${slackEscape(s.customer_details?.email) || ""}   ${slackEscape(s.customer_details?.phone) || ""}`,
      `*PC address:* ${slackEscape([addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")) || "-"}`,
      care
        ? "*Next:* send a welcome email (what's included, how to book this year's tune-up, how to cancel) and add them to the Leads Tracker."
        : "*Next:* email within one business day to book the visit.",
    ];
    await postSlack(lines.join("\n"));
  } else if (event.type === "invoice.paid" && event.data.object.billing_reason === "subscription_cycle") {
    const inv = event.data.object;
    await postSlack(
      `:arrows_counterclockwise: *Care renewed* - ${slackEscape(inv.customer_name || inv.customer_email) || "customer"} paid ${formatUSD(inv.amount_paid ?? 0)}${test}\n` +
        "*Next:* offer to book this year's tune-up.",
    );
  } else if (event.type === "invoice.payment_failed" && event.data.object.billing_reason === "subscription_cycle") {
    const inv = event.data.object;
    await postSlack(
      `:warning: *Care renewal payment failed* - ${slackEscape(inv.customer_name || inv.customer_email) || "customer"}${test}\n` +
        "Stripe retries automatically and emails them; a friendly note from you helps.",
    );
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    let who = "";
    try {
      const c = await stripe.customers.retrieve(sub.customer);
      who = c.deleted ? "" : c.name || c.email || "";
    } catch {}
    await postSlack(`:wave: *Care cancelled* - ${slackEscape(who) || "a member"}; the plan has ended.${test}`);
  } else if (event.type === "checkout.session.completed" && event.data.object.metadata?.kind === "custom") {
    // Deposit for a PC configured in the builder (build-checkout.mjs).
    const s = event.data.object;
    const m = s.metadata;
    const addr = s.collected_information?.shipping_details?.address || s.customer_details?.address || {};
    const parts = String(m.parts || "").split(",").filter(Boolean).map((id) => PARTS_BY_ID[id]?.name || id);
    const lines = [
      `:hammer_and_wrench: *Custom build - deposit paid*${test}`,
      `*Paid:* ${formatUSD(s.amount_total ?? 0)}   *Build total:* ${formatUSD(Number(m.build_total_cents || 0))}   *Balance due at delivery:* ${formatUSD(Number(m.balance_cents || 0))} + tax`,
      `*Customer:* ${slackEscape(s.customer_details?.name) || "-"}   ${slackEscape(s.customer_details?.email) || ""}   ${slackEscape(s.customer_details?.phone) || ""}`,
      `*Deliver to:* ${slackEscape([addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")) || "-"}`,
      `*Assembly:* ${slackEscape(m.assembly || "standard")}`,
      `*Parts:*\n${parts.map((n) => "- " + slackEscape(n)).join("\n")}`,
      "*Next:* order the parts today (Best Buy prices were confirmed at checkout), email the customer to schedule delivery.",
    ];
    await postSlack(lines.join("\n"));
  } else if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const m = s.metadata || {};
    const build = BUILDS[m.build]?.name || m.build || "build";
    const paid = formatUSD(s.amount_total ?? 0);
    const balance = Number(m.balance_cents || 0);
    const addr = s.collected_information?.shipping_details?.address || s.customer_details?.address || {};
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
