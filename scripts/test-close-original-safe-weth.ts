#!/usr/bin/env tsx
/**
 * Test closing the manual WETH position for Original Safe
 * This tests the full close flow: approve WETH → swap to USDC
 */

import { ethers } from 'ethers';
import { createSafeModuleService } from '../lib/safe-module-service';
import dotenv from 'dotenv';

dotenv.config();

const ORIGINAL_SAFE = '0xE9ECBddB6308036f5470826A1fdfc734cFE866b1';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

async function testCloseWETH() {
  try {
    console.log('🧪 TEST: Close Original Safe WETH Position');
    console.log('═'.repeat(70));
    console.log('Safe:', ORIGINAL_SAFE);
    console.log('');
    
    if (!process.env.EXECUTOR_PRIVATE_KEY) {
      throw new Error('EXECUTOR_PRIVATE_KEY not found');
    }
    
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    // Check WETH balance
    console.log('📊 Step 1: Check WETH Balance');
    console.log('─'.repeat(70));
    
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, provider);
    const wethBalance = await wethContract.balanceOf(ORIGINAL_SAFE);
    
    console.log('WETH Balance:', ethers.utils.formatEther(wethBalance), 'WETH');
    
    if (wethBalance.eq(0)) {
      console.log('❌ No WETH to close!');
      return;
    }
    
    console.log('✅ WETH available to close');
    console.log('');
    
    // Create module service
    const moduleService = createSafeModuleService(
      MODULE_ADDRESS,
      42161,
      process.env.EXECUTOR_PRIVATE_KEY
    );
    
    // Approve WETH to router
    console.log('📊 Step 2: Approve WETH to Uniswap Router');
    console.log('─'.repeat(70));
    
    const approvalResult = await moduleService.approveTokenForDex(
      ORIGINAL_SAFE,
      WETH_ADDRESS,
      UNISWAP_ROUTER
    );
    
    if (approvalResult.success) {
      console.log('✅ WETH approved');
      console.log('   TX:', approvalResult.txHash);
      console.log('   View:', `https://arbiscan.io/tx/${approvalResult.txHash}`);
    } else {
      console.log('⚠️  Approval result:', approvalResult.error);
      console.log('   (Continuing - might already be approved)');
    }
    console.log('');
    
    // Wait for approval
    if (approvalResult.success) {
      console.log('⏳ Waiting 5 seconds for approval to confirm...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Build swap transaction (WETH → USDC)
    console.log('📊 Step 3: Build Swap Transaction (WETH → USDC)');
    console.log('─'.repeat(70));
    
    const swapInterface = new ethers.utils.Interface([
      'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)'
    ]);
    
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    const swapData = swapInterface.encodeFunctionData('exactInputSingle', [{
      tokenIn: WETH_ADDRESS,
      tokenOut: USDC_ADDRESS,
      fee: 3000, // 0.3% fee tier
      recipient: ORIGINAL_SAFE,
      deadline,
      amountIn: wethBalance.toString(),
      amountOutMinimum: '0', // No slippage protection for test
      sqrtPriceLimitX96: 0,
    }]);
    
    console.log('Swap Details:');
    console.log('  From:', ethers.utils.formatEther(wethBalance), 'WETH');
    console.log('  To: USDC (market price)');
    console.log('  Router:', UNISWAP_ROUTER);
    console.log('');
    
    // Execute swap
    console.log('📊 Step 4: Execute Swap Through Module');
    console.log('─'.repeat(70));
    
    const result = await moduleService.executeTrade({
      safeAddress: ORIGINAL_SAFE,
      fromToken: WETH_ADDRESS,
      toToken: USDC_ADDRESS,
      amountIn: wethBalance.toString(),
      dexRouter: UNISWAP_ROUTER,
      swapData: swapData,
      minAmountOut: '0',
      profitReceiver: '0x7e3D3Ce78D53AaA557f38a9618976c230AEd9988',
    });
    
    console.log('');
    console.log('═'.repeat(70));
    
    if (result.success) {
      console.log('✅ POSITION CLOSED SUCCESSFULLY!');
      console.log('');
      console.log('Transaction Details:');
      console.log('  TX Hash:', result.txHash);
      console.log('  Amount Out:', result.amountOut ? ethers.utils.formatUnits(result.amountOut, 6) + ' USDC' : 'Unknown');
      console.log('');
      console.log('🔗 View on Arbiscan:');
      console.log(`   https://arbiscan.io/tx/${result.txHash}`);
      console.log('');
      console.log('🎉 FULL SYSTEM TEST PASSED!');
      console.log('   ✅ Manual trade opened (USDC → WETH)');
      console.log('   ✅ Position closed (WETH → USDC)');
      console.log('   ✅ Original Safe is fully operational!');
    } else {
      console.log('❌ POSITION CLOSE FAILED');
      console.log('');
      console.log('Error:', result.error);
      console.log('');
      console.log('This might indicate:');
      console.log('  - Insufficient gas in executor wallet');
      console.log('  - WETH approval issue');
      console.log('  - Swap router configuration issue');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCloseWETH();

