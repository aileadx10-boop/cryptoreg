// ═══════════════════════════════════════════════════════════════
// CONTENT AGENT — Marketing language compliance scanner
// Pipedream Workflow: HTTP POST trigger, path: /agent-content
// Returns: Marketing Caution Score 1-10 + Red/Yellow/Green flags
// Props needed: openai (OpenAI app)
// ═══════════════════════════════════════════════════════════════
import { OpenAI } from "openai";

export default defineComponent({
  props: {
    openai: { type: "app", app: "openai" },
  },
  async run({ steps, $ }) {
    const { run_id, project_url, project_name } = steps.trigger.event.body;

    let siteContent = "";
    try {
      const res = await fetch(project_url, {
        headers: { "User-Agent": "ComplianceBot/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      const html = await res.text();
      siteContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 9000);
    } catch (err) {
      siteContent = `Could not fetch: ${err.message}`;
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
          content: `You are a financial marketing compliance auditor trained in FCA, SEC, CFTC, VARA, and CBUAE marketing regulations for crypto projects.
Identify problematic, misleading, or non-compliant marketing language.
RED flags = must fix immediately (regulatory violation risk).
YELLOW flags = needs review and possible rewording.
GREEN flags = compliant positive signals.
Output ONLY valid JSON.`,
        },
        {
          role: "user",
          content: `Project: ${project_name || project_url}
URL: ${project_url}

Website marketing content:
---
${siteContent}
---

Return this exact JSON schema:
{
  "marketing_caution_score": <integer 1-10, 10=highest caution needed>,
  "overall_verdict": "COMPLIANT" | "REVIEW_NEEDED" | "NON_COMPLIANT",
  "red_flags": [
    {
      "issue": "description of the problem",
      "quote": "exact or paraphrased problematic text found",
      "regulation_violated": "e.g. SEC Rule 10b-5, VARA Marketing Guidelines",
      "fix_required": "specific remediation action"
    }
  ],
  "yellow_flags": [
    {
      "issue": "description",
      "quote": "text found",
      "recommendation": "how to improve"
    }
  ],
  "green_flags": ["list of compliant positive signals found"],
  "guarantee_language_detected": <true|false>,
  "return_promises_detected": <true|false>,
  "urgency_manipulation_detected": <true|false>,
  "risk_warnings_present": <true|false>,
  "target_audience_concerns": "any concerns about targeting retail/vulnerable investors",
  "content_summary": "2-3 sentence compliance content summary",
  "priority_fixes": ["top 3 highest priority content changes needed"]
}`,
        },
      ],
    });

    const result = JSON.parse(resp.choices[0].message.content);
    await $.respond({ status: 200, body: { agent: "content", run_id, ...result } });
  },
});
