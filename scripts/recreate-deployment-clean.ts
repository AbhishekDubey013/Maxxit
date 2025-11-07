/**
 * Recreate deployment and user wallet with clean encryption
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import crypto from 'crypto';

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.AGENT_WALLET_ENCRYPTION_KEY;

function encryptPrivateKey(privateKey: string): { encrypted: string; iv: string; tag: string } {
  if (!ENCRYPTION_KEY) {
    throw new Error('AGENT_WALLET_ENCRYPTION_KEY not set');
  }

  // Hash the encryption key to get the 256-bit key (matching API decryption)
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

async function recreateDeployment() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          RECREATE DEPLOYMENT WITH CLEAN ENCRYPTION            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Find ARES agent
    const agent = await prisma.agents.findFirst({
      where: { name: 'ARES', status: 'ACTIVE' }
    });

    if (!agent) {
      console.error('❌ ARES agent not found');
      return;
    }

    const userWallet = '0xa10846a81528d429b50b0dcbf8968938a572fac5';

    // Delete existing deployment
    const existingDeployment = await prisma.agent_deployments.findFirst({
      where: { agent_id: agent.id }
    });

    if (existingDeployment) {
      console.log(`🗑️  Deleting existing deployment: ${existingDeployment.id}`);
      await prisma.agent_deployments.delete({
        where: { id: existingDeployment.id }
      });
    }

    // Generate new agent wallet
    const agentWallet = ethers.Wallet.createRandom();
    const agentAddress = agentWallet.address;
    const agentPrivateKey = agentWallet.privateKey;

    console.log(`\n🔐 Generated new agent wallet:`);
    console.log(`   Address: ${agentAddress}`);

    // Encrypt private key
    const { encrypted, iv, tag } = encryptPrivateKey(agentPrivateKey);
    console.log(`   ✅ Private key encrypted`);

    // Create deployment
    const deployment = await prisma.agent_deployments.create({
      data: {
        agent_id: agent.id,
        user_wallet: userWallet.toLowerCase(),
        safe_wallet: userWallet.toLowerCase(),
        hyperliquid_agent_address: agentAddress,
        hyperliquid_agent_key_encrypted: encrypted,
        hyperliquid_agent_key_iv: iv,
        hyperliquid_agent_key_tag: tag,
        status: 'ACTIVE',
        sub_active: true,
      }
    });

    console.log(`\n✅ Deployment created: ${deployment.id}`);

    // Create/update user_hyperliquid_wallets record
    const existingUserWallet = await prisma.user_hyperliquid_wallets.findUnique({
      where: { user_wallet: userWallet }
    });

    if (existingUserWallet) {
      await prisma.user_hyperliquid_wallets.update({
        where: { user_wallet: userWallet },
        data: {
          agent_address: agentAddress,
          agent_private_key_encrypted: encrypted,
          agent_key_iv: iv,
          agent_key_tag: tag,
          is_approved: true,
        }
      });
      console.log(`✅ Updated user_hyperliquid_wallets record`);
    } else {
      await prisma.user_hyperliquid_wallets.create({
        data: {
          user_wallet: userWallet,
          agent_address: agentAddress,
          agent_private_key_encrypted: encrypted,
          agent_key_iv: iv,
          agent_key_tag: tag,
          is_approved: true,
        }
      });
      console.log(`✅ Created user_hyperliquid_wallets record`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPLOYMENT READY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT: Approve agent on Hyperliquid testnet:');
    console.log(`   1. Go to: https://app.hyperliquid-testnet.xyz/API`);
    console.log(`   2. Connect wallet: ${userWallet}`);
    console.log(`   3. Authorize agent: ${agentAddress}`);
    console.log(`   4. Agent name: ARES-Agent\n`);
    console.log('Then run: npx tsx workers/trade-executor-worker.ts\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

recreateDeployment();

