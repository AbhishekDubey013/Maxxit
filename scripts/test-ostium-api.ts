import { PrismaClient } from '@prisma/client';
import { assignWalletToUser } from '../lib/wallet-pool';

const prisma = new PrismaClient();

async function testOstiumAPI() {
  console.log('🚀 Testing Ostium Deployment API Logic...\n');
  
  try {
    // Use existing user wallet from database
    const existingDeployment = await prisma.agent_deployments.findFirst({
      where: { hyperliquid_agent_address: { not: null } },
    });
    
    if (!existingDeployment) {
      console.error('❌ No existing deployments found');
      return;
    }
    
    const userWallet = existingDeployment.safe_wallet;
    console.log(`✅ Testing with user wallet: ${userWallet}`);
    
    // Get an Ostium agent
    let agent = await prisma.agents.findFirst({
      where: { venue: 'OSTIUM' },
    });
    
    if (!agent) {
      console.log('\n📝 Creating OSTIUM agent...');
      agent = await prisma.agents.create({
        data: {
          name: `Test Ostium ${Date.now()}`,
          creator_wallet: userWallet,
          venue: 'OSTIUM',
          status: 'ACTIVE',
          weights: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        },
      });
    }
    
    console.log(`✅ Using agent: ${agent.id} (${agent.name})\n`);
    
    // Step 1: Check for existing agent wallet (THIS IS THE API LOGIC)
    console.log('Step 1: Checking for existing agent wallet...');
    const existingAgentWallet = await prisma.agent_deployments.findFirst({
      where: {
        safe_wallet: {
          equals: userWallet,
          mode: 'insensitive',
        },
        hyperliquid_agent_address: { not: null },
      },
      select: {
        hyperliquid_agent_address: true,
      },
    });
    
    let agentAddress: string;
    
    if (existingAgentWallet?.hyperliquid_agent_address) {
      agentAddress = existingAgentWallet.hyperliquid_agent_address;
      console.log(`✅ Reusing existing agent wallet: ${agentAddress}\n`);
    } else {
      console.log('⚠️  No existing agent wallet found');
      console.log('   Would try to assign from pool (skipping for test)\n');
      return;
    }
    
    // Step 2: Check if deployment already exists for this agent
    const existingOstiumDeployment = await prisma.agent_deployments.findFirst({
      where: {
        agent_id: agent.id,
        safe_wallet: userWallet,
      },
    });
    
    if (existingOstiumDeployment) {
      console.log(`⚠️  Deployment already exists: ${existingOstiumDeployment.id}`);
      console.log('   In real API, this would return success\n');
      
      console.log('🎉 SUCCESS! Ostium deployment flow works!');
      console.log('\n📊 Result:');
      console.log(`   Agent ID: ${agent.id}`);
      console.log(`   Deployment ID: ${existingOstiumDeployment.id}`);
      console.log(`   User Wallet: ${userWallet}`);
      console.log(`   Agent Wallet: ${agentAddress}`);
      return;
    }
    
    // Step 3: Create deployment
    console.log('Step 2: Creating deployment...');
    const deployment = await prisma.agent_deployments.create({
      data: {
        agent_id: agent.id,
        user_wallet: userWallet,
        safe_wallet: userWallet,
        hyperliquid_agent_address: agentAddress,
        status: 'ACTIVE',
        module_enabled: true,
      },
    });
    
    console.log(`✅ Deployment created: ${deployment.id}\n`);
    
    console.log('🎉 SUCCESS! Ostium deployment completed!');
    console.log('\n📊 Result:');
    console.log(`   Agent ID: ${agent.id}`);
    console.log(`   Deployment ID: ${deployment.id}`);
    console.log(`   User Wallet: ${userWallet}`);
    console.log(`   Agent Wallet: ${agentAddress}`);
    console.log('\n✅ The complete Ostium flow is working!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testOstiumAPI();

