import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    // Format the Slack message
    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Error in Once Upon a Drawing",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Type:*\n${record.error_type || "Unknown"}`,
            },
            {
              type: "mrkdwn",
              text: `*Time:*\n${new Date(record.created_at).toLocaleString()}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n${record.error_message || "No message"}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Context:*\n\`\`\`${JSON.stringify(record.context, null, 2) || "None"}\`\`\``,
          },
        },
      ],
    };

    // Send to Slack
    const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (!slackUrl) {
      throw new Error("SLACK_WEBHOOK_URL not configured");
    }

    const slackResponse = await fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    if (!slackResponse.ok) {
      throw new Error(`Slack responded with ${slackResponse.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending to Slack:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});