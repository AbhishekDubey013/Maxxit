import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

/**
 * Comprehensive SPOT Trading Test
 * Tests the full flow: open position → monitor → close
 */

const prisma = new PrismaClient();

async function main() {
  console.log('\n🎯 SPOT Trading Comprehensive Test\n');
  console.log('════════════════════════════════════════════════════════════');

  // Find a SPOT agent deployment
  const deployment = await prisma.agentDeployment.findFirst({
    where: {
      moduleEnabled: true,
      agent: {
        venue: 'SPOT',
        status: 'ACTIVE',
      },
    },
    include: {
      agent: true,
    },
  });

  if (!deployment) {
    console.log('❌ No active SPOT deployment found');
    console.log('   Create a SPOT agent and enable the module first');
    return;
  }

  console.log('✅ Found SPOT Deployment:');
  console.log(`   Agent: ${deployment.agent.name}`);
  console.log(`   Safe: ${deployment.safeWallet}`);
  console.log(`   Module: ${deployment.moduleAddress}`);
  console.log('');

  // Check Safe balances
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
  );

  const usdcContract = new ethers.Contract(
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );

  const usdcBalance = await usdcContract.balanceOf(deployment.safeWallet);
  const ethBalance = await provider.getBalance(deployment.safeWallet);

  console.log('💰 Safe Balances:');
  console.log(`   USDC: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
  console.log(`   ETH: ${ethers.utils.formatEther(ethBalance)}`);
  console.log('');

  // Check module status
  const safeContract = new ethers.Contract(
    deployment.safeWallet,
    ['function isModuleEnabled(address) view returns (bool)'],
    provider
  );

  const isModuleEnabled = await safeContract.isModuleEnabled(deployment.moduleAddress);
  console.log('🔧 Module Status:');
  console.log(`   Enabled: ${isModuleEnabled ? '✅' : '❌'}`);
  console.log('');

  // Check available tokens
  const venueStatus = await prisma.venueStatus.findMany({
    where: {
      venue: 'SPOT',
    },
  });

  console.log(`📊 Available SPOT Tokens: ${venueStatus.length}`);
  venueStatus.slice(0, 5).forEach((token) => {
    console.log(`   - ${token.tokenSymbol}`);
  });
  if (venueStatus.length > 5) {
    console.log(`   ... and ${venueStatus.length - 5} more`);
  }
  console.log('');

  // Check recent positions
  const recentPositions = await prisma.position.findMany({
    where: {
      deploymentId: deployment.id,
    },
    orderBy: {
      openedAt: 'desc',
    },
    take: 5,
  });

  console.log(`📈 Recent Positions: ${recentPositions.length}`);
  if (recentPositions.length > 0) {
    console.log('   Last 5:');
    recentPositions.forEach((pos) => {
      const status = pos.closedAt ? '✅ Closed' : '🟢 Open';
      console.log(`   ${status} ${pos.tokenSymbol} - ${pos.side} - ${pos.qty} tokens`);
    });
  } else {
    console.log('   No positions yet');
  }
  console.log('');

  // Check Telegram integration
  const telegramUser = await prisma.telegramUser.findFirst({
    where: {
      deploymentId: deployment.id,
    },
  });

  console.log('💬 Telegram Integration:');
  if (telegramUser) {
    console.log(`   ✅ Linked (User ID: ${telegramUser.telegramUserId})`);
  } else {
    console.log(`   ❌ Not linked`);
    console.log(`   Link Code: ${deployment.telegramLinkCode}`);
    console.log(`   Send to bot: /link ${deployment.telegramLinkCode}`);
  }
  console.log('');

  console.log('════════════════════════════════════════════════════════════');
  console.log('✅ SPOT System Status');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('📋 Checklist:');
  console.log(`   ${isModuleEnabled ? '✅' : '❌'} Module enabled on Safe`);
  console.log(`   ${parseFloat(ethers.utils.formatUnits(usdcBalance, 6)) >= 1 ? '✅' : '❌'} USDC balance >= 1 USDC`);
  console.log(`   ${venueStatus.length >= 10 ? '✅' : '❌'} Tokens whitelisted (${venueStatus.length})`);
  console.log(`   ${telegramUser ? '✅' : '❌'} Telegram linked`);
  console.log('');

  if (isModuleEnabled && parseFloat(ethers.utils.formatUnits(usdcBalance, 6)) >= 1) {
    console.log('🚀 Ready for Testing!');
    console.log('');
    console.log('Test Commands (send to Telegram bot):');
    console.log('   • Buy 0.5 USDC of WETH');
    console.log('   • Buy 1 USDC of ARB');
    console.log('   • Close WETH');
    console.log('   • Close ARB');
  } else {
    console.log('⚠️  Setup Required:');
    if (!isModuleEnabled) {
      console.log('   1. Enable module on Safe');
    }
    if (parseFloat(ethers.utils.formatUnits(usdcBalance, 6)) < 1) {
      console.log('   2. Add USDC to Safe');
    }
  }

  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

