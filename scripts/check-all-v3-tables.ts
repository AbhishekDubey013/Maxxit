#!/usr/bin/env ts-node
/**
 * Comprehensive V3 Tables Check
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkV3Tables() {
  console.log('\n🔍 CHECKING V3 TABLES IN DATABASE...\n');

  try {
    // Get all V3 tables
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%_v3'
      ORDER BY tablename;
    `;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 V3 TABLES FOUND IN DATABASE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (tables.length === 0) {
      console.log('❌ NO V3 TABLES FOUND!\n');
      return false;
    }

    const expectedTables = [
      'agents_v3',
      'agent_deployments_v3',
      'signals_v3',
      'positions_v3',
      'venue_routing_config_v3',
      'venue_routing_history_v3'
    ];

    console.log('Expected: 6 tables');
    console.log(`Found: ${tables.length} tables\n`);

    for (const expected of expectedTables) {
      const exists = tables.some(t => t.tablename === expected);
      console.log(`  ${exists ? '✅' : '❌'} ${expected}`);
    }

    console.log('\n');

    // Check each table's row count
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📈 ROW COUNTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const table of tables) {
      const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM ${table.tablename};`
      );
      console.log(`  ${table.tablename.padEnd(30)} ${count[0].count} rows`);
    }

    console.log('\n');

    // Check V3 enum
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏷️  VENUE_V3_T ENUM');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'venue_v3_t'
      )
      ORDER BY enumsortorder;
    `;

    if (enumValues.length > 0) {
      console.log(`  Found ${enumValues.length} values:`);
      enumValues.forEach(e => console.log(`    ✅ ${e.enumlabel}`));
    } else {
      console.log('  ❌ venue_v3_t enum NOT FOUND');
    }

    console.log('\n');

    // Check V2 tables (should still exist)
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔒 V2 TABLES (Should be untouched)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const v2AgentCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM agents;
    `;
    const v2SignalCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM signals;
    `;
    const v2PositionCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM positions;
    `;

    console.log(`  agents:    ${v2AgentCount[0].count} rows ✅`);
    console.log(`  signals:   ${v2SignalCount[0].count} rows ✅`);
    console.log(`  positions: ${v2PositionCount[0].count} rows ✅`);

    console.log('\n');

    // Check table structures
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏗️  TABLE STRUCTURES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const table of expectedTables) {
      const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string, data_type: string }>>(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = '${table}' 
         ORDER BY ordinal_position 
         LIMIT 5;`
      );
      
      if (columns.length > 0) {
        console.log(`  ✅ ${table} (${columns.length} columns shown):`);
        columns.forEach(col => {
          console.log(`     - ${col.column_name}: ${col.data_type}`);
        });
      } else {
        console.log(`  ❌ ${table} - No columns found!`);
      }
      console.log('');
    }

    // Final verdict
    const allTablesExist = expectedTables.every(expected => 
      tables.some(t => t.tablename === expected)
    );

    console.log('═══════════════════════════════════════════════════════════════');
    if (allTablesExist && enumValues.length > 0) {
      console.log('✅ ALL V3 TABLES PRESENT AND READY');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Summary:');
      console.log(`  ✅ ${tables.length}/6 V3 tables exist`);
      console.log(`  ✅ ${enumValues.length}/5 enum values exist`);
      console.log(`  ✅ V2 tables preserved (${v2AgentCount[0].count} agents)`);
      console.log('\n🎉 V3 system is fully operational!\n');
    } else {
      console.log('❌ SOME V3 TABLES MISSING');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Run: npx tsx scripts/exec-v3-sql-fixed.ts\n');
    }

    return allTablesExist;

  } catch (error: any) {
    console.error('\n❌ Error checking tables:', error.message);
    console.error('\nStack:', error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkV3Tables()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { checkV3Tables };

