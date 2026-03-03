// ═══════════════════════════════════════════════════════════════
// WELCOME EMAIL — Fires after any payment webhook onboards a client
// Attach as step after 06_paddle_webhook / 07_goat_webhook / 08_crypto_webhook
// Props: sendgrid (SendGrid app)
// Env vars: SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME, DASHBOARD_URL
// ═══════════════════════════════════════════════════════════════

export default defineComponent({
  props: {
    sendgrid: { type: "app", app: "sendgrid" },
  },
  async run({ steps, $ }) {
    const prev =
      steps.step_paddle?.$return_value  ||
      steps.step_goat?.$return_value    ||
      steps.step_crypto?.$return_value  ||
      Object.values(steps).find(s => s?.$return_value?.api_key)?.$return_value;

    if (!prev?.api_key) return { skipped: true };

    const { email, api_key, tier, client_id } = prev;

    const features = {
      starter: [
        "Daily automated regulatory monitoring (UAE + US)",
        "AI-powered risk scoring across 5 agents",
        "Email alerts for CRITICAL and HIGH risk events",
        "On-demand project compliance scans",
        "Dashboard access — last 10 analyses",
      ],
      professional: [
        "Daily automated regulatory monitoring (UAE + US)",
        "AI-powered risk scoring across 5 agents",
        "Instant alerts for ALL risk levels",
        "Unlimited on-demand project scans",
        "Full document generation (Disclaimer, Risk, Privacy, Terms)",
        "Dashboard access — full history",
        "Priority analysis queue",
      ],
    };

    const featureList = (features[tier] || features.starter)
      .map(f => `<li style="padding:5px 0;color:#d0d0e0;font-size:13px;">✓ &nbsp;${f}</li>`)
      .join("");

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0f;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;background:#111118;border:1px solid rgba(255,255,255,0.08);">
  <div style="background:#0a0a0f;padding:28px 32px;border-bottom:1px solid rgba(200,169,110,0.3);">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c8a96e;margin-bottom:6px;">Regulatory Intelligence Platform</div>
    <div style="font-size:28px;font-weight:900;color:#f0f0f8;letter-spacing:2px;">CryptoReg Monitor</div>
  </div>
  <div style="padding:32px;">
    <p style="color:#9090a8;font-size:13px;margin:0 0 6px;">Your <strong style="color:#e8c98a">${tier.charAt(0).toUpperCase()+tier.slice(1)}</strong> subscription is now active.</p>
    <p style="color:#f0f0f8;font-size:16px;font-weight:600;margin:0 0 24px;">Welcome aboard. The system is monitoring on your behalf — automatically.</p>
    <ul style="list-style:none;margin:0 0 24px;padding:16px;background:#1a1a24;border-radius:8px;">${featureList}</ul>
    <div style="background:#0a0a0f;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px;margin-bottom:24px;">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#55556a;margin-bottom:8px;">Your API Key</div>
      <div style="font-family:monospace;font-size:12px;color:#33dd88;word-break:break-all;">${api_key}</div>
      <p style="color:#55556a;font-size:11px;margin:10px 0 0;">Keep this private. Used to access your dashboard.</p>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.DASHBOARD_URL}?api_key=${api_key}" style="display:inline-block;background:linear-gradient(135deg,#c8a96e,#9a7030);color:#0a0a0f;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:15px;letter-spacing:1px;">OPEN DASHBOARD</a>
    </div>
  </div>
  <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0;font-size:11px;color:#55556a;">Client ID: ${client_id}</p>
  </div>
</div></body></html>`;

    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.sendgrid.$auth.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: process.env.SENDGRID_FROM_EMAIL, name: process.env.SENDGRID_FROM_NAME || "CryptoReg Monitor" },
        subject: "Your CryptoReg Monitor subscription is active",
        content: [{ type: "text/html", value: html }],
      }),
    });

    return { welcome_sent: true, recipient: email };
  },
});
