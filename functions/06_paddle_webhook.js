// ═══════════════════════════════════════════════════════════════
// PADDLE WEBHOOK — Client onboarding on payment success
// Pipedream Workflow: HTTP POST trigger
// Env vars: PADDLE_WEBHOOK_SECRET, PADDLE_PRICE_PROFESSIONAL, DASHBOARD_URL
// Props: clients_store (Data Store)
// ═══════════════════════════════════════════════════════════════
import { createHmac, timingSafeEqual } from "crypto";
import { randomUUID, randomBytes }      from "crypto";

export default defineComponent({
  props: {
    clients_store: { type: "data_store" },
  },
  async run({ steps, $ }) {
    const event   = steps.trigger.event;
    const headers = event.headers;
    const rawBody = event.body;

    // ── Validate Paddle signature ──────────────────────────────
    const sig     = headers["paddle-signature"] || "";
    const secret  = process.env.PADDLE_WEBHOOK_SECRET;
    const parts   = Object.fromEntries(sig.split(";").map(p => p.split("=")));
    const payload = `${parts.ts}:${JSON.stringify(rawBody)}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    try {
      if (!timingSafeEqual(Buffer.from(parts.h1, "hex"), Buffer.from(expected, "hex"))) {
        await $.respond({ status: 401, body: { error: "Invalid signature" } });
        return $.flow.exit();
      }
    } catch {
      await $.respond({ status: 401, body: { error: "Signature error" } });
      return $.flow.exit();
    }

    const eventType = rawBody.event_type;
    if (!["subscription.activated", "transaction.completed"].includes(eventType)) {
      await $.respond({ status: 200, body: { received: true } });
      return $.flow.exit(`Ignored: ${eventType}`);
    }

    const data       = rawBody.data;
    const customData = data.custom_data || {};
    const email      = data.customer?.email || customData.email;
    if (!email) throw new Error("No email in Paddle event");

    const client_id = customData.client_id || randomUUID();
    const priceId   = data.items?.[0]?.price?.id || "";
    const tier      = priceId === process.env.PADDLE_PRICE_PROFESSIONAL ? "professional" : "starter";
    const api_key   = randomBytes(32).toString("hex");

    const record = {
      client_id, email,
      company_name:       customData.company_name || email.split("@")[1] || "Unknown",
      tier, status: "active", api_key,
      billing_provider:   "paddle",
      paddle_subscription_id: data.subscription_id || data.id,
      jurisdiction_focus: customData.jurisdiction  || "UAE+US",
      business_type:      customData.business_type || "crypto_payment_processor",
      created_at:         new Date().toISOString(),
      analyses_count:     0,
    };

    await this.clients_store.set(client_id,      record);
    await this.clients_store.set(`email:${email}`, client_id);
    await this.clients_store.set(`apikey:${api_key}`, client_id);

    const idx = (await this.clients_store.get("clients_index")) || [];
    if (!idx.includes(client_id)) {
      await this.clients_store.set("clients_index", [...idx, client_id]);
    }

    return { client_id, email, tier, api_key, action: "client_onboarded" };
  },
});
