// ═══════════════════════════════════════════════════════════════
// NETLIFY FUNCTION — netlify/functions/api.js
// Secure proxy: browser never touches Pipedream directly
// Netlify env vars needed:
//   PIPEDREAM_API_URL       — your Dashboard API workflow URL
//   PIPEDREAM_SCAN_URL      — your Orchestrator workflow URL
//   INTERNAL_API_SECRET     — random 32-char string, set in both
//                             Netlify AND Pipedream env vars
// ═══════════════════════════════════════════════════════════════

export default async (req, context) => {
  const url    = new URL(req.url);
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
      },
    });
  }

  // Read API key from header (never from URL)
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json({ error: "x-api-key header required" }, { status: 401 });
  }

  const PIPEDREAM_API_URL  = process.env.PIPEDREAM_API_URL;
  const PIPEDREAM_SCAN_URL = process.env.PIPEDREAM_SCAN_URL;

  if (!PIPEDREAM_API_URL || !PIPEDREAM_SCAN_URL) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // ── GET /api — fetch runs list ─────────────────────────────
  if (method === "GET") {
    const limit  = url.searchParams.get("limit")  || "20";
    const offset = url.searchParams.get("offset") || "0";
    const run_id = url.searchParams.get("run_id") || "";

    const params = new URLSearchParams({ api_key: apiKey, limit, offset });
    if (run_id) params.set("run_id", run_id);

    const upstream = await fetch(`${PIPEDREAM_API_URL}?${params}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    const data = await upstream.json();
    return Response.json(data, {
      status: upstream.status,
      headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
    });
  }

  // ── POST /api — start a new scan ──────────────────────────
  if (method === "POST") {
    let body;
    try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { project_url, project_name } = body;
    if (!project_url) return Response.json({ error: "project_url required" }, { status: 400 });

    // Resolve client_id from api_key via the dashboard API
    const clientRes = await fetch(`${PIPEDREAM_API_URL}?api_key=${encodeURIComponent(apiKey)}&limit=1`);
    if (!clientRes.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clientData = await clientRes.json();
    const client_id  = clientData.client?.client_id;
    if (!client_id)  return Response.json({ error: "Client not found" }, { status: 401 });

    const scanRes = await fetch(PIPEDREAM_SCAN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id, project_url, project_name }),
      signal: AbortSignal.timeout(120000),
    });

    const scanData = await scanRes.json();
    return Response.json(scanData, {
      status: scanRes.status,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config = { path: "/api" };
