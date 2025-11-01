/**
 * Test Complete Hyperliquid Flow: Signal → Position
 * Verifies that signals for Hyperliquid agents execute even without module_enabled
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testHyperliquidFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     🧪 TEST: HYPERLIQUID SIGNAL EXECUTION FLOW              ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Find Ring agent with Hyperliquid positions
  const ringDeployment = await prisma.agent_deployments.findFirst({
    where: {
      safe_wallet: '0xA10846a81528D429b50b0DcBF8968938A572FAC5'
    },
    include: {
      agents: true
    }
  });

  if (!ringDeployment) {
    console.log('❌ Ring deployment not found!');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊 DEPLOYMENT STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Agent: ${ringDeployment.agents.name}`);
  console.log(`  Venue: ${ringDeployment.agents.venue}`);
  console.log(`  Status: ${ringDeployment.agents.status}\n`);

  console.log(`Deployment: ${ringDeployment.id.substring(0, 8)}...`);
  console.log(`  Address: ${ringDeployment.safe_wallet}`);
  console.log(`  Status: ${ringDeployment.status}`);
  console.log(`  Sub Active: ${ringDeployment.sub_active}`);
  console.log(`  Module Enabled: ${ringDeployment.module_enabled} ${ringDeployment.module_enabled ? '✅' : '❌'}`);
  console.log(`  Hyperliquid Agent: ${ringDeployment.hyperliquid_agent_address || 'Not set'} ${ringDeployment.hyperliquid_agent_address ? '✅' : '❌'}\n`);

  // Check eligibility for execution
  const isEligible = ringDeployment.status === 'ACTIVE' &&
                    ringDeployment.sub_active &&
                    (ringDeployment.module_enabled || ringDeployment.hyperliquid_agent_address !== null);

  console.log(`Eligible for Trade Execution: ${isEligible ? '✅ YES' : '❌ NO'}\n`);

  if (!isEligible) {
    console.log('⚠️  Deployment not eligible. Checking requirements:\n');
    if (ringDeployment.status !== 'ACTIVE') {
      console.log(`  ❌ Deployment status: ${ringDeployment.status} (need ACTIVE)`);
    }
    if (!ringDeployment.sub_active) {
      console.log(`  ❌ Sub active: false (need true)`);
    }
    if (!ringDeployment.module_enabled && !ringDeployment.hyperliquid_agent_address) {
      console.log(`  ❌ Module enabled: false AND no Hyperliquid agent configured`);
      console.log(`     Need either: module_enabled = true OR hyperliquid_agent_address set`);
    }
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🧪 TEST SCENARIOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Scenario 1: Check if worker would pick up a signal
  console.log('Scenario 1: Would trade-executor-worker pick up a new signal?');
  
  const testQuery = await prisma.signals.findMany({
    where: {
      positions: {
        none: {},
      },
      skipped_reason: null,
      agents: {
        status: 'ACTIVE',
        agent_deployments: {
          some: {
            status: 'ACTIVE',
            OR: [
              { module_enabled: true },
              { hyperliquid_agent_address: { not: null } },
            ]
          },
        },
      },
    },
    include: {
      agents: {
        include: {
          agent_deployments: {
            where: { 
              status: 'ACTIVE',
              OR: [
                { module_enabled: true },
                { hyperliquid_agent_address: { not: null } },
              ]
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      created_at: 'asc',
    },
    take: 20,
  });

  console.log(`  Query returned: ${testQuery.length} pending signals\n`);

  // Scenario 2: Check if API would execute for a HYPERLIQUID signal
  console.log('Scenario 2: Would execute-trade-once API execute for HYPERLIQUID signal?');
  
  const agentDeployments = await prisma.agent_deployments.findMany({
    where: {
      agent_id: ringDeployment.agents.id,
      status: 'ACTIVE',
      sub_active: true,
      OR: [
        { module_enabled: true },
        { hyperliquid_agent_address: { not: null } }, // For HYPERLIQUID signals
      ]
    },
  });

  console.log(`  Deployments ready for execution: ${agentDeployments.length}\n`);

  if (agentDeployments.length > 0) {
    console.log(`  ✅ API would execute for these deployments:`);
    agentDeployments.forEach(d => {
      console.log(`    - ${d.id.substring(0, 8)}... (${d.safe_wallet.substring(0, 10)}...)`);
    });
  } else {
    console.log(`  ❌ API would NOT execute (no eligible deployments)`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ TEST COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Summary:');
  console.log(`  Agent Venue: ${ringDeployment.agents.venue}`);
  console.log(`  Module Enabled: ${ringDeployment.module_enabled}`);
  console.log(`  Would Execute: ${agentDeployments.length > 0 ? '✅ YES' : '❌ NO'}\n`);

  if (agentDeployments.length > 0) {
    console.log('🎉 FLOW TEST PASSED!');
    console.log('   Signals for this Hyperliquid agent WILL be executed');
    console.log('   even though module_enabled = false.\n');
  } else {
    console.log('❌ FLOW TEST FAILED!');
    console.log('   Signals would NOT be executed. Check requirements.\n');
  }

  await prisma.$disconnect();
}

testHyperliquidFlow().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});

