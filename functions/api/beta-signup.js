export async function onRequestPost({ request, env, cf }) {
  try {
    if (!env.BETA_KV) {
      return json({ ok: false, error: "Server misconfiguration: missing BETA_KV" }, 500);
    }

    const fd = await request.formData();

    const email = String(fd.get("email") || "").trim().toLowerCase();
    const category = String(fd.get("category") || "").trim().toLowerCase();
    const consent = String(fd.get("consent") || "").trim().toLowerCase();

    if (!email || !category) return json({ ok: false, error: "Missing required fields" }, 400);
    if (!isValidEmail(email)) return json({ ok: false, error: "Invalid email" }, 400);

    const allowed = new Set(["android", "ios", "google"]);
    if (!allowed.has(category)) return json({ ok: false, error: "Invalid category" }, 400);

    // checkbox sends "on"
    if (consent !== "on" && consent !== "true" && consent !== "1") {
      return json({ ok: false, error: "Consent is required" }, 400);
    }

    const max = Number(env.BETA_MAX || 100);
    const listKey = "beta:list:v1";

    const currentRaw = await env.BETA_KV.get(listKey);
    const list = currentRaw ? safeJsonParse(currentRaw, []) : [];

    const existingIdx = list.findIndex((x) => (x?.email || "") === email);

    const record = {
      email,
      category,
      ts: new Date().toISOString(),
      country: cf?.country || null,
      ua: request.headers.get("user-agent") || null,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...record };
    } else {
      if (list.length >= max) {
        return json({ ok: false, error: "Beta list is full", full: true, max }, 409);
      }
      list.push(record);
    }

    await env.BETA_KV.put(listKey, JSON.stringify(list));

    return json({ ok: true, stored: true, total: list.length }, 200);
  } catch {
    return json({ ok: false, error: "Server error" }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function safeJsonParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
