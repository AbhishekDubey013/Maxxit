/**
 * Execute HYPE Trades on Ostium
 * Manually execute the pending HYPE signals
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function executeHypeTrades() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║        🚀 EXECUTING HYPE TRADES ON OSTIUM                    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Get pending HYPE signals
    const signals = await prisma.signals.findMany({
      where: {
        token_symbol: 'HYPE',
        venue: 'OSTIUM',
        positions: {
          none: {}, // No positions created yet
        },
        skipped_reason: null, // Not skipped
      },
      include: {
        agents: {
          include: {
            agent_deployments: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    console.log(`📊 Found ${signals.length} pending HYPE signals\n`);

    if (signals.length === 0) {
      console.log('✅ No pending signals to execute\n');
      return;
    }

    let executed = 0;
    let failed = 0;

    const OSTIUM_SERVICE_URL = process.env.OSTIUM_SERVICE_URL || 'http://localhost:5002';

    for (const signal of signals) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n🔄 Processing Signal: ${signal.id.substring(0, 8)}...`);
      console.log(`   Agent: ${signal.agents.name}`);
      console.log(`   Token: ${signal.token_symbol} ${signal.side}`);
      console.log(`   Size: ${JSON.stringify(signal.size_model)}`);

      // Get deployment
      const deployment = signal.agents.agent_deployments[0];
      if (!deployment) {
        console.error(`   ❌ No active deployment found`);
        failed++;
        continue;
      }

      console.log(`   User Wallet: ${deployment.user_wallet}`);
      console.log(`   Agent Address: ${deployment.hyperliquid_agent_address}`);

      // Get balance
      console.log(`\n   📊 Checking balance...`);
      const balanceResponse = await fetch(`${OSTIUM_SERVICE_URL}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: deployment.user_wallet }),
      });

      const balanceResult = await balanceResponse.json();
      if (!balanceResult.success) {
        console.error(`   ❌ Failed to get balance: ${balanceResult.error}`);
        failed++;
        continue;
      }

      console.log(`   💰 Balance: ${balanceResult.usdcBalance} USDC`);

      // Calculate position size (5% of balance)
      const positionSize = Math.floor(balanceResult.usdcBalance * 0.05); // 5%
      console.log(`   📐 Position Size: ${positionSize} USDC (5% of balance)`);

      if (positionSize < 10) {
        console.log(`   ⚠️  Position size too small (< $10). Skipping...`);
        await prisma.signals.update({
          where: { id: signal.id },
          data: { skipped_reason: 'Position size below $10 minimum' },
        });
        failed++;
        continue;
      }

      // Open position
      console.log(`\n   🚀 Opening ${signal.side} position for ${signal.token_symbol}...`);
      
      const tradeResponse = await fetch(`${OSTIUM_SERVICE_URL}/open-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAddress: deployment.hyperliquid_agent_address,
          userAddress: deployment.user_wallet,
          market: signal.token_symbol,
          side: signal.side.toLowerCase(),
          collateral: positionSize,
          leverage: (signal.risk_model as any)?.leverage || 3,
        }),
      });

      const tradeResult = await tradeResponse.json();

      if (!tradeResult.success) {
        console.error(`   ❌ Trade failed: ${tradeResult.error}`);
        
        // Check if market not available
        if (tradeResult.error && tradeResult.error.includes('Market not available')) {
          console.log(`   ⚠️  Marking signal as skipped (market unavailable)`);
          await prisma.signals.update({
            where: { id: signal.id },
            data: { skipped_reason: `Market ${signal.token_symbol} not available on OSTIUM` },
          });
        }
        
        failed++;
        continue;
      }

      console.log(`   ✅ Trade executed successfully!`);
      console.log(`      TX Hash: ${tradeResult.txHash}`);
      console.log(`      Trade ID: ${tradeResult.tradeId}`);

      // Create position record
      const position = await prisma.positions.create({
        data: {
          deployment_id: deployment.id,
          signal_id: signal.id,
          venue: 'OSTIUM',
          token_symbol: signal.token_symbol,
          side: signal.side,
          entry_price: 0, // Will be updated by position monitor
          qty: positionSize,
          entry_tx_hash: tradeResult.tradeId || tradeResult.txHash,
          trailing_params: {
            enabled: true,
            trailingPercent: 1,
          },
        },
      });

      console.log(`      Position ID: ${position.id.substring(0, 8)}...`);
      executed++;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📊 Summary:`);
    console.log(`   Executed: ${executed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${executed + failed}`);
    console.log(`\n✅ Trade execution complete!\n`);

    return { success: true, executed, failed };
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

executeHypeTrades()
  .then(result => {
    console.log('[ExecuteHypeTrades] Result:', result);
    process.exit(result?.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[ExecuteHypeTrades] Fatal error:', error);
    process.exit(1);
  });

