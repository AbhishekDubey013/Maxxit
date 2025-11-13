#!/usr/bin/env ts-node
/**
 * Add Missing V3 Tables
 * Adds billing_events_v3 and pnl_snapshots_v3
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingV3Tables() {
  console.log('\n🚀 Adding Missing V3 Tables...\n');

  try {
    // 1. Create billing_events_v3
    console.log('[1/2] Creating billing_events_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS billing_events_v3 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position_id UUID REFERENCES positions_v3(id),
        deployment_id UUID NOT NULL REFERENCES agent_deployments_v3(id) ON DELETE CASCADE,
        
        kind bill_kind_t NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        asset TEXT DEFAULT 'USDC',
        status bill_status_t NOT NULL,
        
        occurred_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB,
        
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_billing_v3_deployment ON billing_events_v3(deployment_id, occurred_at);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_billing_v3_kind ON billing_events_v3(kind, occurred_at);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_billing_v3_status ON billing_events_v3(status);`;
    console.log('✅ billing_events_v3 created\n');
    
    // 2. Create pnl_snapshots_v3
    console.log('[2/2] Creating pnl_snapshots_v3 table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS pnl_snapshots_v3 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID NOT NULL REFERENCES agents_v3(id) ON DELETE CASCADE,
        deployment_id UUID NOT NULL REFERENCES agent_deployments_v3(id) ON DELETE CASCADE,
        
        day DATE NOT NULL,
        pnl DECIMAL(20, 8),
        return_pct REAL,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(deployment_id, day)
      );
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_pnl_v3_agent ON pnl_snapshots_v3(agent_id, day);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_pnl_v3_deployment ON pnl_snapshots_v3(deployment_id, day);`;
    console.log('✅ pnl_snapshots_v3 created\n');
    
    console.log('\n✅ Missing V3 tables added successfully!');
    
    // Verify all V3 tables
    console.log('\n📊 Verifying all V3 tables...\n');
    
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%_v3'
      ORDER BY tablename;
    `;
    
    const expectedTables = [
      'agent_deployments_v3',
      'agents_v3',
      'billing_events_v3',        // NEW
      'pnl_snapshots_v3',          // NEW
      'positions_v3',
      'signals_v3',
      'venue_routing_config_v3',
      'venue_routing_history_v3',
    ];
    
    console.log('Expected V3 tables: 8');
    console.log(`Found V3 tables: ${tables.length}\n`);
    
    expectedTables.forEach((expected) => {
      const exists = tables.some((t) => t.tablename === expected);
      console.log(`  ${exists ? '✅' : '❌'} ${expected}`);
    });
    
    if (tables.length !== expectedTables.length) {
      console.log(`\n⚠️  Warning: Expected ${expectedTables.length} tables, found ${tables.length}`);
    } else {
      console.log('\n✅ All V3 tables present!');
    }
    
    // Show row counts
    console.log('\n📈 Row counts:');
    for (const table of tables) {
      const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM ${table.tablename};`
      );
      console.log(`  ${table.tablename}: ${count[0].count} rows`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ V3 SYSTEM IS NOW COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 V3 Tables (8 total):');
    console.log('  ✅ agents_v3                  - Agent configuration');
    console.log('  ✅ agent_deployments_v3       - User deployments');
    console.log('  ✅ signals_v3                 - Trading signals');
    console.log('  ✅ positions_v3               - Trading positions');
    console.log('  ✅ venue_routing_config_v3    - Routing preferences');
    console.log('  ✅ venue_routing_history_v3   - Routing decisions');
    console.log('  ✅ billing_events_v3          - Profit sharing & billing');
    console.log('  ✅ pnl_snapshots_v3           - Daily PnL tracking\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  addMissingV3Tables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { addMissingV3Tables };

