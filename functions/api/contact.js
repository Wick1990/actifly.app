export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    const { email, category, subject, message } = data;

    if (!email || !category || !message) {
      return new Response("Invalid request", { status: 400 });
    }

    const content = `
New ActiFly contact request

From: ${email}
Category: ${category}
Subject: ${subject || "(none)"}

Message:
${message}
    `;

    await sendZohoMail(env, content, email, subject);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
}

async function sendZohoMail(env, content, replyTo, subject) {
  const res = await fetch("https://api.zeptomail.eu/v1.1/email", {
    method: "POST",
    headers: {
      "Authorization": `Zoho-enczapikey ${env.ZOHO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { address: "support@actifly.app" },
      to: [{ email_address: { address: "support@actifly.app" } }],
      reply_to: [{ address: replyTo }],
      subject: subject || "New Contact Request",
      textbody: content,
    }),
  });

  if (!res.ok) {
    throw new Error("Zoho mail failed");
  }
}
