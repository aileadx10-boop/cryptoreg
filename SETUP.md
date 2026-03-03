# ════════════════════════════════════════════════════════════════
# CRYPTOREG MONITOR — MASTER SETUP GUIDE
# Complete environment variables + deployment checklist
# ════════════════════════════════════════════════════════════════


# ── PIPEDREAM ENVIRONMENT VARIABLES ──────────────────────────────
# Set at: pipedream.com → Project → Environment Variables

OPENAI_API_KEY=sk-...                         # OpenAI API key

PIPEDREAM_BASE_URL=https://...pipedream.net   # Your Pipedream project base URL
                                               # (used by Orchestrator to call sub-agents)

PADDLE_WEBHOOK_SECRET=...                      # Paddle → Developer → Webhooks → Secret
PADDLE_PRICE_STARTER=pri_...                   # Paddle price ID for $199/mo plan
PADDLE_PRICE_PROFESSIONAL=pri_...             # Paddle price ID for $499/mo plan

GOAT_WEBHOOK_SECRET=...                        # GOAT Payments webhook secret
CRYPTO_EXIT_WEBHOOK_SECRET=...                 # Crypto Exit webhook secret

SENDGRID_FROM_EMAIL=alerts@yourdomain.com     # Verified sender
SENDGRID_FROM_NAME=CryptoReg Monitor          # Sender display name

DASHBOARD_URL=https://your-site.netlify.app   # Your Netlify URL (fill after deploy)


# ── NETLIFY ENVIRONMENT VARIABLES ────────────────────────────────
# Set at: netlify.com → Site → Environment Variables

PIPEDREAM_API_URL=https://...pipedream.net/dashboard-api   # Workflow 8 URL
PIPEDREAM_SCAN_URL=https://...pipedream.net/orchestrator   # Workflow 1 URL


# ── NETLIFY index.html — ONE PLACEHOLDER TO REPLACE ──────────────
# Find this line in index.html and replace:
#   const PAD = 'REPLACE_WITH_PADDLE_CHECKOUT_URL';
# with your actual Paddle checkout base URL.


# ════════════════════════════════════════════════════════════════
# PIPEDREAM WORKFLOWS — 8 TOTAL
# ════════════════════════════════════════════════════════════════
#
# WORKFLOW 1 — Orchestrator
#   File:     pipedream/agents/01_orchestrator.js
#   Trigger:  HTTP POST
#   Path:     /orchestrator
#   Props:    clients_store, results_store
#   Env:      PIPEDREAM_BASE_URL
#
# WORKFLOW 2 — Crawler Agent
#   File:     pipedream/agents/02_crawler_agent.js
#   Trigger:  HTTP POST
#   Path:     /agent-crawler
#   Props:    openai
#
# WORKFLOW 3 — Tokenomics Agent
#   File:     pipedream/agents/03_tokenomics_agent.js
#   Trigger:  HTTP POST
#   Path:     /agent-tokenomics
#   Props:    openai
#
# WORKFLOW 4 — Content Agent
#   File:     pipedream/agents/04_content_agent.js
#   Trigger:  HTTP POST
#   Path:     /agent-content
#   Props:    openai
#
# WORKFLOW 5 — Generator Agent
#   File:     pipedream/agents/05_generator_agent.js
#   Trigger:  HTTP POST
#   Path:     /agent-generator
#   Props:    openai, results_store
#
# WORKFLOW 6 — Paddle Webhook (onboarding)
#   File:     pipedream/agents/06_paddle_webhook.js
#   Trigger:  HTTP POST
#   Props:    clients_store
#   Env:      PADDLE_WEBHOOK_SECRET, PADDLE_PRICE_PROFESSIONAL
#   + Attach: 07_welcome_email.js as step 2
#
# WORKFLOW 7 — Welcome Email (step inside Workflow 6)
#   File:     pipedream/agents/07_welcome_email.js
#   Props:    sendgrid
#   Env:      SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME, DASHBOARD_URL
#
# WORKFLOW 8 — Dashboard API
#   File:     pipedream/agents/08_dashboard_api.js
#   Trigger:  HTTP GET
#   Path:     /dashboard-api
#   Props:    clients_store, results_store
#   Env:      DASHBOARD_URL


# ════════════════════════════════════════════════════════════════
# PIPEDREAM DATA STORES — 2 TOTAL
# ════════════════════════════════════════════════════════════════
#
# clients_store   — all client profiles, billing info, API keys
# results_store   — all agent run results, per-client index


# ════════════════════════════════════════════════════════════════
# NETLIFY FILES
# ════════════════════════════════════════════════════════════════
#
# netlify/index.html              — main dashboard
# netlify/netlify.toml            — build + security config
# netlify/functions/api.js        — secure proxy (key in header)


# ════════════════════════════════════════════════════════════════
# DEPLOYMENT CHECKLIST
# ════════════════════════════════════════════════════════════════
#
# STEP 1 — Create accounts (if not done)
#   □ pipedream.com
#   □ openai.com/api (add payment method)
#   □ sendgrid.com (verify sender email)
#   □ netlify.com
#   □ paddle.com
#
# STEP 2 — Pipedream Data Stores
#   □ Create "clients_store"
#   □ Create "results_store"
#
# STEP 3 — Pipedream Connected Apps
#   □ Connect OpenAI account
#   □ Connect SendGrid account
#
# STEP 4 — Create all 8 Pipedream workflows
#   □ For each: New Workflow → HTTP trigger → paste code → deploy
#   □ Copy each endpoint URL to a text file
#
# STEP 5 — Set Pipedream env vars (list above)
#   □ All variables filled in
#
# STEP 6 — Paddle setup
#   □ Create Starter ($199/mo) and Professional ($499/mo) products
#   □ Enable Apple Pay
#   □ Add webhook → Workflow 6 URL
#   □ Subscribe to: subscription.activated, transaction.completed
#   □ Copy webhook secret → PADDLE_WEBHOOK_SECRET
#
# STEP 7 — Edit index.html
#   □ Replace: REPLACE_WITH_PADDLE_CHECKOUT_URL
#
# STEP 8 — Deploy to Netlify
#   □ Drag netlify/ folder to netlify.com/drop
#   □ Copy Netlify URL
#   □ Set DASHBOARD_URL in Pipedream env vars
#   □ Set PIPEDREAM_API_URL + PIPEDREAM_SCAN_URL in Netlify env vars
#
# STEP 9 — End-to-end test
#   □ Simulate Paddle payment → check clients_store → check welcome email
#   □ Log in to dashboard with API key from welcome email
#   □ Run scan on a test URL → pipeline progresses → results appear
#   □ Open result → check all 5 tabs → copy a generated document
#
# DONE — System is live and fully automated.
