/**
 * Complete End-to-End Local Testing Script
 * Tests the complete flow: Service Health → Signal Creation → Trade Execution → Position Monitoring
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';
const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000';

async function testCompleteFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     🧪 COMPLETE END-TO-END LOCAL TESTING                     ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let testPassed = 0;
  let testFailed = 0;

  // ========================================================================
  // TEST 1: Service Health Checks
  // ========================================================================
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST 1: Service Health Checks');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const hlHealth = await axios.get(`${HYPERLIQUID_SERVICE_URL}/health`);
    console.log('✅ Hyperliquid Service: HEALTHY');
    console.log(`   Response:`, hlHealth.data);
    testPassed++;
  } catch (error: any) {
    console.log('❌ Hyperliquid Service: FAILED');
    console.log(`   Error: ${error.message}`);
    testFailed++;
  }

  try {
    const nextjsHealth = await axios.get(`${NEXTJS_URL}/api/health`);
    console.log('✅ Next.js Service: HEALTHY');
    console.log(`   Response:`, nextjsHealth.data);
    testPassed++;
  } catch (error: any) {
    console.log('❌ Next.js Service: FAILED');
    console.log(`   Error: ${error.message}`);
    testFailed++;
  }

  try {
    const agentCount = await prisma.agents.count();
    console.log('✅ Database: CONNECTED');
    console.log(`   Agents in database: ${agentCount}`);
    testPassed++;
  } catch (error: any) {
    console.log('❌ Database: FAILED');
    console.log(`   Error: ${error.message}`);
    testFailed++;
  }

  console.log('');

  // ========================================================================
  // TEST 2: Hyperliquid Service Endpoints
  // ========================================================================
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST 2: Hyperliquid Service Endpoints');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const marketInfo = await axios.post(`${HYPERLIQUID_SERVICE_URL}/market-info`, {
      coin: 'SOL'
    });
    console.log('✅ Market Info Endpoint: WORKING');
    console.log(`   SOL Price: $${marketInfo.data.marketInfo?.markPx || 'N/A'}`);
    testPassed++;
  } catch (error: any) {
    console.log('❌ Market Info Endpoint: FAILED');
    console.log(`   Error: ${error.message}`);
    testFailed++;
  }

  console.log('');

  // ========================================================================
  // TEST 3: Find Active Hyperliquid Deployment
  // ========================================================================
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST 3: Find Active Hyperliquid Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let deployment = await prisma.agent_deployments.findFirst({
    where: {
      status: 'ACTIVE',
      sub_active: true,
      hyperliquid_agent_address: { not: null }
    },
    include: {
      agents: true
    }
  });

  if (!deployment) {
    console.log('⚠️  No active Hyperliquid deployment found');
    console.log('   Creating test deployment...\n');
    
    // Try to find any agent to use for testing
    const agent = await prisma.agents.findFirst({
      where: { status: 'ACTIVE' }
    });
    
    if (!agent) {
      console.log('❌ No active agents found. Cannot proceed with tests.');
      console.log('   Please create an agent first via the UI.');
      await prisma.$disconnect();
      process.exit(1);
    }
    
    // For testing, we'll skip creating a deployment
    // User should set up at least one Hyperliquid deployment
    console.log('❌ Test requires at least one Hyperliquid deployment');
    console.log('   Please set up Hyperliquid for an agent via the UI');
    console.log(`   Agent found: ${agent.name} (${agent.id})`);
    testFailed++;
  } else {
    console.log('✅ Active Hyperliquid Deployment Found');
    console.log(`   Agent: ${deployment.agents.name}`);
    console.log(`   Deployment ID: ${deployment.id.substring(0, 8)}...`);
    console.log(`   User Address: ${deployment.safe_wallet}`);
    console.log(`   Agent Address: ${deployment.hyperliquid_agent_address}`);
    testPassed++;
  }

  console.log('');

  // ========================================================================
  // TEST 4: Create Test Signal
  // ========================================================================
  
  if (deployment) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  TEST 4: Create Test Signal');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      const signal = await prisma.signals.create({
        data: {
          agent_id: deployment.agents.id,
          token_symbol: 'SOL',
          side: 'LONG',
          venue: 'HYPERLIQUID',
          size_model: { type: 'fixed', value: 0.05 },
          risk_model: {
            stopLoss: null,
            takeProfit: null,
            trailingStop: 0.01
          },
          source_tweets: [`LOCAL_TEST_${Date.now()}`],
          proof_verified: true,
          executor_agreement_verified: true,
        }
      });

      console.log('✅ Test Signal Created');
      console.log(`   Signal ID: ${signal.id}`);
      console.log(`   Token: ${signal.token_symbol}`);
      console.log(`   Side: ${signal.side}`);
      console.log(`   Venue: ${signal.venue}`);
      testPassed++;

      console.log('');

      // ========================================================================
      // TEST 5: Execute Trade
      // ========================================================================
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  TEST 5: Execute Trade via API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      try {
        console.log('Calling execute-trade-once API...');
        const executeResult = await axios.post(
          `${NEXTJS_URL}/api/admin/execute-trade-once?signalId=${signal.id}`,
          {},
          { timeout: 30000 }
        );

        if (executeResult.data.success && executeResult.data.positionsCreated > 0) {
          console.log('✅ Trade Executed Successfully');
          console.log(`   Positions Created: ${executeResult.data.positionsCreated}`);
          
          if (executeResult.data.positions && executeResult.data.positions[0]) {
            const position = executeResult.data.positions[0];
            console.log(`   Position ID: ${position.id}`);
            console.log(`   Entry Price: ${position.entry_price || 'N/A'}`);
          }
          testPassed++;
        } else {
          console.log('❌ Trade Execution Failed');
          console.log(`   Response:`, executeResult.data);
          testFailed++;
        }
      } catch (error: any) {
        console.log('❌ Trade Execution Failed');
        console.log(`   Error: ${error.message}`);
        if (error.response?.data) {
          console.log(`   API Response:`, error.response.data);
        }
        testFailed++;
      }

      console.log('');

      // ========================================================================
      // TEST 6: Verify Position Created
      // ========================================================================
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  TEST 6: Verify Position in Database');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const position = await prisma.positions.findFirst({
        where: {
          signal_id: signal.id,
          deployment_id: deployment.id
        }
      });

      if (position) {
        console.log('✅ Position Found in Database');
        console.log(`   Position ID: ${position.id}`);
        console.log(`   Token: ${position.token_symbol}`);
        console.log(`   Side: ${position.side}`);
        console.log(`   Entry Price: ${position.entry_price || 'N/A'}`);
        console.log(`   Quantity: ${position.qty}`);
        console.log(`   Opened At: ${position.opened_at.toISOString()}`);
        testPassed++;

        // ========================================================================
        // TEST 7: Verify Position on Hyperliquid
        // ========================================================================
        
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  TEST 7: Verify Position on Hyperliquid');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        try {
          const hlPositions = await axios.post(`${HYPERLIQUID_SERVICE_URL}/positions`, {
            userAddress: deployment.safe_wallet
          });

          if (hlPositions.data.success && hlPositions.data.positions) {
            const foundPosition = hlPositions.data.positions.find(
              (p: any) => p.position.coin === position.token_symbol
            );

            if (foundPosition) {
              console.log('✅ Position Found on Hyperliquid');
              console.log(`   Coin: ${foundPosition.position.coin}`);
              console.log(`   Size: ${foundPosition.position.szi}`);
              console.log(`   Entry Price: ${foundPosition.position.entryPx}`);
              console.log(`   Unrealized PnL: $${foundPosition.unrealizedPnl}`);
              testPassed++;
            } else {
              console.log('⚠️  Position not found on Hyperliquid');
              console.log('   This may be expected if:');
              console.log('   - Order was rejected by Hyperliquid');
              console.log('   - Order size was too small');
              console.log('   - Market was at open interest cap');
              testFailed++;
            }
          }
        } catch (error: any) {
          console.log('❌ Failed to fetch Hyperliquid positions');
          console.log(`   Error: ${error.message}`);
          testFailed++;
        }
      } else {
        console.log('❌ Position Not Found in Database');
        testFailed++;
      }
    } catch (error: any) {
      console.log('❌ Failed to create test signal');
      console.log(`   Error: ${error.message}`);
      testFailed++;
    }
  }

  // ========================================================================
  // TEST SUMMARY
  // ========================================================================
  
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     📊 TEST SUMMARY                                           ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Tests Passed: ${testPassed}`);
  console.log(`Tests Failed: ${testFailed}`);
  console.log(`Total Tests:  ${testPassed + testFailed}`);
  console.log('');

  if (testFailed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('Your local setup is working perfectly!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Monitor logs: tail -f logs/*.log');
    console.log('  2. Watch positions: npx tsx scripts/check-hyperliquid-positions.ts');
    console.log('  3. Test UI: http://localhost:3000');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Check service logs: tail -f /tmp/hyperliquid-service.log');
    console.log('  2. Check worker logs: tail -f logs/*.log');
    console.log('  3. Verify environment variables in .env');
    console.log('  4. Ensure Hyperliquid agent is approved on Hyperliquid UI');
  }

  console.log('');
  await prisma.$disconnect();
  process.exit(testFailed === 0 ? 0 : 1);
}

testCompleteFlow().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  prisma.$disconnect();
  process.exit(1);
});

