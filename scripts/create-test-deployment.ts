/**
 * Create a test deployment for Hyperliquid agent
 * This simulates what happens when user authorizes the agent
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption key from env
const ENCRYPTION_KEY = process.env.AGENT_WALLET_ENCRYPTION_KEY;

function encryptPrivateKey(privateKey: string): { encrypted: string; iv: string; tag: string } {
  if (!ENCRYPTION_KEY) {
    throw new Error('AGENT_WALLET_ENCRYPTION_KEY not set');
  }

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
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

async function createTestDeployment() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              CREATE TEST DEPLOYMENT                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Find ARES agent
    const agent = await prisma.agents.findFirst({
      where: { 
        name: 'ARES',
        status: 'ACTIVE'
      }
    });

    if (!agent) {
      console.error('❌ ARES agent not found');
      return;
    }

    console.log(`✅ Found agent: ${agent.name} (${agent.id})`);

    // Check if deployment already exists
    const existingDeployment = await prisma.agent_deployments.findFirst({
      where: { agent_id: agent.id }
    });

    if (existingDeployment) {
      console.log(`\n⚠️  Deployment already exists: ${existingDeployment.id}`);
      console.log(`   User wallet: ${existingDeployment.user_wallet}`);
      console.log(`   Safe wallet: ${existingDeployment.safe_wallet}`);
      if (existingDeployment.hyperliquid_agent_address) {
        console.log(`   HL Agent: ${existingDeployment.hyperliquid_agent_address}`);
      }
      
      // Update it to be active
      await prisma.agent_deployments.update({
        where: { id: existingDeployment.id },
        data: {
          status: 'ACTIVE',
          sub_active: true,
        }
      });
      console.log('\n✅ Updated deployment to ACTIVE');
      return;
    }

    // Generate a test user wallet address
    const testUserWallet = '0xa10846a81528d429b50b0dcbf8968938a572fac5'; // Your existing wallet

    // Generate unique agent wallet for Hyperliquid
    const agentWallet = ethers.Wallet.createRandom();
    const agentAddress = agentWallet.address;
    const agentPrivateKey = agentWallet.privateKey;

    console.log(`\n🔐 Generated Hyperliquid Agent Wallet:`);
    console.log(`   Address: ${agentAddress}`);
    console.log(`   (Private key encrypted and stored securely)`);

    // Encrypt private key
    const { encrypted, iv, tag } = encryptPrivateKey(agentPrivateKey);

    // Create deployment
    const deployment = await prisma.agent_deployments.create({
      data: {
        agent_id: agent.id,
        user_wallet: testUserWallet.toLowerCase(),
        safe_wallet: testUserWallet.toLowerCase(),
        hyperliquid_agent_address: agentAddress,
        hyperliquid_agent_key_encrypted: encrypted,
        hyperliquid_agent_key_iv: iv,
        hyperliquid_agent_key_tag: tag,
        status: 'ACTIVE',
        sub_active: true,
      }
    });

    console.log(`\n✅ Deployment created successfully!`);
    console.log(`   Deployment ID: ${deployment.id}`);
    console.log(`   Status: ${deployment.status}`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('📝 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. ⚠️  IMPORTANT: Approve agent on Hyperliquid testnet:');
    console.log(`   - Go to: https://app.hyperliquid-testnet.xyz/API`);
    console.log(`   - Connect with: ${testUserWallet}`);
    console.log(`   - Authorize agent: ${agentAddress}`);
    console.log(`   - Agent name: ARES-Agent\n`);
    console.log('2. Fund the agent with testnet USDC:');
    console.log(`   - Transfer at least $100 USDC to: ${agentAddress}\n`);
    console.log('3. Run signal generator:');
    console.log('   npx tsx workers/signal-generator.ts\n');
    console.log('4. Run trade executor:');
    console.log('   npx tsx workers/trade-executor-worker.ts\n');

  } catch (error: any) {
    console.error('\n❌ Error creating deployment:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestDeployment();

