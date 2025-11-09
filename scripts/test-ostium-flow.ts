import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testOstiumFlow() {
  console.log('🔍 Testing Ostium deployment flow...\n');
  
  try {
    // Check existing deployments with agent addresses
    const deployments = await prisma.agent_deployments.findMany({
      where: {
        hyperliquid_agent_address: { not: null },
      },
      take: 2,
    });
    
    console.log(`✅ Found ${deployments.length} deployments with agent addresses`);
    
    if (deployments.length > 0) {
      console.log('\nSample deployment:');
      console.log(`  User Wallet: ${deployments[0].safe_wallet}`);
      console.log(`  Agent Address: ${deployments[0].hyperliquid_agent_address}`);
      console.log(`  Status: ${deployments[0].status}`);
    }
    
    // Get agents
    const agents = await prisma.agents.findMany({
      where: { venue: 'OSTIUM' },
    });
    
    console.log(`\n✅ Found ${agents.length} OSTIUM agents`);
    
    if (agents.length === 0) {
      console.log('\n📝 Creating test OSTIUM agent...');
      const testAgent = await prisma.agents.create({
        data: {
          name: `Test Ostium Agent ${Date.now()}`,
          creator_wallet: deployments[0]?.safe_wallet || '0xTestWallet',
          venue: 'OSTIUM',
          status: 'ACTIVE',
          weights: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        },
      });
      console.log(`✅ Created agent: ${testAgent.id}`);
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testOstiumFlow();

