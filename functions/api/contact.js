export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json().catch(() => null);
    if (!data) return new Response("Invalid JSON", { status: 400 });

    const email = (data.email || "").trim();
    const category = (data.category || "").trim();
    const subject = (data.subject || "").trim();
    const message = (data.message || "").trim();

    if (!email || !category || !message) {
      return new Response("Missing required fields", { status: 400 });
    }

    if (!env.ZOHO_API_KEY) {
      return new Response("Server misconfiguration: missing ZOHO_API_KEY", { status: 500 });
    }

    const textbody =
`New ActiFly contact request

From: ${email}
Category: ${category}
Subject: ${subject || "(none)"}

Message:
${message}
`;

    // IMPORTANT:
    // This must be a ZeptoMail REST API key ("enczapikey"),
    // NOT the SMTP password/token.
    const resp = await fetch("https://api.zeptomail.eu/v1.1/email", {
      method: "POST",
      headers: {
        "Authorization": 'Zoho-enczapikey yA6KbHtdugTzwToBEklrhsLY9Itm/6to2niy5nuwKcYnKoHliqE53xM5IdayJmHajIfU4q1VY4tAI4u479xdfZFhNtJXLZTGTuv4P2uV48xh8ciEYNYig5ugBbgTFKVNdBInCikxQ/MhWA==',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: "support@actifly.app", name: "ActiFly Support" },
        to: [{ email_address: { address: "support@actifly.app", name: "ActiFly Support" } }],
        reply_to: [{ address: email }],
        subject: subject ? `[${category}] ${subject}` : `[${category}] New contact request`,
        textbody,
      }),
    });

    const out = await resp.text();

    if (!resp.ok) {
      // return upstream error for debugging (kept short)
      return new Response(`ZeptoMail error (${resp.status}): ${out}`, { status: 502 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
}
