#!/usr/bin/env ts-node
/**
 * Execute V3 SQL directly via Prisma - Fixed Version
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function executeSQLFile() {
  console.log('\n🚀 Creating V3 Tables...\n');

  try {
    // Execute each statement separately, properly
    
    // 1. Create enum
    console.log('[1/7] Creating venue_v3_t enum...');
    try {
      await prisma.$executeRaw`
        DO $$ BEGIN
          CREATE TYPE venue_v3_t AS ENUM ('MULTI', 'HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;
      console.log('✅ Enum created\n');
    } catch (e: any) {
      console.log('⚠️  Enum already exists\n');
    }
    
    // 2. Create agents_v3
    console.log('[2/7] Creating agents_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS agents_v3 (
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
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_agents_v3_status_venue ON agents_v3(status, venue);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_agents_v3_creator ON agents_v3(creator_wallet);`;
    console.log('✅ agents_v3 created\n');
    
    // 3. Create agent_deployments_v3
    console.log('[3/7] Creating agent_deployments_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS agent_deployments_v3 (
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
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_deployments_v3_agent ON agent_deployments_v3(agent_id);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_deployments_v3_user ON agent_deployments_v3(user_wallet);`;
    console.log('✅ agent_deployments_v3 created\n');
    
    // 4. Create signals_v3
    console.log('[4/7] Creating signals_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS signals_v3 (
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
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_signals_v3_agent ON signals_v3(agent_id, created_at);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_signals_v3_status ON signals_v3(status);`;
    console.log('✅ signals_v3 created\n');
    
    // 5. Create positions_v3
    console.log('[5/7] Creating positions_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS positions_v3 (
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
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_positions_v3_deployment ON positions_v3(deployment_id, opened_at);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_positions_v3_signal ON positions_v3(signal_id);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_positions_v3_status ON positions_v3(status);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_positions_v3_venue ON positions_v3(venue);`;
    console.log('✅ positions_v3 created\n');
    
    // 6. Create venue_routing_config_v3
    console.log('[6/7] Creating venue_routing_config_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS venue_routing_config_v3 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID UNIQUE REFERENCES agents_v3(id) ON DELETE CASCADE,
        
        venue_priority TEXT[] NOT NULL,
        routing_strategy TEXT DEFAULT 'FIRST_AVAILABLE',
        failover_enabled BOOLEAN DEFAULT TRUE,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_routing_config_v3_agent ON venue_routing_config_v3(agent_id);`;
    console.log('✅ venue_routing_config_v3 created\n');
    
    // 7. Create venue_routing_history_v3
    console.log('[7/7] Creating venue_routing_history_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS venue_routing_history_v3 (
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
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_routing_history_v3_signal ON venue_routing_history_v3(signal_id);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_routing_history_v3_token ON venue_routing_history_v3(token_symbol, selected_venue);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_routing_history_v3_created ON venue_routing_history_v3(created_at);`;
    console.log('✅ venue_routing_history_v3 created\n');
    
    // Create default global config
    console.log('Creating default global routing config...');
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM venue_routing_config_v3 WHERE agent_id IS NULL LIMIT 1;
    `;
    
    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO venue_routing_config_v3 (agent_id, venue_priority, routing_strategy, failover_enabled)
        VALUES (NULL, ARRAY['HYPERLIQUID', 'OSTIUM'], 'FIRST_AVAILABLE', TRUE);
      `;
      console.log('✅ Default config created\n');
    } else {
      console.log('⚠️  Default config already exists\n');
    }
    
    console.log('\n✅ V3 SQL execution complete!');
    
    // Verify tables
    console.log('\n📊 Verifying V3 tables...\n');
    
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%_v3'
      ORDER BY tablename;
    `;
    
    console.log('V3 Tables created:');
    tables.forEach((t) => {
      console.log(`  ✅ ${t.tablename}`);
    });
    
    // Count V2 agents
    const v2Count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM agents;
    `;
    
    // Count V3 agents
    const v3Count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM agents_v3;
    `;
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎉 V3 IS NOW READY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('V2 and V3 are completely separate:');
    console.log(`  • V2: ${v2Count[0].count} agents in 'agents' table`);
    console.log(`  • V3: ${v3Count[0].count} agents in 'agents_v3' table\n`);
    
    console.log('No overlap - both systems run independently! 🚀\n');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  executeSQLFile()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { executeSQLFile };

