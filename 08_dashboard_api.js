// ═══════════════════════════════════════════════════════════════
// DASHBOARD API — Secure endpoint for the Netlify frontend
// Pipedream Workflow: HTTP GET trigger
// Query: ?api_key=xxx&limit=20&offset=0
// Query: ?api_key=xxx&run_id=run_xxx  (single record)
// Props: clients_store (Data Store), results_store (Data Store)
// Env: DASHBOARD_URL
// ═══════════════════════════════════════════════════════════════

export default defineComponent({
  props: {
    clients_store: { type: "data_store" },
    results_store: { type: "data_store" },
  },
  async run({ steps, $ }) {
    const q = steps.trigger.event.query || {};
    const { api_key, run_id, limit = "20", offset = "0" } = q;

    const CORS = process.env.DASHBOARD_URL || "*";

    if (!api_key) {
      await $.respond({ status: 401, headers: { "Access-Control-Allow-Origin": CORS }, body: { error: "api_key required" } });
      return $.flow.exit();
    }

    const client_id = await this.clients_store.get(`apikey:${api_key}`);
    if (!client_id) {
      await $.respond({ status: 401, headers: { "Access-Control-Allow-Origin": CORS }, body: { error: "Invalid API key" } });
      return $.flow.exit();
    }

    const client = await this.clients_store.get(client_id);
    if (!client || client.status !== "active") {
      await $.respond({ status: 403, headers: { "Access-Control-Allow-Origin": CORS }, body: { error: "Inactive subscription" } });
      return $.flow.exit();
    }

    const clientSafe = {
      client_id:          client.client_id,
      company_name:       client.company_name,
      tier:               client.tier,
      status:             client.status,
      jurisdiction_focus: client.jurisdiction_focus,
      analyses_count:     client.analyses_count || 0,
    };

    // Single record
    if (run_id) {
      const record = await this.results_store.get(run_id);
      if (!record || record.client_id !== client_id) {
        await $.respond({ status: 404, headers: { "Access-Control-Allow-Origin": CORS }, body: { error: "Not found" } });
        return $.flow.exit();
      }
      await $.respond({
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": CORS, "Cache-Control": "no-store" },
        body: { client: clientSafe, record },
      });
      return;
    }

    // Paginated list
    const index   = (await this.results_store.get(`index:${client_id}`)) || [];
    const pg      = Math.min(parseInt(limit), 20);
    const off     = parseInt(offset);
    const pageIds = index.slice(off, off + pg);
    const records = (await Promise.all(pageIds.map(id => this.results_store.get(id)))).filter(Boolean);

    await $.respond({
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": CORS, "Cache-Control": "no-store" },
      body: {
        client: clientSafe,
        pagination: { total: index.length, limit: pg, offset: off, has_more: off + pg < index.length },
        runs: records,
      },
    });
  },
});
