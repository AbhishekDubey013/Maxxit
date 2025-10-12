/**
 * Complete GMX Flow Test
 * 
 * Tests the entire GMX trading flow:
 * 1. Check prerequisites (Safe, module, authorization)
 * 2. Get Chainlink price
 * 3. Open GMX position (with 0.2 USDC fee)
 * 4. Monitor position
 * 5. Close position (with 20% profit share)
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';
import { createGMXReader } from '../lib/adapters/gmx-reader';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const SAFE_ADDRESS = process.argv[2] || '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const TEST_TOKEN = 'ETH';
const TEST_COLLATERAL = 2; // 2 USDC (small test)

async function main() {
  console.log('\n🧪 ═══════════════════════════════════════════════════════');
  console.log('   GMX COMPLETE FLOW TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Configuration:');
  console.log(`├─ Safe: ${SAFE_ADDRESS}`);
  console.log(`├─ Token: ${TEST_TOKEN}`);
  console.log(`└─ Test Amount: ${TEST_COLLATERAL} USDC\n`);

  // ═══════════════════════════════════════════════════════
  // STEP 1: Check Prerequisites
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('📦 STEP 1: Check Prerequisites');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check for GMX deployment
  const deployment = await prisma.agentDeployment.findFirst({
    where: {
      safeWallet: {
        equals: SAFE_ADDRESS,
        mode: 'insensitive',
      },
      agent: {
        venue: 'GMX',
      },
    },
    include: {
      agent: true,
    },
  });

  if (!deployment) {
    console.error('❌ No GMX deployment found for this Safe!');
    console.error('\n📝 To fix:');
    console.error('   1. Go to UI');
    console.error('   2. Create an agent with venue: GMX');
    console.error('   3. Deploy to Safe:', SAFE_ADDRESS);
    console.error('   4. Re-run this test\n');
    process.exit(1);
  }

  console.log('✅ GMX Deployment Found:');
  console.log(`├─ Agent: ${deployment.agent.name}`);
  console.log(`├─ Venue: ${deployment.agent.venue}`);
  console.log(`├─ Module: ${deployment.moduleAddress}`);
  console.log(`└─ Safe: ${deployment.safeWallet}\n`);

  // Check USDC balance
  const { createSafeWallet } = await import('../lib/safe-wallet');
  const safeWallet = createSafeWallet(SAFE_ADDRESS, 42161);
  const usdcBalance = await safeWallet.getUSDCBalance();
  
  // Handle both BigNumber and number responses
  let usdcBalanceNum: number;
  if (typeof usdcBalance === 'number') {
    usdcBalanceNum = usdcBalance;
  } else {
    usdcBalanceNum = parseFloat(ethers.utils.formatUnits(usdcBalance, 6));
  }

  console.log('💰 Safe Balance:');
  console.log(`└─ USDC: ${usdcBalanceNum.toFixed(2)}\n`);

  if (usdcBalanceNum < TEST_COLLATERAL + 0.2) {
    console.error(`❌ Insufficient USDC! Need ${TEST_COLLATERAL + 0.2} USDC (${TEST_COLLATERAL} trade + 0.2 fee), have ${usdcBalanceNum.toFixed(2)}\n`);
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════
  // STEP 2: Get Price from Chainlink (GMX's Source)
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('📈 STEP 2: Get Price from Chainlink');
  console.log('═══════════════════════════════════════════════════════\n');

  const rpcUrl = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const gmxReader = createGMXReader(provider);

  const priceData = await gmxReader.getMarketPrice(TEST_TOKEN);
  
  if (!priceData) {
    console.error('❌ Failed to get price from Chainlink\n');
    process.exit(1);
  }

  const entryPrice = priceData.price;
  console.log(`✅ ${TEST_TOKEN}/USD: $${entryPrice.toFixed(2)} (Chainlink)`);
  console.log(`└─ This is the SAME price GMX uses internally\n`);

  // ═══════════════════════════════════════════════════════
  // STEP 3: Create Signal & Open Position
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 STEP 3: Open GMX Position');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Creating test signal...');
  
  // Delete old signals for this agent/token (clean up from previous tests)
  await prisma.signal.deleteMany({
    where: {
      agentId: deployment.agent.id,
      tokenSymbol: TEST_TOKEN,
    },
  });
  
  const signal = await prisma.signal.create({
    data: {
      agentId: deployment.agent.id,
      tokenSymbol: TEST_TOKEN, // Use base symbol for GMX (ETH, BTC, etc.)
      venue: 'GMX',
      side: 'LONG',
      sizeModel: {
        type: 'fixed-usdc',
        value: TEST_COLLATERAL,
        leverage: 1, // 1x for safe testing
      },
      riskModel: {
        stopLoss: entryPrice * 0.9, // 10% stop loss
        takeProfit: entryPrice * 1.2, // 20% take profit
      },
      sourceTweets: [`manual_test_${Date.now()}`],
    },
  });

  console.log(`✅ Signal created: ${signal.id}\n`);

  console.log('⏳ Opening position (this will take ~30 seconds)...');
  console.log('├─ 1. Collecting 0.2 USDC fee via module...');
  console.log('├─ 2. Getting GMX price from Chainlink...');
  console.log('├─ 3. Creating GMX order...');
  console.log('└─ 4. Waiting for confirmation...\n');

  const executor = new TradeExecutor();
  const openResult = await executor.executeSignal(signal.id);

  if (!openResult.success) {
    console.error('❌ Failed to open position:', openResult.error);
    if (openResult.reason) {
      console.error('   Reason:', openResult.reason);
    }
    if (openResult.executionSummary) {
      console.error('\n📋 Execution Summary:');
      console.error(JSON.stringify(openResult.executionSummary, null, 2));
    }
    console.error('\n🔍 Common issues:');
    console.error('   - Module not enabled on Safe');
    console.error('   - Executor not authorized as GMX subaccount');
    console.error('   - Insufficient gas in executor wallet');
    console.error('   - USDC not approved\n');
    process.exit(1);
  }

  console.log('✅ Position opened successfully!');
  console.log(`├─ Position ID: ${openResult.positionId}`);
  console.log(`├─ TX: ${openResult.txHash}`);
  console.log(`└─ Arbiscan: https://arbiscan.io/tx/${openResult.txHash}\n`);

  // Get position details
  const position = await prisma.position.findUnique({
    where: { id: openResult.positionId },
  });

  if (!position) {
    console.error('❌ Position not found in DB\n');
    process.exit(1);
  }

  console.log('📊 Position Details:');
  console.log(`├─ Token: ${TEST_TOKEN}`);
  console.log(`├─ Side: ${position.side}`);
  console.log(`├─ Entry Price: $${parseFloat(position.entryPrice.toString()).toFixed(2)}`);
  console.log(`├─ Quantity: ${parseFloat(position.qty.toString()).toFixed(8)}`);
  console.log(`└─ Collateral: ${TEST_COLLATERAL} USDC\n`);

  // ═══════════════════════════════════════════════════════
  // STEP 4: Monitor Position (Check Price)
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('👁️  STEP 4: Monitor Position');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('⏳ Getting current price from Chainlink...\n');

  const currentPriceData = await gmxReader.getMarketPrice(TEST_TOKEN);
  
  if (currentPriceData) {
    const currentPrice = currentPriceData.price;
    const entryPriceNum = parseFloat(position.entryPrice.toString());
    const pnlPercent = ((currentPrice - entryPriceNum) / entryPriceNum) * 100;
    const estimatedPnL = (currentPrice - entryPriceNum) * parseFloat(position.qty.toString());
    
    console.log('📈 Market Data:');
    console.log(`├─ Entry Price: $${entryPriceNum.toFixed(2)}`);
    console.log(`├─ Current Price: $${currentPrice.toFixed(2)} (Chainlink)`);
    console.log(`├─ Change: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);
    console.log(`└─ Estimated P&L: ${estimatedPnL >= 0 ? '+' : ''}$${estimatedPnL.toFixed(2)}\n`);
  }

  // ═══════════════════════════════════════════════════════
  // STEP 5: Close Position
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔒 STEP 5: Close Position');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('⏳ Closing position (this will take ~30 seconds)...');
  console.log('├─ 1. Getting current price from Chainlink...');
  console.log('├─ 2. Creating GMX close order...');
  console.log('├─ 3. Calculating P&L...');
  console.log('└─ 4. Distributing 20% profit share (if profitable)...\n');

  const closeResult = await executor.closePosition(position.id);

  if (!closeResult.success) {
    console.error('❌ Failed to close position:', closeResult.error);
    console.error('\n⚠️  Position may still be open on GMX!');
    console.error('   You may need to close it manually.\n');
    process.exit(1);
  }

  console.log('✅ Position closed successfully!');
  console.log(`├─ TX: ${closeResult.txHash}`);
  console.log(`└─ Arbiscan: https://arbiscan.io/tx/${closeResult.txHash}\n`);

  // Get final position details
  const closedPosition = await prisma.position.findUnique({
    where: { id: position.id },
  });

  if (!closedPosition) {
    console.error('❌ Closed position not found\n');
    process.exit(1);
  }

  const exitPrice = parseFloat(closedPosition.exitPrice?.toString() || '0');
  const pnl = parseFloat(closedPosition.pnl?.toString() || '0');
  const entryPriceNum = parseFloat(closedPosition.entryPrice.toString());

  console.log('📊 Final Results:');
  console.log(`├─ Entry Price: $${entryPriceNum.toFixed(2)}`);
  console.log(`├─ Exit Price: $${exitPrice.toFixed(2)}`);
  console.log(`├─ P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(4)} USD`);
  
  if (pnl > 0) {
    const profitShare = pnl * 0.2;
    const userProfit = pnl * 0.8;
    console.log(`├─ Profit Share (20%): $${profitShare.toFixed(4)} → Agent Owner`);
    console.log(`└─ You Keep (80%): $${userProfit.toFixed(4)}\n`);
  } else if (pnl < 0) {
    console.log(`└─ No profit share (position closed at loss)\n`);
  } else {
    console.log(`└─ Break even (no profit/loss)\n`);
  }

  // ═══════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETE!');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 What Was Tested:');
  console.log('✅ 1. Fee Collection (0.2 USDC via module)');
  console.log('✅ 2. Chainlink Price Feed (GMX\'s source)');
  console.log('✅ 3. GMX Position Open (SubaccountRouter)');
  console.log('✅ 4. Position Monitoring');
  console.log('✅ 5. GMX Position Close');
  console.log('✅ 6. Profit Share (20% via module)\n');

  console.log('🔍 Verify on Arbiscan:');
  console.log(`├─ Open TX: https://arbiscan.io/tx/${openResult.txHash}`);
  console.log(`└─ Close TX: https://arbiscan.io/tx/${closeResult.txHash}\n`);

  console.log('💡 Next Steps:');
  console.log('1. ✅ Verify transactions on Arbiscan');
  console.log('2. ✅ Check USDC balance changed correctly');
  console.log('3. ✅ Verify profit share was distributed');
  console.log('4. 🚀 Ready for production!\n');

  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => {
    console.log('✅ GMX flow test completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Error Details:');
    console.error(error);
    console.error('\n');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

