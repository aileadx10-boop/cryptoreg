// ═══════════════════════════════════════════════════════════════
// GENERATOR AGENT — Produces 4 compliance document drafts
// Pipedream Workflow: HTTP POST trigger, path: /agent-generator
// Output: Disclaimer, Risk Disclosure, Privacy Policy, Terms of Use
// Props needed: openai (OpenAI app), results_store (Data Store)
// ═══════════════════════════════════════════════════════════════
import { OpenAI } from "openai";

export default defineComponent({
  props: {
    openai:        { type: "app",        app: "openai" },
    results_store: { type: "data_store"                },
  },
  async run({ steps, $ }) {
    const { run_id, project_url, project_name } = steps.trigger.event.body;

    // Pull findings from earlier agents for context
    let crawlerData = {}, tokenomicsData = {}, contentData = {};
    try {
      const record    = await this.results_store.get(run_id);
      crawlerData     = record?.result_crawler    || {};
      tokenomicsData  = record?.result_tokenomics || {};
      contentData     = record?.result_content    || {};
    } catch (_) {}

    const ai = new OpenAI({ apiKey: this.openai.$auth.api_key });

    const CONTEXT = `
Project: ${project_name || project_url}
URL: ${project_url}
Token type: ${tokenomicsData.token_type || "unknown"}
SEC Howey risk: ${tokenomicsData.sec_howey_risk || "unknown"}
Staking present: ${tokenomicsData.staking_detected ? "yes" : "no"}
Missing compliance assets: ${(crawlerData.missing_critical || []).join(", ") || "unknown"}
Content red flags: ${(contentData.red_flags || []).map(f => f.issue).join("; ") || "none identified"}
Jurisdictions: UAE (VARA, CBUAE, ADGM, DIFC) and United States (SEC, CFTC, FinCEN)
    `.trim();

    const SYSTEM = "You are a crypto regulatory lawyer drafting compliance documents for UAE and US jurisdictions. Write professional, legally protective documents. Use numbered sections. No markdown headers.";

    const documents = {};

    // ── 1. Disclaimer ─────────────────────────────────────────
    const r1 = await ai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.2, max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user",   content: `Draft a DISCLAIMER for this crypto project.\nContext: ${CONTEXT}\nCover: not-financial-advice, no guarantees of returns, regulatory status, token not a security (if applicable), jurisdictional restrictions (UAE and US), forward-looking statements warning.\nLength: 250-350 words.` },
      ],
    });
    documents.disclaimer = r1.choices[0].message.content.trim();

    // ── 2. Risk Disclosure ────────────────────────────────────
    const r2 = await ai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.2, max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user",   content: `Draft a RISK DISCLOSURE STATEMENT for this crypto project.\nContext: ${CONTEXT}\nCover: market volatility, liquidity risk, regulatory risk (VARA, SEC/CFTC), technology/smart contract risk, loss of capital${tokenomicsData.staking_detected ? ", staking and yield risks" : ""}, jurisdiction-specific restrictions.\nFormat: numbered risk factors.\nLength: 300-400 words.` },
      ],
    });
    documents.risk_disclosure = r2.choices[0].message.content.trim();

    // ── 3. Privacy Policy ─────────────────────────────────────
    const r3 = await ai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.2, max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user",   content: `Draft a PRIVACY POLICY for this crypto project.\nContext: ${CONTEXT}\nCover: data collection, KYC/AML data handling, UAE PDPL compliance, CCPA reference, data retention, user rights, third-party sharing, cookies, contact for data requests.\nLength: 350-450 words.` },
      ],
    });
    documents.privacy_policy = r3.choices[0].message.content.trim();

    // ── 4. Terms of Use ───────────────────────────────────────
    const r4 = await ai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.2, max_tokens: 1000,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user",   content: `Draft TERMS OF USE for this crypto project.\nContext: ${CONTEXT}\nCover: eligibility (age, jurisdiction), prohibited uses, IP rights, limitation of liability, indemnification, governing law (UAE DIFC or applicable US state), dispute resolution, amendments clause, jurisdictional restrictions for sanctioned countries.\nLength: 400-500 words.` },
      ],
    });
    documents.terms_of_use = r4.choices[0].message.content.trim();

    const result = {
      agent: "generator",
      run_id,
      generated_at: new Date().toISOString(),
      documents,
      generation_notes: [
        "All documents are AI-generated drafts — review by qualified legal counsel required before publishing",
        "Tailored for UAE (VARA/CBUAE/DIFC) and US (SEC/CFTC/FinCEN) jurisdictions",
        "Replace any [BRACKETED] placeholders before use",
      ],
    };

    await $.respond({ status: 200, body: result });
  },
});
