export async function onRequestGet({ request, env }) {
  try {
    if (!env.BETA_KV) return new Response("Server misconfiguration: missing BETA_KV", { status: 500 });
    if (!env.BETA_ADMIN_TOKEN) return new Response("Server misconfiguration: missing BETA_ADMIN_TOKEN", { status: 500 });

    const url = new URL(request.url);

    const auth = request.headers.get("authorization") || "";
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    const token = (bearer || url.searchParams.get("token") || "").trim();

    if (token !== env.BETA_ADMIN_TOKEN) return new Response("Unauthorized", { status: 401 });

    const action = (url.searchParams.get("action") || "stats").toLowerCase();
    const listKey = "beta:list:v1";
    const raw = (await env.BETA_KV.get(listKey)) || "[]";
    const list = safeJsonParse(raw, []);

    if (action === "export") {
      const csv = toCsv(list);
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="actifly-beta-signups.csv"`,
          "cache-control": "no-store",
        },
      });
    }

        if (action === "list") {
      return new Response(JSON.stringify({ ok: true, list }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const counts = { total: 0, android: 0, ios: 0, google: 0 };
    for (const r of list) {
      counts.total++;
      const c = (r?.category || "").toLowerCase();
      if (c === "android") counts.android++;
      else if (c === "ios") counts.ios++;
      else if (c === "google") counts.google++;
    }

    return new Response(JSON.stringify({ ok: true, counts, listKeyVersion: "v1" }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}

function safeJsonParse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

function escCsv(v) {
  const s = String(v ?? "");
  if (/[\n\r,\"]/g.test(s)) return '"' + s.replace(/\"/g, '""') + '"';
  return s;
}

function toCsv(list) {
  const header = ["email", "category", "ts", "country", "ua"].join(",");
  const rows = (list || []).map((r) =>
    [r?.email, r?.category, r?.ts, r?.country, r?.ua].map(escCsv).join(","),
  );
  return [header, ...rows].join("\n");
}
