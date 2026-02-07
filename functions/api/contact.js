export async function onRequestPost({ request, env }) {
  try {
    if (!env.ZOHO_API_KEY) {
      return new Response("Server misconfiguration: missing ZOHO_API_KEY", { status: 500 });
    }

    const fd = await request.formData();

    const email = String(fd.get("email") || "").trim();
    const category = String(fd.get("category") || "").trim();
    const subject = String(fd.get("subject") || "").trim();
    const message = String(fd.get("message") || "").trim();

    if (!email || !category || !message) {
      return new Response("Missing required fields", { status: 400 });
    }

    // --- attachments ---
    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]);

    const MAX_FILES = 3;
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB each

    const files = fd.getAll("attachments").filter((x) => x instanceof File);
    if (files.length > MAX_FILES) {
      return new Response(`Too many files (max ${MAX_FILES})`, { status: 400 });
    }

    const attachments = [];
    for (const file of files) {
      if (!allowed.has(file.type)) {
        return new Response(`Unsupported file type: ${file.type || "unknown"}`, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return new Response(`File too large: ${file.name}`, { status: 400 });
      }

      const ab = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(ab);

      attachments.push({
        name: file.name || "attachment",
        mime_type: file.type,
        content: b64,
      });
    }

    const textbody =
`New ActiFly contact request

From: ${email}
Category: ${category}
Subject: ${subject || "(none)"}

Message:
${message}
`;

    // Absender klar als Formular (wie du wolltest)
    const fromAddress = "webrequest@actifly.app";
    const fromName = "Web Request";

    const payload = {
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: "support@actifly.app", name: "ActiFly Support" } }],
      reply_to: [{ address: email }],
      subject: subject
        ? `[${category}] ${subject}`
        : `[${category}] New contact request`,
      textbody,
      ...(attachments.length ? { attachments } : {}),
    };

    const resp = await fetch("https://api.zeptomail.eu/v1.1/email", {
      method: "POST",
      headers: {
        Authorization: `Zoho-enczapikey ${env.ZOHO_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const out = await resp.text();

    if (!resp.ok) {
      return new Response(`ZeptoMail error (${resp.status}): ${out}`, { status: 502 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
}

function arrayBufferToBase64(ab) {
  let binary = "";
  const bytes = new Uint8Array(ab);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
