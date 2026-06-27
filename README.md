# Aether — Commerce Colony (License Authority Server)

[![Colony](https://img.shields.io/badge/colony-colony-teal)](#)
[![Archetype](https://img.shields.io/badge/archetype-commerce-green)](#)
[![Layer](https://img.shields.io/badge/layer-7%20CHILD-cyan)](#)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)
[![Hive](https://img.shields.io/badge/hive-sovereign--hive-gold)](#)

> License Authority Server — Stripe Connect, JWT licensing, revenue enforcement, and SOUL ledger settlement.

## Role in the Sovereign Hive

| Field | Value |
|-------|-------|
| colony_id | `aether` |
| role | colony |
| archetype | commerce |
| layer | 7 (CHILD — Commerce Expression) |
| entity | CHILD (Commerce Expression) |
| guilds | commerce, licensing, revenue |
| queen | THEHIVE :8080 |
| port | 3000 |

## What This Does

Aether is the commerce colony — the License Authority Server (LAS) for the Sovereign Hive. It enforces the economic constitution mathematically:

- **Active license** → 94% revenue to licensee
- **Lapsed license** → 3% revenue to licensee
- **Revoked license** → 0% revenue (past earnings locked permanently)
- **Stripe Connect** for split payment routing
- **JWT licensing** with server-side authority (thin client model)
- **SOUL ledger** integration with the Queen for wealth settlement
- **Kill switch** — revoke any license from the server side instantly

## Quick Start

```bash
git clone https://github.com/TehutiRaEl/aether
cd aether
npm install
cp .env.example .env.local
# Add STRIPE_SECRET_KEY, JWT_SECRET, DATABASE_URL
npm run dev   # http://localhost:3000
```

Or with Docker:
```bash
docker-compose up -d
```

## Colony Standard Layer

All endpoints are Next.js 14 App Router route handlers under `src/app/api/colony/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/colony/health` | Live health + process uptime |
| GET | `/api/colony/info` | Colony identity, layer, entity, guilds |
| GET | `/api/colony/manifest` | Endpoints + capabilities |
| POST | `/api/colony/events` | Accept hive dispatch events |
| GET | `/api/colony/agents` | License authority agent |

## Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/licenses/create` | Issue a new license + JWT |
| GET | `/api/licenses/{id}` | License status check |
| POST | `/api/licenses/{id}/revoke` | Server-side revocation |
| POST | `/api/stripe/webhook` | Stripe payment events |
| GET | `/api/colony/health` | Health check |

## Architecture

```
aether (commerce / layer 7) :3000
├── src/
│   └── app/
│       ├── api/
│       │   ├── colony/
│       │   │   ├── health/route.ts    # Colony health
│       │   │   ├── info/route.ts      # Colony identity
│       │   │   ├── manifest/route.ts  # Capability manifest
│       │   │   ├── events/route.ts    # Accept hive events
│       │   │   └── agents/route.ts    # Agent roster
│       │   ├── licenses/              # License CRUD
│       │   └── stripe/                # Stripe webhook handler
│       └── (pages)/                   # Next.js app pages
├── colony.json        # Colony identity manifest
├── soul.md            # F-001–F-006 constitution (synced from Queen)
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/
    └── constitution-receive.yml  # Auto-sync soul.md from Queen
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Next.js listen port |
| `STRIPE_SECRET_KEY` | *(required)* | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | *(required)* | Stripe webhook signing secret |
| `JWT_SECRET` | *(required)* | License JWT signing secret |
| `DATABASE_URL` | `/data/aether.db` | SQLite license database |
| `QUEEN_URL` | `http://localhost:8080` | THEHIVE Queen URL |

## Revenue Model

```
License State     Revenue Split
─────────────────────────────────
Active            94% licensee / 6% hive
Lapsed            3% licensee / 97% hive
Revoked           0% licensee / 100% hive (all future; past locked)
```

The split is enforced server-side. The licensee never has access to modify it — only the LAS API controls payment routing.

## Constitution Sync

Receives `soul.md` updates automatically from the Queen via `.github/workflows/constitution-receive.yml` on `repository_dispatch`.

## Contributing

Commerce changes must comply with F-001 (Data Sovereignty) and F-002 (Value-Weighted Wealth). Revenue splits cannot be modified without a constitutional amendment.
