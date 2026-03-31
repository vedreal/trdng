# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (includes Binance proxy routes)
│   └── telegram-futures/   # Telegram Mini App - BTC Futures Trading (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Artifacts

### `artifacts/telegram-futures` — Catrix Futures Trading (Telegram Mini App)

A Telegram Mini App for BTC/USDT futures trading with real-time candlestick chart and order placement.

**Features:**
- Real-time BTC price from Binance WebSocket (`wss://stream.binance.com:9443/ws/btcusdt@kline_1m`)
- Candlestick chart with 1m/15m/1h/4h/1d intervals
- Buy/Sell order panel with Limit/Market order types
- Amount input, price slider, Liq. Price and Margin Required calculation
- Leverage selector (5x–125x), Cross/Isolated margin mode toggle
- Funding rate countdown display
- Position/Orders/History tabs
- Bottom navigation: Home, Futures, AI Trade, Earn, Profile
- Fallback mock candle data when Binance is blocked (e.g. Replit dev environment)

**Price data:** Uses Binance spot API proxied through `/api/binance/*` to avoid CORS. WebSocket connects directly to Binance stream. Mock data auto-generated if connection fails.

**Price note:** Binance returns HTTP 451 from Replit's IP range. App shows simulated candle data in development; real-time data works in Telegram Mini App context.

### `artifacts/api-server` — Express API Server

- Binance proxy routes: `GET /api/binance/klines`, `GET /api/binance/ticker`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

- **Always typecheck from the root** — `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck
- **Project references** — cross-package imports via `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then builds all packages
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly`
