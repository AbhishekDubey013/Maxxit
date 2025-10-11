#!/usr/bin/env tsx
/**
 * Analyze gas costs for a complete trade cycle
 * Opening + Approval + Closing
 */

import { ethers } from 'ethers';

// Original Safe trade transactions
const OPEN_TX = '0x0167f0df40c62bc375d3a0e1022cc966be929d0603e5a374f91ea685df827d60';
const APPROVE_WETH_TX = '0x7280443c654effd18aa02bd10f12bf1677cbec8f5dac295723ba1d4f66b79a12';
const CLOSE_TX = '0xc86c3fd3ca44758865f6c525cebdb0281221513c3ec511a633b8f77ee5ba3a96';

// Also check USDC approval (from earlier)
const APPROVE_USDC_TX = '0x41398580bfacdb14fa646dbb7ef3100d3f597b2c496831996388acb7e2815cfe';

async function analyzeGasCosts() {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    console.log('⛽ GAS COST ANALYSIS FOR COMPLETE TRADE CYCLE');
    console.log('═'.repeat(80));
    console.log('');
    
    // Fetch ETH price
    console.log('💰 Fetching ETH price...');
    const ETH_PRICE = 2600; // Approximate, you can update this
    console.log(`   Using ETH price: $${ETH_PRICE.toLocaleString()}`);
    console.log('');
    
    const transactions = [
      { name: 'USDC Approval (one-time)', tx: APPROVE_USDC_TX },
      { name: 'Open Position (USDC → WETH)', tx: OPEN_TX },
      { name: 'WETH Approval (one-time)', tx: APPROVE_WETH_TX },
      { name: 'Close Position (WETH → USDC)', tx: CLOSE_TX },
    ];
    
    let totalGas = ethers.BigNumber.from(0);
    let totalCostETH = 0;
    let totalCostUSD = 0;
    
    const results: any[] = [];
    
    for (const { name, tx } of transactions) {
      console.log(`📊 ${name}`);
      console.log('─'.repeat(80));
      console.log(`   TX: ${tx}`);
      
      try {
        const receipt = await provider.getTransactionReceipt(tx);
        
        if (!receipt) {
          console.log('   ❌ Receipt not found');
          console.log('');
          continue;
        }
        
        const gasUsed = receipt.gasUsed;
        const effectiveGasPrice = receipt.effectiveGasPrice || ethers.BigNumber.from(0);
        const gasCostWei = gasUsed.mul(effectiveGasPrice);
        const gasCostETH = parseFloat(ethers.utils.formatEther(gasCostWei));
        const gasCostUSD = gasCostETH * ETH_PRICE;
        
        totalGas = totalGas.add(gasUsed);
        totalCostETH += gasCostETH;
        totalCostUSD += gasCostUSD;
        
        console.log(`   Gas Used: ${gasUsed.toNumber().toLocaleString()} units`);
        console.log(`   Gas Price: ${ethers.utils.formatUnits(effectiveGasPrice, 'gwei')} gwei`);
        console.log(`   Cost: ${gasCostETH.toFixed(9)} ETH (~$${gasCostUSD.toFixed(4)})`);
        console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
        console.log('');
        
        results.push({
          name,
          gasUsed: gasUsed.toNumber(),
          gasPrice: parseFloat(ethers.utils.formatUnits(effectiveGasPrice, 'gwei')),
          costETH: gasCostETH,
          costUSD: gasCostUSD,
          status: receipt.status === 1 ? 'Success' : 'Failed',
        });
        
      } catch (error: any) {
        console.log(`   ❌ Error fetching receipt: ${error.message}`);
        console.log('');
      }
    }
    
    console.log('═'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log('');
    
    // One-time costs (approvals)
    const approvalResults = results.filter(r => r.name.includes('Approval'));
    const approvalGas = approvalResults.reduce((sum, r) => sum + r.gasUsed, 0);
    const approvalCostETH = approvalResults.reduce((sum, r) => sum + r.costETH, 0);
    const approvalCostUSD = approvalResults.reduce((sum, r) => sum + r.costUSD, 0);
    
    console.log('🔐 ONE-TIME SETUP COSTS (Approvals):');
    console.log(`   Total Gas: ${approvalGas.toLocaleString()} units`);
    console.log(`   Cost: ${approvalCostETH.toFixed(9)} ETH (~$${approvalCostUSD.toFixed(4)})`);
    console.log(`   Note: Only paid once per token`);
    console.log('');
    
    // Per-trade costs (open + close)
    const tradeResults = results.filter(r => !r.name.includes('Approval'));
    const tradeGas = tradeResults.reduce((sum, r) => sum + r.gasUsed, 0);
    const tradeCostETH = tradeResults.reduce((sum, r) => sum + r.costETH, 0);
    const tradeCostUSD = tradeResults.reduce((sum, r) => sum + r.costUSD, 0);
    
    console.log('💱 PER-TRADE COSTS (Open + Close):');
    console.log(`   Total Gas: ${tradeGas.toLocaleString()} units`);
    console.log(`   Cost: ${tradeCostETH.toFixed(9)} ETH (~$${tradeCostUSD.toFixed(4)})`);
    console.log(`   Average per trade: ~$${(tradeCostUSD / 2).toFixed(4)} (open or close)`);
    console.log('');
    
    // Total costs
    console.log('📈 TOTAL COSTS (First Trade):');
    console.log(`   Setup + Trade: ${totalGas.toNumber().toLocaleString()} units`);
    console.log(`   Cost: ${totalCostETH.toFixed(9)} ETH (~$${totalCostUSD.toFixed(4)})`);
    console.log('');
    
    console.log('💡 COST BREAKDOWN:');
    console.log(`   First trade (with approvals): ~$${totalCostUSD.toFixed(4)}`);
    console.log(`   Subsequent trades: ~$${tradeCostUSD.toFixed(4)} (no approval needed)`);
    console.log(`   Open position only: ~$${(tradeResults[0]?.costUSD || 0).toFixed(4)}`);
    console.log(`   Close position only: ~$${(tradeResults[1]?.costUSD || 0).toFixed(4)}`);
    console.log('');
    
    // ROI calculation
    console.log('💰 ROI CONSIDERATIONS:');
    const tradeSize = 1; // 1 USDC trade
    const feePercentage = ((tradeCostUSD / 2) / tradeSize) * 100;
    console.log(`   On a $${tradeSize} trade:`);
    console.log(`   - Gas cost: ~$${(tradeCostUSD / 2).toFixed(4)} per trade`);
    console.log(`   - Gas as % of trade: ~${feePercentage.toFixed(2)}%`);
    console.log('');
    console.log(`   On a $100 trade:`);
    console.log(`   - Gas cost: ~$${(tradeCostUSD / 2).toFixed(4)} per trade (same)`);
    console.log(`   - Gas as % of trade: ~${((tradeCostUSD / 2) / 100 * 100).toFixed(4)}%`);
    console.log('');
    console.log(`   On a $1000 trade:`);
    console.log(`   - Gas cost: ~$${(tradeCostUSD / 2).toFixed(4)} per trade (same)`);
    console.log(`   - Gas as % of trade: ~${((tradeCostUSD / 2) / 1000 * 100).toFixed(4)}%`);
    console.log('');
    
    console.log('🎯 RECOMMENDATIONS:');
    console.log(`   - Minimum trade size: $${Math.ceil(tradeCostUSD / 2 * 10)} (to keep gas < 10% of trade)`);
    console.log(`   - Optimal trade size: $${Math.ceil(tradeCostUSD / 2 * 100)}+ (to keep gas < 1% of trade)`);
    console.log(`   - Arbitrum is already very cheap! (Ethereum mainnet would be ~100x more)`);
    
  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message);
  }
}

analyzeGasCosts();

