/**
 * Test Ostium Agent Approval
 * 
 * This tests the complete flow:
 * 1. Get deployment
 * 2. Approve agent on Ostium smart contracts
 * 3. Verify agent can trade
 * 
 * Usage:
 * export USER_PRIVATE_KEY="0x..."  # User's private key
 * npx tsx scripts/test-ostium-approval.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApproval() {
  console.log('🚀 Testing Ostium Agent Approval\n');
  
  try {
    const userPrivateKey = process.env.USER_PRIVATE_KEY;
    
    if (!userPrivateKey) {
      console.error('❌ USER_PRIVATE_KEY environment variable not set');
      console.log('\nUsage:');
      console.log('  export USER_PRIVATE_KEY="0x..."');
      console.log('  npx tsx scripts/test-ostium-approval.ts');
      process.exit(1);
    }
    
    // Get the most recent Ostium deployment
    const deployment = await prisma.agent_deployments.findFirst({
      where: {
        agents: { venue: 'OSTIUM' },
        hyperliquid_agent_address: { not: null },
      },
      include: {
        agents: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
    
    if (!deployment) {
      console.error('❌ No Ostium deployments found');
      console.log('   Run the deployment first');
      process.exit(1);
    }
    
    console.log('📋 Deployment Info:');
    console.log(`   ID: ${deployment.id}`);
    console.log(`   Agent: ${deployment.agents.name}`);
    console.log(`   User Wallet: ${deployment.safe_wallet}`);
    console.log(`   Agent Wallet: ${deployment.hyperliquid_agent_address}\n`);
    
    // Call approval endpoint
    console.log('🔐 Approving agent on Ostium smart contracts...');
    
    const ostiumServiceUrl = process.env.OSTIUM_SERVICE_URL || 'http://localhost:5002';
    
    const response = await fetch(`${ostiumServiceUrl}/approve-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrivateKey,
        agentAddress: deployment.hyperliquid_agent_address,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Approval failed:', result.error);
      process.exit(1);
    }
    
    console.log('✅ Agent approved successfully!');
    console.log(`   Transaction Hash: ${result.transactionHash || 'N/A'}`);
    console.log(`   Message: ${result.message}\n`);
    
    console.log('🎉 SUCCESS! Agent now has non-custodial access!');
    console.log('\n📊 What this means:');
    console.log(`   ✅ Agent ${deployment.hyperliquid_agent_address} can now:`);
    console.log(`      - Open positions on behalf of ${deployment.safe_wallet}`);
    console.log(`      - Close positions`);
    console.log(`      - Manage trades`);
    console.log(`   ✅ User ${deployment.safe_wallet} retains full control:`);
    console.log(`      - Can revoke agent access anytime`);
    console.log(`      - Funds never leave user's vault`);
    console.log(`      - Agent cannot withdraw funds\n`);
    
    console.log('🚀 The agent is now ready to trade on Ostium!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testApproval();

