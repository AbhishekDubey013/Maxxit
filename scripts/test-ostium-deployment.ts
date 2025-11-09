/**
 * Test Ostium End-to-End Deployment
 * 
 * Usage:
 * export TEST_WALLET_PK="0x..."  # Your private key
 * npx ts-node scripts/test-ostium-deployment.ts
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

async function testOstiumDeployment() {
  console.log('\n🚀 Starting Ostium Deployment Test\n');

  // 1. Get wallet from private key
  const privateKey = process.env.TEST_WALLET_PK;
  if (!privateKey) {
    console.error('❌ Error: TEST_WALLET_PK environment variable not set');
    console.log('Usage: export TEST_WALLET_PK="0x..." && npx ts-node scripts/test-ostium-deployment.ts');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);
  const userWallet = wallet.address;
  console.log(`✅ User Wallet: ${userWallet}\n`);

  // 2. Create a test Ostium agent
  console.log('📝 Creating test Ostium agent...');
  
  const agent = await prisma.agents.create({
    data: {
      name: `Test Ostium Agent ${Date.now()}`,
      creatorWallet: userWallet,
      venue: 'OSTIUM',
      status: 'ACTIVE',
      weights: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    },
  });

  console.log(`✅ Agent Created: ${agent.id}`);
  console.log(`   Name: ${agent.name}`);
  console.log(`   Venue: ${agent.venue}\n`);

  // 3. Check for existing agent wallet
  console.log('🔍 Checking for existing agent wallet...');
  
  const existingDeployment = await prisma.agent_deployments.findFirst({
    where: {
      safeWallet: {
        equals: userWallet,
        mode: 'insensitive',
      },
      hyperliquidAgentAddress: { not: null },
    },
    select: {
      hyperliquidAgentAddress: true,
    },
  });

  let agentAddress: string;

  if (existingDeployment?.hyperliquidAgentAddress) {
    agentAddress = existingDeployment.hyperliquidAgentAddress;
    console.log(`✅ Found existing agent wallet: ${agentAddress}\n`);
  } else {
    console.log('⚠️  No existing agent wallet found');
    console.log('   Checking wallet pool...\n');

    // Check wallet pool
    const poolWallets = await prisma.$queryRaw<any[]>`
      SELECT * FROM wallet_pool 
      WHERE is_assigned = false 
      LIMIT 1
    `;

    if (poolWallets.length === 0) {
      console.error('❌ Error: No available wallets in pool');
      console.log('\n💡 Solution: Add a wallet to the pool:');
      console.log('   INSERT INTO wallet_pool (id, address, private_key, is_assigned)');
      console.log('   VALUES (uuid_generate_v4(), \'0x...\', \'0x...\', false);');
      process.exit(1);
    }

    agentAddress = poolWallets[0].address;
    
    // Assign wallet
    await prisma.$executeRaw`
      UPDATE wallet_pool 
      SET is_assigned = true,
          assigned_to_user = ${userWallet.toLowerCase()},
          assigned_at = NOW()
      WHERE id = ${poolWallets[0].id}
    `;

    console.log(`✅ Assigned new agent wallet: ${agentAddress}\n`);
  }

  // 4. Create deployment
  console.log('📦 Creating deployment...');
  
  const deployment = await prisma.agent_deployments.create({
    data: {
      agentId: agent.id,
      safeWallet: userWallet,
      hyperliquidAgentAddress: agentAddress,
      status: 'ACTIVE',
      moduleEnabled: true,
    },
  });

  console.log(`✅ Deployment Created: ${deployment.id}`);
  console.log(`   User Wallet: ${deployment.safeWallet}`);
  console.log(`   Agent Wallet: ${deployment.hyperliquidAgentAddress}`);
  console.log(`   Status: ${deployment.status}\n`);

  // 5. Summary
  console.log('🎉 SUCCESS! Ostium Deployment Complete\n');
  console.log('📊 Summary:');
  console.log(`   Agent ID: ${agent.id}`);
  console.log(`   Deployment ID: ${deployment.id}`);
  console.log(`   User Wallet: ${userWallet}`);
  console.log(`   Agent Wallet: ${agentAddress}`);
  console.log('\n✅ The agent is now ready to trade on Ostium!');
  console.log('   The agent wallet can execute trades on behalf of the user wallet.\n');

  await prisma.$disconnect();
}

testOstiumDeployment()
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

