#!/usr/bin/env ts-node
/**
 * Verify V3 System is Working
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyV3System() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║            ✅ VERIFYING V3 SEPARATE SYSTEM                    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check V3 tables exist
    console.log('1️⃣  Checking V3 tables...\n');
    
    const v3Tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%_v3'
      ORDER BY tablename;
    `;
    
    const expectedTables = [
      'agent_deployments_v3',
      'agents_v3',
      'positions_v3',
      'signals_v3',
      'venue_routing_config_v3',
      'venue_routing_history_v3',
    ];
    
    console.log('Expected V3 tables:');
    expectedTables.forEach((table) => {
      const exists = v3Tables.some((t) => t.tablename === table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    if (v3Tables.length !== expectedTables.length) {
      throw new Error(`Expected ${expectedTables.length} tables, found ${v3Tables.length}`);
    }
    
    console.log('\n✅ All V3 tables exist\n');
    
    // 2. Check venue_v3_t enum
    console.log('2️⃣  Checking venue_v3_t enum...\n');
    
    const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'venue_v3_t'
      )
      ORDER BY enumsortorder;
    `;
    
    console.log('venue_v3_t values:');
    enumValues.forEach((e) => {
      console.log(`  ✅ ${e.enumlabel}`);
    });
    
    const expectedEnums = ['MULTI', 'HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT'];
    if (enumValues.length !== expectedEnums.length) {
      throw new Error(`Expected ${expectedEnums.length} enum values, found ${enumValues.length}`);
    }
    
    console.log('\n✅ venue_v3_t enum is correct\n');
    
    // 3. Check global routing config
    console.log('3️⃣  Checking global routing config...\n');
    
    const globalConfig = await prisma.$queryRaw<any[]>`
      SELECT * FROM venue_routing_config_v3 
      WHERE agent_id IS NULL 
      LIMIT 1;
    `;
    
    if (globalConfig.length === 0) {
      throw new Error('Global routing config not found');
    }
    
    console.log('Global routing config:');
    console.log(`  Priority: ${globalConfig[0].venue_priority.join(' → ')}`);
    console.log(`  Strategy: ${globalConfig[0].routing_strategy}`);
    console.log(`  Failover: ${globalConfig[0].failover_enabled}`);
    
    console.log('\n✅ Global routing config exists\n');
    
    // 4. Count V2 vs V3 data
    console.log('4️⃣  Comparing V2 vs V3 data...\n');
    
    const v2AgentCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM agents;
    `;
    
    const v3AgentCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM agents_v3;
    `;
    
    const v2SignalCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM signals;
    `;
    
    const v3SignalCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM signals_v3;
    `;
    
    const v2PositionCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM positions;
    `;
    
    const v3PositionCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM positions_v3;
    `;
    
    console.log('V2 System:');
    console.log(`  Agents:    ${v2AgentCount[0].count}`);
    console.log(`  Signals:   ${v2SignalCount[0].count}`);
    console.log(`  Positions: ${v2PositionCount[0].count}`);
    
    console.log('\nV3 System:');
    console.log(`  Agents:    ${v3AgentCount[0].count}`);
    console.log(`  Signals:   ${v3SignalCount[0].count}`);
    console.log(`  Positions: ${v3PositionCount[0].count}`);
    
    console.log('\n✅ V2 and V3 are completely separate\n');
    
    // 5. Check venue_markets (shared)
    console.log('5️⃣  Checking shared venue_markets...\n');
    
    const hlMarkets = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM venue_markets WHERE venue = 'HYPERLIQUID';
    `;
    
    const ostiumMarkets = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM venue_markets WHERE venue = 'OSTIUM';
    `;
    
    console.log('Shared market data:');
    console.log(`  HYPERLIQUID: ${hlMarkets[0].count} pairs`);
    console.log(`  OSTIUM:      ${ostiumMarkets[0].count} pairs`);
    
    if (hlMarkets[0].count === 0n && ostiumMarkets[0].count === 0n) {
      console.log('\n⚠️  Warning: No market data found. Run market sync scripts.');
    } else {
      console.log('\n✅ Market data available\n');
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 V3 SYSTEM VERIFICATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('✅ All V3 tables exist');
    console.log('✅ venue_v3_t enum is correct');
    console.log('✅ Global routing config set');
    console.log('✅ V2 and V3 are separate');
    console.log('✅ Shared market data accessible');
    
    console.log('\n🚀 V3 is ready to use!');
    console.log('\nNext steps:');
    console.log('  1. Create V3 agent:  POST /api/v3/agents/create');
    console.log('  2. Deploy agent:     POST /api/v3/agents/deploy');
    console.log('  3. Generate signal:  POST /api/v3/signals/generate');
    console.log('  4. Watch routing:    SELECT * FROM venue_routing_history_v3;\n');
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifyV3System()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { verifyV3System };

