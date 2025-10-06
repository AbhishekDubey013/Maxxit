# Maxxit DeFi - Agentic Trading Platform

## Overview

Maxxit is a production-ready agentic DeFi trading platform that enables users to deploy AI-powered trading agents that execute trades based on crypto Twitter signals and technical indicators. The platform provides a non-custodial solution using Safe wallets, with transparent performance tracking and a clear fee structure.

**Core Value Proposition:**
- Deploy autonomous trading agents with customizable strategy weights (8-weight configuration system)
- Trade across multiple venues (GMX, Hyperliquid, Spot DEX)
- Leverage crypto Twitter sentiment and technical indicators for signal generation
- Maintain full custody through Safe wallet integration
- Track real-time performance with APR and Sharpe ratio metrics

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend:**
- React 18 with Vite build system
- TypeScript for type safety
- Tailwind CSS with custom design system (Material Design 3 inspired)
- shadcn/ui components with Radix UI primitives
- TanStack Query for state management
- Wouter for client-side routing

**Backend:**
- Next.js 14 Pages Router with API routes
- PostgreSQL database (Neon) with Prisma ORM
- Redis + BullMQ for background job processing (planned)
- **Prisma-based API**: Direct Prisma backend at `/api/db/[...path]` (replaced PostgREST proxy)
  - Converts snake_case → camelCase field names
  - Type coercion for booleans, numbers, dates, JSON
  - Supports eq, neq, in, gte, lte, gt, lt operators
  - Filter reduction for repeated operators (intersection, narrowing)
  - **Known limitations**: Complex multi-operator combinations may not fully match PostgREST semantics
- **Privy Wallet Authentication**: Production-ready wallet authentication
  - Social login + wallet connection (MetaMask, Coinbase, WalletConnect, etc.)
  - Embedded wallets for onboarding
  - Auto-populates creator wallet address in agent creation flow
  - Configured via `NEXT_PUBLIC_PRIVY_APP_ID` environment variable

**Design System:**
- Dark mode primary with hybrid Material Design 3 approach
- Custom color palette: green primary (gains), red accents (losses/alerts)
- Inter font family for UI, JetBrains Mono for numbers/addresses
- Responsive design with mobile-first approach

### Core Architecture Patterns

**1. Monorepo Structure**
- Single repository with client, server, and shared code
- Path aliases for clean imports (`@/`, `@shared/`)
- Shared Zod schemas for validation across frontend/backend

**2. Background Job Pipeline (BullMQ Workers)**
The platform uses an 8-stage background processing pipeline for signal generation and trade execution:

1. **Tweet Ingest** → Fetches tweets from monitored crypto Twitter accounts
2. **Classify** → LLM-based classification to extract token symbols and sentiment
3. **Indicators** → Computes technical indicators (RSI, MACD, volume) in 6-hour windows
4. **Signal Create** → Generates trading signals by matching agents to opportunities
5. **Execute Trade** → Places orders via venue adapters (GMX/Hyperliquid/Spot)
6. **Risk Exit** → Monitors positions for stop-loss/take-profit triggers
7. **Metrics** → Updates PnL snapshots and performance metrics
8. **Billing** → Records infrastructure fees, profit share, and subscriptions

**Rationale:** Decoupled job processing enables fault tolerance, retry logic, and independent scaling of compute-intensive tasks (LLM calls, price feeds).

**3. Venue Adapter Pattern**
Abstraction layer for multi-venue trading support:
- `GmxAdapter` - GMX perpetuals trading
- `HyperliquidAdapter` - Hyperliquid perpetuals
- `SpotAdapter` - DEX spot trading (1inch/Uniswap)

Each adapter implements:
- `pairExists()` - Token availability check
- `placeOrder()` - Order execution
- `closePosition()` - Position exit
- Market-specific validation (min size, tick size, slippage limits)

**Rationale:** Enables adding new venues without touching core business logic. Stubs allow frontend development before full integration.

**4. Non-Custodial Execution via Safe**
- `RelayerService` - Coordinates Safe wallet module installation and transaction execution
- Users deploy agents linked to their Safe wallet
- Module-based execution pattern allows revocable agent access
- Gas costs covered by relayer (billed as infrastructure fee)

