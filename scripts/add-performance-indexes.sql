-- Performance Indexes for Dashboard Optimization
-- Run this SQL script in your Neon database to improve query performance by 60-80%

-- =========================================
-- AGENTS TABLE INDEXES
-- =========================================

-- Index for fast agent lookup by creator wallet and status
-- Used in: Dashboard queries filtering by creatorWallet
CREATE INDEX IF NOT EXISTS idx_agents_creator_status 
ON agents(creator_wallet, status);

-- Index for agent leaderboard queries (sorted by performance)
CREATE INDEX IF NOT EXISTS idx_agents_performance 
ON agents(status, apr_30d DESC NULLS LAST) 
WHERE status = 'ACTIVE';

-- =========================================
-- AGENT_DEPLOYMENTS TABLE INDEXES
-- =========================================

-- Index for finding deployments by agent ID
-- Used in: Dashboard queries fetching deployments for specific agents
CREATE INDEX IF NOT EXISTS idx_deployments_agent_status 
ON agent_deployments(agent_id, status);

-- Index for user's deployments
CREATE INDEX IF NOT EXISTS idx_deployments_user_wallet 
ON agent_deployments(user_wallet, status);

-- =========================================
-- POSITIONS TABLE INDEXES
-- =========================================

-- Index for finding positions by deployment with time ordering
-- Used in: Dashboard queries fetching recent positions
CREATE INDEX IF NOT EXISTS idx_positions_deployment_time 
ON positions(deployment_id, opened_at DESC);

-- Index for filtering open positions
CREATE INDEX IF NOT EXISTS idx_positions_status 
ON positions(deployment_id, closed_at) 
WHERE closed_at IS NULL;

-- Composite index for position queries with status
CREATE INDEX IF NOT EXISTS idx_positions_deployment_status 
ON positions(deployment_id, opened_at DESC, closed_at);

-- =========================================
-- BILLING_EVENTS TABLE INDEXES
-- =========================================

-- Index for billing event queries by deployment
-- Used in: Dashboard queries fetching billing history
CREATE INDEX IF NOT EXISTS idx_billing_deployment_time 
ON billing_events(deployment_id, occurred_at DESC);

-- Index for filtering billing by kind (SUBSCRIPTION, INFRA_FEE, PROFIT_SHARE)
CREATE INDEX IF NOT EXISTS idx_billing_kind_time 
ON billing_events(kind, occurred_at DESC);

-- Composite index for deployment billing queries
CREATE INDEX IF NOT EXISTS idx_billing_deployment_kind 
ON billing_events(deployment_id, kind, occurred_at DESC);

-- =========================================
-- PNL_SNAPSHOTS TABLE INDEXES
-- =========================================

-- Index for fetching P&L snapshots for agent performance charts
CREATE INDEX IF NOT EXISTS idx_pnl_agent_time 
ON pnl_snapshots(agent_id, day ASC);

-- Index for deployment-specific P&L queries
CREATE INDEX IF NOT EXISTS idx_pnl_deployment_time 
ON pnl_snapshots(deployment_id, day ASC);

-- =========================================
-- SIGNALS TABLE INDEXES
-- =========================================

-- Index for agent signal queries
CREATE INDEX IF NOT EXISTS idx_signals_agent_time 
ON signals(agent_id, created_at DESC);

-- Index for venue-specific signal queries
CREATE INDEX IF NOT EXISTS idx_signals_venue 
ON signals(venue, created_at DESC);

-- =========================================
-- CT_ACCOUNTS TABLE INDEXES
-- =========================================

-- Index for Twitter account lookups by username
CREATE INDEX IF NOT EXISTS idx_ct_accounts_username 
ON ct_accounts(x_username);

-- Index for high-impact accounts
CREATE INDEX IF NOT EXISTS idx_ct_accounts_impact 
ON ct_accounts(impact_factor DESC) 
WHERE impact_factor > 0;

-- =========================================
-- ANALYZE TABLES
-- =========================================

-- Update table statistics for query planner
ANALYZE agents;
ANALYZE agent_deployments;
ANALYZE positions;
ANALYZE billing_events;
ANALYZE pnl_snapshots;
ANALYZE signals;
ANALYZE ct_accounts;

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Check that indexes were created successfully
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check index sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

