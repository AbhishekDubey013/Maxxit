/**
 * Debug agent private key retrieval
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAgentKey() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                   DEBUG AGENT KEY RETRIEVAL                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Get deployment
    const deployment = await prisma.agent_deployments.findFirst({
      where: {
        hyperliquid_agent_address: { not: null }
      },
      include: {
        agents: true
      }
    });

    if (!deployment) {
      console.error('❌ No deployment found');
      return;
    }

    console.log('📦 DEPLOYMENT:');
    console.log(`   ID: ${deployment.id}`);
    console.log(`   User wallet: ${deployment.user_wallet}`);
    console.log(`   Safe wallet: ${deployment.safe_wallet}`);
    console.log(`   HL Agent address: ${deployment.hyperliquid_agent_address}`);
    console.log(`   Has encrypted key in deployment: ${!!deployment.hyperliquid_agent_key_encrypted}`);
    console.log();

    // Check user_hyperliquid_wallets table
    const userWallet = await prisma.user_hyperliquid_wallets.findUnique({
      where: {
        user_wallet: deployment.user_wallet
      }
    });

    console.log('🔑 USER_HYPERLIQUID_WALLETS TABLE:');
    if (userWallet) {
      console.log(`   ✅ Record found`);
      console.log(`   User wallet: ${userWallet.user_wallet}`);
      console.log(`   Agent address: ${userWallet.agent_address}`);
      console.log(`   Has encrypted key: ${!!userWallet.agent_private_key_encrypted}`);
      console.log(`   Is approved: ${userWallet.is_approved}`);
      console.log();
      
      // Check if addresses match (case-insensitive)
      const addressesMatch = userWallet.agent_address.toLowerCase() === deployment.hyperliquid_agent_address!.toLowerCase();
      console.log(`   Addresses match: ${addressesMatch ? '✅ YES' : '❌ NO'}`);
      if (!addressesMatch) {
        console.log(`     Deployment: ${deployment.hyperliquid_agent_address!.toLowerCase()}`);
        console.log(`     User table: ${userWallet.agent_address.toLowerCase()}`);
      }
    } else {
      console.log(`   ❌ No record found`);
      console.log(`   Looking for: ${deployment.user_wallet}`);
    }
    console.log();

    // Try the same query that getAgentPrivateKey uses
    const queryResult = await prisma.$queryRaw<Array<{
      id: string;
      agent_private_key_encrypted: string;
      agent_key_iv: string;
      agent_key_tag: string;
    }>>`
      SELECT id, agent_private_key_encrypted, agent_key_iv, agent_key_tag
      FROM user_hyperliquid_wallets
      WHERE LOWER(user_wallet) = LOWER(${deployment.user_wallet})
      AND LOWER(agent_address) = LOWER(${deployment.hyperliquid_agent_address})
      LIMIT 1
    `;

    console.log('🔍 RAW SQL QUERY RESULT:');
    if (queryResult.length > 0) {
      console.log(`   ✅ Found ${queryResult.length} record(s)`);
      const record = queryResult[0];
      console.log(`   Has encrypted key: ${!!record.agent_private_key_encrypted}`);
      console.log(`   Has IV: ${!!record.agent_key_iv}`);
      console.log(`   Has tag: ${!!record.agent_key_tag}`);
    } else {
      console.log(`   ❌ No records found`);
      console.log(`   Query used:`);
      console.log(`     LOWER(user_wallet) = ${deployment.user_wallet.toLowerCase()}`);
      console.log(`     LOWER(agent_address) = ${deployment.hyperliquid_agent_address!.toLowerCase()}`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugAgentKey();