**Rationale:** Non-custodial architecture builds trust, meets regulatory requirements, and aligns with DeFi ethos.

**5. Agent Configuration System**
Agents use an 8-weight array representing strategy preferences:
```
[weight0, weight1, ..., weight7]  // Each 0-100
```

Weights map to:
- CT account impact factor influence
- Technical indicator thresholds (RSI, MACD, volume)
- Position sizing preferences
- Risk parameters

**Rationale:** Flexible strategy customization without code changes. Users can clone/modify successful agents.

**6. Signal Deduplication (6-Hour Bucketing)**
- Signals bucketed to 6-hour UTC windows using `bucket6hUtc()` utility
- Prevents duplicate trades on same token/timeframe
- Market indicators computed per 6h window for consistency

**Rationale:** Reduces noise from rapid Twitter sentiment changes, aligns with market microstructure (4h-1d timeframes).

**7. Risk Management Layer**
- Stop-loss/take-profit configured per position
- Support for percentage-based or fixed-price exits
- Trailing stop functionality for profit protection
- Separate risk monitoring worker checks positions continuously

**Rationale:** Essential for automated trading. Worker isolation prevents blocking main execution flow.

**8. Transparent Billing System**
Fee structure enforced at code level:
- $0.20 infrastructure fee per trade (config: `BILL_INFRA_FEE_USDC`)
- 10% profit share (1000 bps) on winning trades only
- $20/month subscription per active deployment

All fees recorded in `BillingEvent` table with full audit trail.

**Rationale:** Clear pricing builds trust. On-chain billing events enable disputes/verification.

**9. Performance Metrics Calculation**
Metrics updated via dedicated worker:
- APR30d, APR90d, APRSinceInception - Annualized returns
- Sharpe30d - Risk-adjusted performance
- Daily PnL snapshots aggregated by deployment

**Rationale:** Async metric calculation prevents blocking trade execution. Snapshots enable historical analysis.

**10. Database Design (14 Models)**
Key relationships:
- `Agent` (1) → (N) `AgentDeployment` → (N) `Position`
- `CtAccount` (1) → (N) `CtPost` → signal generation
- `Signal` (1) → (N) `Position` - tracks trade origin
- `VenueStatus` - token availability per venue

Prisma ORM chosen for:
- Type-safe queries
- Migration management
- PostgreSQL-specific features (JSONB for weights/indicators)

## External Dependencies

**Database:**
- PostgreSQL (Neon serverless) - Primary data store
- Drizzle Kit - Schema migrations (via `@neondatabase/serverless` driver)
- Note: Prisma currently used; Drizzle configured but not yet migrated

**Caching & Queues:**
- Redis - BullMQ job queue backing store
- BullMQ - Background job processing with retry logic

**Authentication:**
- JWT tokens for session management
- Passport.js with JWT strategy
- Planned: SIWE (Sign-In with Ethereum) for wallet-based auth

**Blockchain Integration:**
- Safe wallet SDK (via relayer service) - Non-custodial execution
- Web3 providers (not yet integrated) - For on-chain verification

**External APIs (Planned/Stubbed):**
- Twitter/X API (`X_API_KEY`) - Tweet ingestion
- LLM API (OpenAI/Anthropic) - Tweet classification
- Price feeds - Technical indicator computation
- DEX aggregators (1inch) - Spot trading execution

**Development Tools:**
- Vite - Frontend build system with HMR
- Swagger/OpenAPI - API documentation at `/api-docs`
- Bull Board - Queue monitoring UI at `/admin/queues`
- ESLint + Prettier - Code quality
- TypeScript - Type safety across stack

**UI Component Libraries:**
- Radix UI - Headless accessible components
- shadcn/ui - Pre-built component patterns
- Tailwind CSS - Utility-first styling
- Lucide React - Icon library

**Configuration Management:**
- Zod - Runtime environment validation
- ConfigModule (NestJS) - Centralized config
- `.env` files - Secret management (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)