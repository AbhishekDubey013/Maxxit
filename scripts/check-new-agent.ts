/**
 * Check New Agent Status
 */

import { PrismaClient } from '@prisma/client';
import { getUserAgentPrivateKey } from '../lib/hyperliquid-user-wallet';

const prisma = new PrismaClient();

async function checkNewAgent() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   🔍 CHECK NEW AGENT STATUS                                   ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check agents
    const agents = await prisma.agents.findMany({
      take: 5,
    });

    console.log(`📊 Total Agents: ${agents.length}\n`);
    
    if (agents.length === 0) {
      console.log('⚠️  No agents found in database.\n');
      return;
    }

    for (const agent of agents) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🤖 Agent: ${agent.name}`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   Status: ${agent.status}`);
      console.log(`   Venue: ${agent.venue}`);
      console.log(`   Creator: ${agent.creator_wallet}`);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 2. Check deployments
    const deployments = await prisma.agent_deployments.findMany({
      include: {
        agents: true,
      },
    });

    console.log(`📦 Total Deployments: ${deployments.length}\n`);
    
    for (const deployment of deployments) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Deployment for: ${deployment.agents.name}`);
      console.log(`   ID: ${deployment.id}`);
      console.log(`   User Wallet: ${deployment.user_wallet}`);
      console.log(`   HL Agent Address: ${deployment.hyperliquid_agent_address || 'N/A'}`);
      console.log(`   Status: ${deployment.status || 'N/A'}`);
      console.log(`   Module Enabled: ${deployment.module_enabled}`);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 3. Check user wallets
    const userWallets = await prisma.user_hyperliquid_wallets.findMany({
      orderBy: { created_at: 'desc' },
    });

    console.log(`👛 Total User Wallets: ${userWallets.length}\n`);
    
    for (const wallet of userWallets) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👛 User Wallet: ${wallet.user_wallet}`);
      console.log(`   Agent Address: ${wallet.agent_address}`);
      console.log(`   Approved: ${wallet.is_approved ? '✅' : '❌'}`);
      console.log(`   Created: ${wallet.created_at}`);
      console.log(`   Last Used: ${wallet.last_used_at || 'Never'}`);

      // Test decryption
      console.log(`\n   🔓 Testing Decryption...`);
      try {
        const privateKey = await getUserAgentPrivateKey(wallet.user_wallet);
        console.log(`   ✅ Decryption successful!`);
        console.log(`   🔑 Private Key: ${privateKey.slice(0, 10)}...${privateKey.slice(-8)}`);
      } catch (error: any) {
        console.log(`   ❌ Decryption failed: ${error.message}`);
      }
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 4. Check signals
    const signals = await prisma.signals.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        agents: true,
      },
    });

    console.log(`📡 Recent Signals: ${signals.length}\n`);
    
    for (const signal of signals) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📡 Signal for: ${signal.agents.name}`);
      console.log(`   Token: ${signal.token_symbol}`);
      console.log(`   Side: ${signal.side}`);
      console.log(`   Size: ${signal.size_model}`);
      console.log(`   Executed: ${signal.executed ? '✅' : '❌'}`);
      console.log(`   Created: ${signal.created_at}`);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 5. Check positions
    const positions = await prisma.positions.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        agents: true,
      },
    });

    console.log(`💼 Recent Positions: ${positions.length}\n`);
    
    for (const position of positions) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`💼 Position for: ${position.agents.name}`);
      console.log(`   Token: ${position.token_symbol}`);
      console.log(`   Side: ${position.side}`);
      console.log(`   Size: ${position.size}`);
      console.log(`   Entry: $${position.entry_price}`);
      console.log(`   Status: ${position.status || 'OPEN'}`);
      console.log(`   Venue: ${position.venue}`);
      console.log(`   Created: ${position.created_at}`);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log('✅ Check complete!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewAgent();

