/**
 * Sync agent wallet from deployment to user_hyperliquid_wallets table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncAgentWallet() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           SYNC AGENT WALLET TO USER TABLE                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Find deployment with agent wallet
    const deployment = await prisma.agent_deployments.findFirst({
      where: {
        hyperliquid_agent_address: { not: null },
        hyperliquid_agent_key_encrypted: { not: null },
      }
    });

    if (!deployment) {
      console.error('❌ No deployment with agent wallet found');
      return;
    }

    console.log(`✅ Found deployment with agent wallet`);
    console.log(`   User wallet: ${deployment.user_wallet}`);
    console.log(`   Agent address: ${deployment.hyperliquid_agent_address}`);

    // Check if user wallet record exists
    const existingUserWallet = await prisma.user_hyperliquid_wallets.findUnique({
      where: { user_wallet: deployment.user_wallet }
    });

    if (existingUserWallet) {
      // Update existing record
      await prisma.user_hyperliquid_wallets.update({
        where: { user_wallet: deployment.user_wallet },
        data: {
          agent_address: deployment.hyperliquid_agent_address!,
          agent_private_key_encrypted: deployment.hyperliquid_agent_key_encrypted!,
          agent_key_iv: deployment.hyperliquid_agent_key_iv!,
          agent_key_tag: deployment.hyperliquid_agent_key_tag!,
          is_approved: true,
          last_used_at: new Date(),
        }
      });
      console.log('\n✅ Updated existing user wallet record');
    } else {
      // Create new record
      await prisma.user_hyperliquid_wallets.create({
        data: {
          user_wallet: deployment.user_wallet,
          agent_address: deployment.hyperliquid_agent_address!,
          agent_private_key_encrypted: deployment.hyperliquid_agent_key_encrypted!,
          agent_key_iv: deployment.hyperliquid_agent_key_iv!,
          agent_key_tag: deployment.hyperliquid_agent_key_tag!,
          is_approved: true,
        }
      });
      console.log('\n✅ Created new user wallet record');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Agent wallet synced successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Now run: npx tsx workers/trade-executor-worker.ts\n');

  } catch (error: any) {
    console.error('\n❌ Error syncing wallet:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncAgentWallet();

