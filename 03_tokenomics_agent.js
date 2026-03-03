// ═══════════════════════════════════════════════════════════════
// TOKENOMICS AGENT — Analyzes token mechanics & regulatory risk
// Pipedream Workflow: HTTP POST trigger, path: /agent-tokenomics
// Props needed: openai (OpenAI app)
// ═══════════════════════════════════════════════════════════════
import { OpenAI } from "openai";

export default defineComponent({
  props: {
    openai: { type: "app", app: "openai" },
  },
  async run({ steps, $ }) {
    const { run_id, project_url, project_name } = steps.trigger.event.body;

    let tokenomicsContent = "";
    const pagesToTry = [
      project_url,
      `${project_url}/tokenomics`,
      `${project_url}/token`,
      `${project_url}/whitepaper`,
    ];

    for (const url of pagesToTry) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "ComplianceBot/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000);
        if (text.length > 200) {
          tokenomicsContent += `\n[Source: ${url}]\n${text}\n`;
          if (tokenomicsContent.length > 8000) break;
        }
      } catch (_) {}
    }

    if (!tokenomicsContent) {
      tokenomicsContent = "No tokenomics content could be fetched from the project URL.";
    }

    const ai = new OpenAI({ apiKey: this.openai.$auth.api_key });

    const resp = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a tokenomics risk analyst specializing in UAE (VARA, CBUAE) and US (SEC, CFTC, FinCEN) regulatory frameworks.
Analyze token structure and mechanics for regulatory and investor risk.
Output ONLY valid JSON. No markdown.`,
        },
        {
          role: "user",
          content: `Project: ${project_name || project_url}

Tokenomics data:
---
${tokenomicsContent}
---

Return this exact JSON schema:
{
  "risk_score": <integer 1-10>,
  "risk_rating": "HIGH" | "MEDIUM" | "LOW",
  "token_type": "utility" | "security" | "governance" | "payment" | "unclear",
  "sec_howey_risk": "HIGH" | "MEDIUM" | "LOW",
  "staking_detected": <true|false>,
  "apy_claims": <true|false>,
  "apy_values_found": ["list of any APY/yield % values found"],
  "supply_details": {
    "total_supply_disclosed": <true|false>,
    "allocation_transparent": <true|false>,
    "vesting_schedule_present": <true|false>,
    "insider_allocation_risk": "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
  },
  "utility_analysis": {
    "clear_utility_defined": <true|false>,
    "utility_description": "brief description or null",
    "speculative_language_detected": <true|false>
  },
  "regulatory_risk_factors": ["list of specific tokenomics regulatory risks"],
  "tokenomics_summary": "2-3 sentence analyst summary",
  "recommended_disclosures": ["list of disclosures needed for UAE/US compliance"]
}`,
        },
      ],
    });

    const result = JSON.parse(resp.choices[0].message.content);
    await $.respond({ status: 200, body: { agent: "tokenomics", run_id, ...result } });
  },
});
