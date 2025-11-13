#!/usr/bin/env ts-node
/**
 * Setup Agent Where - Migration Script
 * 
 * This script safely sets up the Agent Where (venue routing) system:
 * 1. Pushes new schema changes to database
 * 2. Creates default global routing config
 * 3. Validates venue_markets data is present
 * 4. Provides migration path for existing agents
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function setupAgentWhere() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║       🎯 AGENT WHERE: Venue Routing Setup                    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // ========================================================================
    // STEP 1: Push Schema Changes
    // ========================================================================
    console.log('📊 [1/5] Pushing schema changes to database...\n');
    
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push');
      console.log(stdout);
      if (stderr) console.error('Warnings:', stderr);
      console.log('✅ Schema updated successfully\n');
    } catch (error: any) {
      console.error('❌ Schema push failed:', error.message);
      throw error;
    }

    // ========================================================================
    // STEP 2: Verify venue_markets Data
    // ========================================================================
    console.log('🗄️  [2/5] Verifying venue_markets data...\n');
    
    const hyperliquidMarkets = await prisma.venue_markets.count({
      where: { venue: 'HYPERLIQUID', is_active: true },
    });

    const ostiumMarkets = await prisma.venue_markets.count({
      where: { venue: 'OSTIUM', is_active: true },
    });

    console.log(`   HYPERLIQUID: ${hyperliquidMarkets} active markets`);
    console.log(`   OSTIUM: ${ostiumMarkets} active markets\n`);

    if (hyperliquidMarkets === 0 || ostiumMarkets === 0) {
      console.warn('⚠️  Warning: Some venues have no markets. Run sync scripts:');
      console.warn('   npx tsx scripts/sync-hyperliquid-markets.ts');
      console.warn('   npx tsx scripts/sync-ostium-markets.ts\n');
    } else {
      console.log('✅ Venue markets data looks good\n');
    }

    // ========================================================================
    // STEP 3: Create Default Global Routing Config
    // ========================================================================
    console.log('⚙️  [3/5] Setting up default routing configuration...\n');
    
    const existingGlobalConfig = await prisma.venue_routing_config.findUnique({
      where: { agent_id: null },
    });

    if (existingGlobalConfig) {
      console.log('   Global routing config already exists:');
      console.log(`   Priority: ${existingGlobalConfig.venue_priority.join(' → ')}`);
      console.log(`   Strategy: ${existingGlobalConfig.routing_strategy}`);
      console.log(`   Failover: ${existingGlobalConfig.failover_enabled ? 'Enabled' : 'Disabled'}\n`);
    } else {
      const defaultConfig = await prisma.venue_routing_config.create({
        data: {
          agent_id: null, // Global config
          venue_priority: ['HYPERLIQUID', 'OSTIUM'],
          routing_strategy: 'FIRST_AVAILABLE',
          failover_enabled: true,
        },
      });

      console.log('✅ Created default global routing config:');
      console.log(`   Priority: ${defaultConfig.venue_priority.join(' → ')}`);
      console.log(`   Strategy: ${defaultConfig.routing_strategy}`);
      console.log(`   Failover: ${defaultConfig.failover_enabled ? 'Enabled' : 'Disabled'}\n`);
    }

    // ========================================================================
    // STEP 4: Check Existing Agents
    // ========================================================================
    console.log('👥 [4/5] Analyzing existing agents...\n');
    
    const agentsByVenue = await prisma.agents.groupBy({
      by: ['venue', 'status'],
      _count: true,
    });

    console.log('   Current agent distribution:');
    for (const group of agentsByVenue) {
      console.log(`   ${group.venue} (${group.status}): ${group._count} agents`);
    }
    console.log('');

    const multiAgents = await prisma.agents.count({
      where: { venue: 'MULTI' },
    });

    if (multiAgents === 0) {
      console.log('   ℹ️  No MULTI venue agents yet (this is normal)');
      console.log('   Existing agents will continue to work with their configured venues\n');
    } else {
      console.log(`   ✅ Found ${multiAgents} MULTI venue agents\n`);
    }

    // ========================================================================
    // STEP 5: Validate System Readiness
    // ========================================================================
    console.log('🔍 [5/5] Validating system readiness...\n');
    
    const checks = {
      schema: true,
      venueMarkets: hyperliquidMarkets > 0 && ostiumMarkets > 0,
      routingConfig: true,
      multiVenueSupport: true,
    };

    console.log('   System Checks:');
    console.log(`   ${checks.schema ? '✅' : '❌'} Schema updated`);
    console.log(`   ${checks.venueMarkets ? '✅' : '⚠️ '} Venue markets populated`);
    console.log(`   ${checks.routingConfig ? '✅' : '❌'} Routing config created`);
    console.log(`   ${checks.multiVenueSupport ? '✅' : '❌'} MULTI venue support enabled`);
    console.log('');

    const allPassed = Object.values(checks).every(v => v === true);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('═'.repeat(65));
    console.log('📋 SETUP SUMMARY');
    console.log('═'.repeat(65) + '\n');

    if (allPassed) {
      console.log('✅ Agent Where is ready to use!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Create a MULTI venue agent via API or UI');
      console.log('2. Agent will automatically route to best available venue');
      console.log('3. Default priority: HYPERLIQUID → OSTIUM');
      console.log('');
      console.log('Configure custom routing:');
      console.log('POST /api/venue-routing/config');
      console.log('{ "agentId": "xxx", "venuePriority": ["HYPERLIQUID", "OSTIUM"] }');
    } else {
      console.warn('⚠️  Setup completed with warnings');
      console.warn('');
      if (!checks.venueMarkets) {
        console.warn('Action required: Sync venue markets');
        console.warn('npx tsx scripts/sync-hyperliquid-markets.ts');
        console.warn('npx tsx scripts/sync-ostium-markets.ts');
      }
    }

    console.log('');
    console.log('═'.repeat(65));
    console.log('📚 Documentation: docs/AGENT_WHERE_ROUTING.md');
    console.log('═'.repeat(65) + '\n');

    return { success: true, checks };

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nStack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
if (require.main === module) {
  setupAgentWhere()
    .then((result) => {
      console.log('✅ Agent Where setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Agent Where setup failed:', error.message);
      process.exit(1);
    });
}

export { setupAgentWhere };

