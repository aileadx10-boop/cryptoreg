// ═══════════════════════════════════════════════════════════════
// ORCHESTRATOR AGENT — Super-Agent / Pipeline Manager
// Pipedream Workflow: HTTP POST trigger
// Body: { client_id, project_url, project_name }
// Props needed: clients_store (Data Store), results_store (Data Store)
// Env vars needed: PIPEDREAM_BASE_URL
// ═══════════════════════════════════════════════════════════════

export default defineComponent({
  props: {
    clients_store: { type: "data_store" },
    results_store: { type: "data_store" },
  },
  async run({ steps, $ }) {
    const { client_id, project_url, project_name } = steps.trigger.event.body;

    if (!client_id || !project_url) {
      await $.respond({ status: 400, body: { error: "client_id and project_url required" } });
      return $.flow.exit();
    }

    const client = await this.clients_store.get(client_id);
    if (!client || client.status !== "active") {
      await $.respond({ status: 403, body: { error: "Unauthorized" } });
      return $.flow.exit();
    }

    const run_id     = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const started_at = new Date().toISOString();

    await this.results_store.set(run_id, {
      run_id, client_id, project_url,
      project_name: project_name || project_url,
      status: "running", started_at,
      agents_completed: [],
    });

    const BASE   = process.env.PIPEDREAM_BASE_URL;
    const agents = [
      { name: "crawler",    path: "/agent-crawler"    },
      { name: "tokenomics", path: "/agent-tokenomics" },
      { name: "content",    path: "/agent-content"    },
      { name: "generator",  path: "/agent-generator"  },
    ];

    const results = {}, errors = {};

    for (const agent of agents) {
      try {
        const res = await fetch(`${BASE}${agent.path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id, client_id, project_url, project_name }),
          signal: AbortSignal.timeout(55000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        results[agent.name] = await res.json();

        const cur = await this.results_store.get(run_id);
        await this.results_store.set(run_id, {
          ...cur,
          agents_completed: [...cur.agents_completed, agent.name],
          [`result_${agent.name}`]: results[agent.name],
        });
      } catch (err) {
        errors[agent.name] = err.message;
        console.error(`Agent ${agent.name} failed:`, err.message);
      }
    }

    const s1 = results.crawler?.asset_risk_score           || 0;
    const s2 = results.tokenomics?.risk_score               || 0;
    const s3 = results.content?.marketing_caution_score     || 0;
    const compositeScore = Math.round((s1 + s2 + s3) / 3);
    const overallRisk    = compositeScore >= 8 ? "CRITICAL"
                         : compositeScore >= 6 ? "HIGH"
                         : compositeScore >= 4 ? "MEDIUM" : "LOW";

    const finalRecord = {
      run_id, client_id, project_url,
      project_name: project_name || project_url,
      status: "completed",
      started_at,
      completed_at: new Date().toISOString(),
      overall_risk: overallRisk,
      composite_score: compositeScore,
      agents_completed: Object.keys(results),
      agents_failed: Object.keys(errors),
      errors,
      crawler:    results.crawler    || null,
      tokenomics: results.tokenomics || null,
      content:    results.content    || null,
      generator:  results.generator  || null,
    };

    await this.results_store.set(run_id, finalRecord);

    const idx = (await this.results_store.get(`index:${client_id}`)) || [];
    await this.results_store.set(`index:${client_id}`, [run_id, ...idx].slice(0, 50));

    await $.respond({ status: 200, body: finalRecord });
  },
});
