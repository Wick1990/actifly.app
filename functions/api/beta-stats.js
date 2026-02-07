export async function onRequestGet({ env }) {
  try {
    const listKey = "beta:list:v1";
    const raw = (await env.BETA_KV.get(listKey)) || "[]";
    const list = safeJsonParse(raw, []);

    const counts = { total: 0, android: 0, ios: 0, google: 0 };
    for (const r of list) {
      counts.total++;
      const c = (r?.category || "").toLowerCase();
      if (c === "android") counts.android++;
      else if (c === "ios") counts.ios++;
      else if (c === "google") counts.google++;
    }

    return json({ ok: true, counts, max: Number(env.BETA_MAX || 100) }, 200);
  } catch {
    return json({ ok: false }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function safeJsonParse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }
