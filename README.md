Branded App Licensing System v2.0
Complete Deployable Backend with Mathematical Enforcement
The Deal: Active = 94% to you. Lapsed = 3% to you. Revoked = 0% to you. Past earnings = yours forever.
The Lock: Server-side authority. You control the API, the database, and the payment rail. The licensee controls only a thin client.
Prerequisites
bash
# Check versions (need Node 18+, Git, Vercel CLI)
node -v    # >= 18.0.0
npm -v     # >= 9.0.0
git --version
vercel --version   # if missing: npm i -g vercel
stripe --version   # if missing: npm i -g stripe
Step 1: Clone & Prepare
bash
# Download the complete backend
git clone https://github.com/your-repo/branded-license-system.git
cd branded-license-system

# Or create fresh structure from downloaded files
mkdir branded-license-system
cd branded-license-system
# Copy all files from /license-authority-server and /licensee-app here
Step 2: Deploy License Authority Server (LAS) — Brand Side
The LAS is your server. You control it. The licensee never touches it.
bash
cd license-authority-server

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your real keys:
#   STRIPE_SECRET_KEY=sk_live_xxx
#   STRIPE_WEBHOOK_SECRET=whsec_xxx
#   LICENSE_SECRET=$(openssl rand -base64 48)   # 64 chars, cryptographically secure
#   RESEND_API_KEY=re_xxx
#   BRAND_EMAIL=admin@yourbrand.com
#   NEXT_PUBLIC_APP_URL=https://your-las.vercel.app
#   LAS_API_KEY=$(openssl rand -base64 32)      # Internal API key for licensee communication

# Initialize database
mkdir -p data
npx tsx scripts/migrate.ts

# Seed admin genesis license
npx tsx scripts/seed.ts
# Save the output token to .admin-license.json — this is your master key

# Run integration tests
npx tsx scripts/integration-test.ts
# Expected output: 7 checkmarks, "ALL TESTS PASSED"

# Start local dev server
npm run dev
# Server runs at http://localhost:3000

# Deploy to production
vercel deploy --prod
# Copy the production URL — you'll need it for the licensee app
Step 3: Configure Stripe Connect (Platform Model)
bash
# 1. Go to https://dashboard.stripe.com/connect/overview
# 2. Enable "Platform controls transfers" in Settings
# 3. Set platform fee: 6% (active) / 97% (inactive)
# 4. Create webhook endpoint:
#    URL: https://your-las.vercel.app/api/stripe-webhook
#    Events: payment_intent.succeeded, invoice.paid, invoice.payment_failed,
#            customer.subscription.deleted, charge.dispute.created
# 5. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
# 6. Redeploy: vercel deploy --prod
Step 4: Deploy Licensee App — Buyer Side
The licensee app is a thin client. It proxies everything to your LAS.
bash
cd ../licensee-app

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local:
#   NEXT_PUBLIC_LAS_URL=https://your-las.vercel.app    # Your LAS from Step 2
#   LAS_API_KEY=same_key_from_las_env                  # Must match LAS_API_KEY
#   RESEND_API_KEY=re_xxx                              # Can use same or different
#   NEXT_PUBLIC_APP_URL=https://buyer-app.vercel.app   # Will be set after deploy

# Start local dev server
npm run dev
# Runs at http://localhost:3001

# Deploy to buyer's Vercel account
vercel deploy --prod
# Copy the production URL to NEXT_PUBLIC_APP_URL in .env.local
# Redeploy: vercel deploy --prod
Step 5: Issue First License
bash
# From your terminal (or Postman/curl)

# 1. Create a new licensee
curl -X POST https://your-las.vercel.app/api/admin/issue-license \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_FROM_SEED" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "BUYER_001",
    "email": "buyer@example.com",
    "name": "First Buyer",
    "stripeAccountId": "acct_xxx"
  }'

# Response:
# {
#   "licenseToken": "eyJhbGciOiJIUzI1NiIs...",
#   "buyerId": "BUYER_001",
#   "expiresAt": "2026-07-10T00:00:00Z"
# }

# 2. Buyer stores token in their app
#    - Option A: Environment variable (recommended for server)
#    - Option B: localStorage (for client-side bootstrap)
#    - Option C: Secure vault (HashiCorp, AWS Secrets Manager)
Step 6: Test the Kill Switch
bash
# TEST 1: Verify active license
curl -X POST https://your-las.vercel.app/api/license-verify \
  -H "Content-Type: application/json" \
  -d '{
    "licenseToken": "eyJhbGciOiJIUzI1NiIs...",
    "hardwareFingerprint": "test-device-001"
  }'
# Expected: { "valid": true, "status": "active", "splitRate": { "user": 94, "brand": 6 } }

# TEST 2: Revoke license (kill switch)
curl -X POST https://your-las.vercel.app/api/admin/revoke \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "BUYER_001",
    "reason": "Test revocation"
  }'

# TEST 3: Verify revoked license
curl -X POST https://your-las.vercel.app/api/license-verify \
  -H "Content-Type: application/json" \
  -d '{
    "licenseToken": "eyJhbGciOiJIUzI1NiIs...",
    "hardwareFingerprint": "test-device-001"
  }'
# Expected: { "valid": false, "killSwitch": true, "action": "TERMINATE_IMMEDIATELY" }

# On the licensee app, the bootstrap will:
#   1. Clear all localStorage and sessionStorage
#   2. Delete all IndexedDB databases
#   3. Render the termination screen
#   4. Throw KILL_SWITCH_ACTIVATED error
Step 7: Test Revenue Split
bash
# Create a test payment via Stripe CLI
stripe payment_intents create \
  --amount=1000 \
  --currency=usd \
  --metadata buyer_id=BUYER_001 \
  --confirm \
  --payment-method=pm_card_visa

# Or simulate webhook locally
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Check the LAS dashboard
open https://your-las.vercel.app
# Verify: Revenue Events table shows the split
#   Amount: $10.00
#   User (94%): $9.40
#   Brand (6%): $0.60
Step 8: Test Grace Period
bash
# Simulate payment failure
curl -X POST https://your-las.vercel.app/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invoice.payment_failed",
    "data": {
      "object": {
        "subscription_details": { "metadata": { "buyer_id": "BUYER_001" } }
      }
    }
  }'

# Check status
curl -X POST https://your-las.vercel.app/api/license-verify \
  -H "Content-Type: application/json" \
  -d '{"licenseToken":"...","hardwareFingerprint":"test"}'
# Expected: { "status": "grace", "graceDaysRemaining": 14, "splitRate": { "user": 94, "brand": 6 } }

# After 14 days (or manual lapse):
# Expected: { "status": "lapsed", "splitRate": { "user": 3, "brand": 97 } }
Step 9: Setup Cron Jobs
bash
# Option A: cron-job.org (free)
# Create these jobs at https://cron-job.org:

# Job 1: Daily Summary
#   URL: POST https://your-las.vercel.app/api/agent-webhook
#   Body: { "action": "analyze_waitlist_growth" }
#   Schedule: 0 9 * * * (9 AM daily)

# Job 2: License Expiry Check
#   URL: POST https://your-las.vercel.app/api/admin/check-expiring
#   Schedule: 0 0 * * * (midnight daily)

# Job 3: Compliance Score Recalculation
#   URL: POST https://your-las.vercel.app/api/admin/compliance-batch
#   Schedule: 0 */6 * * * (every 6 hours)

# Option B: Vercel Cron (paid)
# Add to vercel.json:
# {
#   "crons": [
#     { "path": "/api/agent-webhook", "schedule": "0 9 * * *" },
#     { "path": "/api/admin/check-expiring", "schedule": "0 0 * * *" }
#   ]
# }
Step 10: Smart Contract Deployment (Optional)
bash
cd enhanced-contracts

# Install Solidity compiler
npm install -g solc

# Compile
solc --bin --abi RevenueSplitter.sol -o build/

# Deploy to Polygon via Hardhat
npm install --save-dev hardhat
npx hardhat init
# Configure hardhat.config.ts with Polygon RPC and private key
npx hardhat run scripts/deploy.ts --network polygon

# Constructor args: (licensee_address, oracle_address)
# oracle_address = your LAS server wallet address
Quick Reference: All Commands
bash
# ─── SETUP ───
git clone <repo> && cd branded-license-system
cd license-authority-server && npm install && cp .env.local.example .env.local
# Edit .env.local
npx tsx scripts/migrate.ts
npx tsx scripts/seed.ts
npx tsx scripts/integration-test.ts

# ─── RUN ───
npm run dev          # LAS local
vercel deploy --prod # LAS production

cd ../licensee-app && npm install && cp .env.local.example .env.local
# Edit .env.local
npm run dev          # Licensee local
vercel deploy --prod # Licensee production

# ─── TEST ───
# Kill switch
curl -X POST /api/admin/revoke -d '{"buyerId":"BUYER_001","reason":"test"}'
curl -X POST /api/license-verify -d '{"licenseToken":"...","hardwareFingerprint":"test"}'

# Revenue split
stripe payment_intents create --amount=1000 --currency=usd --metadata buyer_id=BUYER_001

# Grace period
curl -X POST /api/stripe-webhook -d '{"type":"invoice.payment_failed",...}'

# Audit chain
curl -X GET /api/audit?limit=100
Environment Variables Quick Reference
LAS (.env.local)
Table
Variable	Source	Purpose
STRIPE_SECRET_KEY	Stripe Dashboard → Developers → API keys	Platform account secret
STRIPE_WEBHOOK_SECRET	Stripe Dashboard → Webhooks → Endpoint	Verify Stripe signatures
STRIPE_CONNECT_CLIENT_ID	Stripe Dashboard → Connect → Settings	OAuth for connected accounts
LICENSE_SECRET	openssl rand -base64 48	JWT signing key (64+ chars)
RESEND_API_KEY	Resend Dashboard → API Keys	Email delivery
BRAND_EMAIL	Your email	Admin notifications
NEXT_PUBLIC_APP_URL	Your Vercel deployment URL	LAS public URL
LAS_API_KEY	openssl rand -base64 32	Internal API auth
Licensee App (.env.local)
Table
Variable	Value	Purpose
NEXT_PUBLIC_LAS_URL	Your LAS URL	API endpoint
LAS_API_KEY	Same as LAS	Internal auth
RESEND_API_KEY	Resend key	Welcome emails
NEXT_PUBLIC_APP_URL	Buyer app URL	Public URL
Troubleshooting
Table
Problem	Cause	Fix
Invalid license signature	Wrong LICENSE_SECRET	Regenerate with openssl rand -base64 48
Stripe webhook 400	Wrong webhook secret	Copy exact secret from Stripe Dashboard
Database locked	SQLite WAL mode	Delete data/*.sqlite* and re-run migrate
Licensee can't reach LAS	CORS or wrong URL	Verify NEXT_PUBLIC_LAS_URL matches deployment
Kill switch not working	Token not in DB blacklist	Check license_tokens table for revoked_at
Revenue split not executing	Missing Stripe Connect account	Ensure buyer has connected Stripe account
Architecture Summary
plain
YOU (BRAND)                          BUYER (LICENSEE)
├─ License Authority Server          ├─ Thin Client App
│  ├─ SQLite database                │  ├─ Proxies all API calls to LAS
│  ├─ JWT license engine             │  ├─ Local SQLite cache
│  ├─ Revenue split automation       │  ├─ Kill switch bootstrap
│  ├─ Immutable audit chain          │  └─ Termination screen
│  ├─ Compliance scoring             
│  └─ Admin dashboard                
└─ Stripe Connect Platform           └─ Stripe Connected Account
   ├─ Receives 100% of payment        ├─ Receives 94% (active)
   ├─ Auto-splits 94% to licensee     └─ Receives 3% (lapsed)
   └─ Keeps 6% (active) or 97% (lapsed)
The licensee cannot bypass the split because they don't control the payment rail. You do.
License
See LICENSE file. Have an attorney review before use. The liquidated damages clause should be capped at 12 months of projected royalties to ensure enforceability.
Built with mathematical enforcement. Deployed with cryptographic certainty.
