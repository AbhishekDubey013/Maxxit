/**
 * Diagnose WETH pre-trade validation failure
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Diagnosing WETH Pre-Trade Validation\n');
    console.log('═══════════════════════════════════════════════\n');

    // 1. Check venueStatus for WETH
    console.log('1️⃣ Checking venueStatus for WETH...\n');
    
    const venueStatus = await prisma.venueStatus.findUnique({
      where: {
        venue_tokenSymbol: {
          venue: 'SPOT',
          tokenSymbol: 'WETH',
        },
      },
    });

    if (venueStatus) {
      console.log('✅ WETH found in venueStatus:');
      console.log(`   Venue: ${venueStatus.venue}`);
      console.log(`   Token: ${venueStatus.tokenSymbol}`);
      console.log(`   Available: ${venueStatus.isAvailable ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ WETH NOT found in venueStatus!');
      console.log('   This will cause pre-trade validation to fail.');
    }
    console.log('');

    // 2. Check tokenRegistry for WETH
    console.log('2️⃣ Checking tokenRegistry for WETH...\n');
    
    const tokenRegistry = await prisma.tokenRegistry.findUnique({
      where: {
        chain_tokenSymbol: {
          chain: 'arbitrum',
          tokenSymbol: 'WETH',
        },
      },
    });

    if (tokenRegistry) {
      console.log('✅ WETH found in tokenRegistry:');
      console.log(`   Chain: ${tokenRegistry.chain}`);
      console.log(`   Symbol: ${tokenRegistry.tokenSymbol}`);
      console.log(`   Address: ${tokenRegistry.tokenAddress}`);
    } else {
      console.log('❌ WETH NOT found in tokenRegistry!');
      console.log('   This will cause pre-trade validation to fail for SPOT.');
    }
    console.log('');

    // 3. Check arbmaxx agent
    console.log('3️⃣ Checking arbmaxx agent...\n');
    
    const agent = await prisma.agent.findFirst({
      where: {
        name: {
          contains: 'arbmaxx',
          mode: 'insensitive',
        },
      },
      include: {
        deployments: true,
      },
    });

    if (agent) {
      console.log('✅ Agent found:');
      console.log(`   Name: ${agent.name}`);
      console.log(`   Venue: ${agent.venue || '(not set)'}`);
      console.log(`   Status: ${agent.status}`);
      console.log(`   Deployments: ${agent.deployments.length}`);
      
      if (agent.deployments.length > 0) {
        console.log('\n   Deployment Details:');
        for (const dep of agent.deployments) {
          console.log(`   • Safe: ${dep.safeWallet}`);
          console.log(`     Module: ${dep.moduleEnabled ? '✅ Enabled' : '❌ Not enabled'}`);
        }
      }
    } else {
      console.log('❌ Agent "arbmaxx" not found!');
    }
    console.log('');

    // 4. Summary
    console.log('═══════════════════════════════════════════════');
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('═══════════════════════════════════════════════\n');

    const issues = [];
    
    if (!venueStatus) {
      issues.push('❌ WETH missing from venueStatus table');
    }
    
    if (!tokenRegistry) {
      issues.push('❌ WETH missing from tokenRegistry table');
    }
    
    if (!agent) {
      issues.push('❌ Agent "arbmaxx" not found');
    } else if (!agent.venue) {
      issues.push('⚠️  Agent venue not set');
    }

    if (issues.length === 0) {
      console.log('✅ All checks passed! WETH should be tradeable.');
    } else {
      console.log('Issues found:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n💡 Fix: Run `npx tsx scripts/setup-tokens-and-venues.ts`');
    }
    console.log('');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

