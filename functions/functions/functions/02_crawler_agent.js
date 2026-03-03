// ═══════════════════════════════════════════════════════════════
// CRAWLER AGENT — Scans project URL for compliance assets
// Pipedream Workflow: HTTP POST trigger, path: /agent-crawler
// Props needed: openai (OpenAI app)
// ═══════════════════════════════════════════════════════════════
import { OpenAI } from "openai";

export default defineComponent({
  props: {
    openai: { type: "app", app: "openai" },
  },
  async run({ steps, $ }) {
    const { run_id, project_url, project_name } = steps.trigger.event.body;

    let pageContent = "";
    try {
      const res = await fetch(project_url, {
        headers: { "User-Agent": "ComplianceBot/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      const html = await res.text();
      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10000);
    } catch (err) {
      pageContent = `Could not fetch page: ${err.message}`;
    }

    const ai = new OpenAI({ apiKey: this.openai.$auth.api_key });

    const resp = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a compliance asset auditor for crypto projects operating in UAE (VARA, CBUAE, ADGM) and US (SEC, FinCEN, CFTC) jurisdictions.
Analyze website content and identify presence or absence of key compliance assets.
Output ONLY valid JSON. No markdown, no explanation.`,
        },
        {
          role: "user",
          content: `Project: ${project_name || project_url}
URL: ${project_url}

Website content:
---
${pageContent}
---

Return this exact JSON schema:
{
  "asset_risk_score": <integer 1-10, 10=highest risk>,
  "assets_found": {
    "whitepaper": <true|false>,
    "disclaimer": <true|false>,
    "risk_disclosure": <true|false>,
    "privacy_policy": <true|false>,
    "terms_of_use": <true|false>,
    "audit_report": <true|false>,
    "kyc_aml_policy": <true|false>,
    "legal_entity_disclosed": <true|false>,
    "regulatory_registration": <true|false>,
    "contact_information": <true|false>
  },
  "missing_critical": ["list of critically missing compliance assets"],
  "detected_jurisdictions": ["list of jurisdictions referenced on site"],
  "red_flags": ["list of specific compliance red flags found"],
  "crawl_summary": "2-3 sentence compliance asset summary",
  "recommended_actions": ["actionable steps to address missing assets"]
}`,
        },
      ],
    });

    const result = JSON.parse(resp.choices[0].message.content);
    await $.respond({ status: 200, body: { agent: "crawler", run_id, ...result } });
  },
});
