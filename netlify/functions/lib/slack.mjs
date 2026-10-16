// Posts a message to #frame-foundry-leads in the Pacific Front Desk Slack workspace through an incoming webhook
// (Slack app "Frame Foundry Alerts", A0CA1GB3YA0).
// SLACK_WEBHOOK_URL is set in Netlify -> Project configuration -> Environment variables.
// Without it, messages are written to the function log instead, so nothing breaks.

// Slack's "Copy" button on the app page copies a whole sample curl command, so pull the hooks.slack.com
// address out of whatever was pasted.
function webhookUrl() {
  const raw = process.env.SLACK_WEBHOOK_URL || "";
  const m = raw.match(/https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/);
  return m ? m[0] : "";
}

export async function postSlack(text) {
  const url = webhookUrl();
  if (!url) {
    console.log("[slack disabled - SLACK_WEBHOOK_URL not set or not a hooks.slack.com URL]\n" + text);
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, unfurl_links: false }),
    });
    const body = await res.text();
    // Logged on every post so delivery problems show up in the Netlify function log (the webhook URL itself is never logged).
    console.log(`Slack webhook response: ${res.status} ${body.slice(0, 100)}`);
    if (!res.ok) console.error("Slack webhook failed:", res.status, body.slice(0, 200));
    return res.ok;
  } catch (err) {
    // Only the error name/message: fetch errors can echo the URL (a secret), so strip anything that looks like one.
    console.error("Slack webhook error:", String(err?.message || err).replace(/https?:\/\/\S+/g, "[url]"));
    return false;
  }
}

// Slack mrkdwn treats &, < and > specially; customer-typed text must not break formatting or ping @channel.
export function slackEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 1500);
}
