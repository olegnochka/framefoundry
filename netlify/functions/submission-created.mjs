// Netlify runs this automatically for every verified form submission (Netlify Forms "submission-created" event).
// Posts new quote requests to #frame-foundry-leads. Spam-flagged submissions never reach this function.
import { postSlack, slackEscape } from "./lib/slack.mjs";

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body || "{}").payload || {};
  } catch {
    return { statusCode: 400, body: "bad payload" };
  }
  if (payload.form_name !== "quote") return { statusCode: 200, body: "ignored" };

  const d = payload.data || {};
  const addons = Array.isArray(d.addons) ? d.addons.join(", ") : d.addons;
  const field = (label, value) => (value ? `*${label}:* ${slackEscape(value)}` : null);
  const lines = [
    ":clipboard: *New quote request* - framefoundrypc.com",
    field("Name", d.name),
    [field("Email", d.email), field("Phone", d.phone), field("ZIP", d.delivery_zip)].filter(Boolean).join("   "),
    [field("Wants", d.request_type), field("Budget", d.budget)].filter(Boolean).join("   "),
    field("Games / use", d.games),
    [field("Resolution", d.resolution), field("Noise", d.noise), field("Needed by", d.deadline)].filter(Boolean).join("   "),
    field("Looks", d.aesthetics),
    field("Add-ons", addons),
    field("Heard about us", d.heard_about_us),
    field("Notes", d.notes),
    "_Quote within 24 hours (PCPartPicker list + Newegg prices, valid 72 hours) and log it in the Leads Tracker._",
  ].filter(Boolean);
  await postSlack(lines.join("\n"));
  return { statusCode: 200, body: "ok" };
};
