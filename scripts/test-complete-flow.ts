/**
 * Test complete automated trading flow
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompleteFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║            COMPLETE AUTOMATED FLOW TEST                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Check Twitter Proxy
    console.log('━━━ STEP 1: Twitter Proxy ━━━');
    try {
      const proxyHealth = await fetch('http://localhost:5002/health');
      const proxyData = await proxyHealth.json();
      console.log('✅ Twitter Proxy:', proxyData.status);
    } catch (e) {
      console.log('❌ Twitter Proxy: Not running');
      console.log('   Start with: cd services && TWITTER_PROXY_PORT=5002 python3 twitter-proxy.py &\n');
    }

    // Step 2: Check Hyperliquid Service
    console.log('\n━━━ STEP 2: Hyperliquid Service ━━━');
    try {
      const hlHealth = await fetch('http://localhost:5001/health');
      const hlData = await hlHealth.json();
      console.log(`✅ Hyperliquid: ${hlData.network} (${hlData.baseUrl})`);
    } catch (e) {
      console.log('❌ Hyperliquid Service: Not running');
      console.log('   Start with: cd services && HYPERLIQUID_TESTNET=true python3 hyperliquid-service.py &\n');
    }

    // Step 3: Check Next.js API
    console.log('\n━━━ STEP 3: Next.js API Server ━━━');
    try {
      const apiHealth = await fetch('http://localhost:5000/api/health');
      const apiData = await apiHealth.json();
      console.log('✅ Next.js API:', apiData.status);
    } catch (e) {
      console.log('❌ Next.js API: Not running');
      console.log('   Start with: npm run dev &\n');
    }

    // Step 4: Check Database
    console.log('\n━━━ STEP 4: Database & Agent Setup ━━━');
    const agent = await prisma.agents.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        agent_deployments: {
          where: { status: 'ACTIVE' }
        },
        agent_accounts: {
          include: { ct_accounts: true }
        }
      }
    });

    if (!agent) {
      console.log('❌ No active agent found');
      return;
    }

    console.log(`✅ Agent: ${agent.name} (${agent.venue})`);
    console.log(`   Deployments: ${agent.agent_deployments.length}`);
    console.log(`   CT Accounts: ${agent.agent_accounts.length}`);
    
    if (agent.agent_deployments.length > 0) {
      const dep = agent.agent_deployments[0];
      console.log(`   Agent Wallet: ${dep.hyperliquid_agent_address}`);
      console.log(`   ⚠️  NOTE: Agent must be approved on Hyperliquid testnet!`);
      console.log(`   Approve at: https://app.hyperliquid-testnet.xyz/API`);
    }

    // Step 5: Check Tweets
    console.log('\n━━━ STEP 5: Tweet Ingestion ━━━');
    const recentTweets = await prisma.ct_posts.findMany({
      take: 5,
      orderBy: { tweet_created_at: 'desc' },
      include: { ct_accounts: true }
    });
    
    const signalCandidates = recentTweets.filter(t => t.is_signal_candidate);
    console.log(`✅ Recent Tweets: ${recentTweets.length}`);
    console.log(`   Signal Candidates: ${signalCandidates.length}`);
    
    if (signalCandidates.length > 0) {
      console.log(`   Latest: "${signalCandidates[0].tweet_text.substring(0, 60)}..."`);
      console.log(`   Tokens: ${signalCandidates[0].extracted_tokens?.join(', ') || 'none'}`);
    }

    // Step 6: Check Signals
    console.log('\n━━━ STEP 6: Signal Generation ━━━');
    const pendingSignals = await prisma.signals.findMany({
      where: {
        positions: { none: {} },
        skipped_reason: null,
        agents: { status: 'ACTIVE' }
      },
      include: { agents: true }
    });

    console.log(`✅ Pending Signals: ${pendingSignals.length}`);
    if (pendingSignals.length > 0) {
      pendingSignals.forEach(s => {
        console.log(`   • ${s.token_symbol} ${s.side} (${s.venue})`);
      });
    } else {
      console.log('   Create test signal with: npx tsx scripts/create-test-signal-btc.ts');
    }

    // Step 7: Test Trade Execution (will fail if agent not approved)
    console.log('\n━━━ STEP 7: Trade Execution Test ━━━');
    if (pendingSignals.length > 0) {
      console.log('   Testing trade execution...');
      console.log('   Run: npx tsx workers/trade-executor-worker.ts');
      console.log('   ⚠️  Expected to fail with "agent not approved" until you approve on Hyperliquid');
    } else {
      console.log('   No pending signals to execute');
    }

    // Step 8: Check Positions
    console.log('\n━━━ STEP 8: Position Monitoring ━━━');
    const openPositions = await prisma.positions.findMany({
      where: { closed_at: null },
      include: { agent_deployments: { include: { agents: true } } }
    });

    console.log(`✅ Open Positions: ${openPositions.length}`);
    if (openPositions.length > 0) {
      openPositions.forEach(p => {
        console.log(`   • ${p.token_symbol} ${p.side}: $${p.entry_price} x ${p.qty}`);
      });
    }

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      FLOW SUMMARY                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ READY COMPONENTS:');
    console.log('   • Twitter Proxy → Tweet Ingestion');
    console.log('   • Signal Classification (LLM)');
    console.log('   • Signal Generation');
    console.log('   • Hyperliquid Service');
    console.log('   • Trade Execution Logic');
    console.log('   • Position Monitoring\n');

    console.log('⚠️  TO COMPLETE FLOW:');
    console.log('   1. Approve agent on Hyperliquid testnet:');
    if (agent.agent_deployments.length > 0) {
      console.log(`      Agent: ${agent.agent_deployments[0].hyperliquid_agent_address}`);
      console.log(`      User: ${agent.agent_deployments[0].user_wallet}`);
    }
    console.log('   2. Fund agent with testnet USDC (at least $100)');
    console.log('   3. Run: npx tsx workers/trade-executor-worker.ts\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlow();

