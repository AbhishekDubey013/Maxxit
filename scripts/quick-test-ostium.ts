import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickTest() {
  console.log('🔍 Testing Ostium deployment flow...\n');
  
  try {
    // Test 1: Database connection
    const agentCount = await prisma.agents.count();
    console.log(`✅ Database connected. Total agents: ${agentCount}`);
    
    // Test 2: Check wallet pool
    const poolWallets = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM wallet_pool WHERE is_assigned = false
    `;
    console.log(`✅ Available wallets in pool: ${poolWallets[0].count}`);
    
    // Test 3: Check existing deployments
    const deploymentCount = await prisma.agent_deployments.count();
    console.log(`✅ Total deployments: ${deploymentCount}`);
    
    console.log('\n🎉 All basic tests passed!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();

