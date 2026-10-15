// Posts a message to the #frame-foundry-leads Slack channel through an incoming webhook.
// SLACK_WEBHOOK_URL is set in Netlify -> Project configuration -> Environment variables.
// Without it, messages are written to the function log instead, so nothing breaks.
export async function postSlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.log("[slack disabled - SLACK_WEBHOOK_URL not set]\n" + text);
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, unfurl_links: false }),
    });
    if (!res.ok) console.error("Slack webhook failed:", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("Slack webhook error:", err);
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
