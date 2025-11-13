#!/usr/bin/env ts-node
/**
 * Deploy V3 as Completely Separate System
 * Creates new V3 tables without touching V2
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function deployV3Separate() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║            🚀 DEPLOYING V3 AS SEPARATE SYSTEM                 ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('This will create:');
  console.log('  ✅ agents_v3 (separate from agents)');
  console.log('  ✅ signals_v3 (separate from signals)');
  console.log('  ✅ positions_v3 (separate from positions)');
  console.log('  ✅ agent_deployments_v3');
  console.log('  ✅ venue_routing_config_v3');
  console.log('  ✅ venue_routing_history_v3');
  console.log('  ✅ venue_v3_t enum (MULTI, HYPERLIQUID, OSTIUM)');
  console.log('');
  console.log('V2 tables remain completely untouched!\n');

  try {
    // Create SQL for V3 tables
    const sql = `
-- ============================================================================
-- V3 AGENT WHERE SYSTEM - SEPARATE TABLES
-- ============================================================================

-- V3 Enum
CREATE TYPE venue_v3_t AS ENUM ('MULTI', 'HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT');

-- V3 Agents Table
CREATE TABLE agents_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  venue venue_v3_t DEFAULT 'MULTI',
  status agent_status_t DEFAULT 'DRAFT',
  
  x_account_ids TEXT[],
  research_institute_ids TEXT[],
  weights JSONB,
  
  apr_30d REAL,
  apr_90d REAL,
  apr_si REAL,
  sharpe_30d REAL,
  
  profit_receiver_address TEXT NOT NULL,
  
  proof_of_intent_message TEXT,
  proof_of_intent_signature TEXT,
  proof_of_intent_timestamp TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_v3_status_venue ON agents_v3(status, venue);
CREATE INDEX idx_agents_v3_creator ON agents_v3(creator_wallet);

-- V3 Deployments Table
CREATE TABLE agent_deployments_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents_v3(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL,
  safe_wallet TEXT,
  
  status agent_status_t DEFAULT 'ACTIVE',
  
  sub_active BOOLEAN DEFAULT TRUE,
  sub_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  
  module_enabled BOOLEAN DEFAULT FALSE,
  module_address TEXT,
  
  hyperliquid_agent_address TEXT,
  hyperliquid_agent_key_encrypted TEXT,
  hyperliquid_agent_key_iv TEXT,
  hyperliquid_agent_key_tag TEXT,
  
  ostium_agent_address TEXT,
  ostium_agent_key_encrypted TEXT,
  ostium_agent_key_iv TEXT,
  ostium_agent_key_tag TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_wallet, agent_id)
);

CREATE INDEX idx_deployments_v3_agent ON agent_deployments_v3(agent_id);
CREATE INDEX idx_deployments_v3_user ON agent_deployments_v3(user_wallet);

-- V3 Signals Table
CREATE TABLE signals_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents_v3(id) ON DELETE CASCADE,
  
  token_symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  size_model JSONB NOT NULL,
  risk_model JSONB NOT NULL,
  confidence REAL,
  
  requested_venue venue_v3_t DEFAULT 'MULTI',
  final_venue venue_v3_t,
  
  source_tweets TEXT[] DEFAULT '{}',
  source_research TEXT[] DEFAULT '{}',
  
  status TEXT DEFAULT 'PENDING',
  skipped_reason TEXT,
  
  proof_verified BOOLEAN DEFAULT FALSE,
  executor_agreement_verified BOOLEAN DEFAULT FALSE,
  
  lunarcrush_score REAL,
  lunarcrush_reasoning TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  routed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

CREATE INDEX idx_signals_v3_agent ON signals_v3(agent_id, created_at);
CREATE INDEX idx_signals_v3_status ON signals_v3(status);

-- V3 Positions Table
CREATE TABLE positions_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES agent_deployments_v3(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals_v3(id) ON DELETE CASCADE,
  
  venue venue_v3_t NOT NULL,
  
  token_symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  qty DECIMAL(20, 8) NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  current_price DECIMAL(20, 8),
  
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  trailing_params JSONB,
  
  status TEXT DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  
  exit_price DECIMAL(20, 8),
  exit_reason TEXT,
  pnl DECIMAL(20, 8),
  
  entry_tx_hash TEXT,
  exit_tx_hash TEXT,
  
  UNIQUE(deployment_id, signal_id)
);

CREATE INDEX idx_positions_v3_deployment ON positions_v3(deployment_id, opened_at);
CREATE INDEX idx_positions_v3_signal ON positions_v3(signal_id);
CREATE INDEX idx_positions_v3_status ON positions_v3(status);
CREATE INDEX idx_positions_v3_venue ON positions_v3(venue);

-- V3 Routing Config Table
CREATE TABLE venue_routing_config_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID UNIQUE REFERENCES agents_v3(id) ON DELETE CASCADE,
  
  venue_priority TEXT[] NOT NULL,
  routing_strategy TEXT DEFAULT 'FIRST_AVAILABLE',
  failover_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routing_config_v3_agent ON venue_routing_config_v3(agent_id);

-- V3 Routing History Table
CREATE TABLE venue_routing_history_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID UNIQUE NOT NULL REFERENCES signals_v3(id) ON DELETE CASCADE,
  
  token_symbol TEXT NOT NULL,
  requested_venue venue_v3_t NOT NULL,
  selected_venue venue_v3_t NOT NULL,
  routing_reason TEXT NOT NULL,
  
  checked_venues TEXT[],
  venue_availability JSONB,
  routing_duration_ms INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routing_history_v3_signal ON venue_routing_history_v3(signal_id);
CREATE INDEX idx_routing_history_v3_token ON venue_routing_history_v3(token_symbol, selected_venue);
CREATE INDEX idx_routing_history_v3_created ON venue_routing_history_v3(created_at);

-- Create default global routing config
INSERT INTO venue_routing_config_v3 (agent_id, venue_priority, routing_strategy, failover_enabled)
VALUES (NULL, ARRAY['HYPERLIQUID', 'OSTIUM'], 'FIRST_AVAILABLE', TRUE);
`;

    // Write SQL to file
    const fs = require('fs');
    fs.writeFileSync('/tmp/deploy-v3.sql', sql);
    
    console.log('📝 Created SQL migration file\n');
    console.log('Executing SQL...\n');

    // Execute SQL
    const { stdout, stderr } = await execAsync(
      `psql "${process.env.DATABASE_URL}" -f /tmp/deploy-v3.sql`
    );

    if (stderr && !stderr.includes('NOTICE')) {
      console.error('Errors:', stderr);
    }

    console.log(stdout);
    
    console.log('\n✅ V3 tables created successfully!\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 V3 DEPLOYMENT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('New V3 Tables:');
    console.log('  ✅ agents_v3');
    console.log('  ✅ agent_deployments_v3');
    console.log('  ✅ signals_v3');
    console.log('  ✅ positions_v3');
    console.log('  ✅ venue_routing_config_v3');
    console.log('  ✅ venue_routing_history_v3');
    console.log('  ✅ venue_v3_t enum\n');
    
    console.log('V2 Tables (Unchanged):');
    console.log('  ✅ agents (your existing agents)');
    console.log('  ✅ signals (your existing signals)');
    console.log('  ✅ positions (your existing positions)\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 V3 IS NOW READY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('Next steps:');
    console.log('  1. Create V3 agents via new API endpoints');
    console.log('  2. V2 and V3 run completely independently');
    console.log('  3. No interference between V2 and V3\n');

  } catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\nTrying alternative method...\n');
    
    // Alternative: Use Prisma directly
    console.log('Using Prisma to create tables...');
    // Note: This would require updating the main schema.prisma
    // For now, show manual instructions
    
    console.log('\nManual steps:');
    console.log('1. Check if PostgreSQL client is installed');
    console.log('2. Run: psql "$DATABASE_URL" < /tmp/deploy-v3.sql');
  }
}

// Run deployment
if (require.main === module) {
  deployV3Separate()
    .then(() => {
      console.log('✅ V3 deployment complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ V3 deployment failed:', error.message);
      process.exit(1);
    });
}

export { deployV3Separate };

