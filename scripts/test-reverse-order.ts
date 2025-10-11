import { ethers } from 'ethers';
import { createSafeModuleService } from '../lib/safe-module-service';

const YOUR_SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const ORIGINAL_SAFE = '0xE9ECBddB6308036f5470826A1fdfc734cFE866b1';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';

async function testReverseOrder() {
  try {
    if (!process.env.EXECUTOR_PRIVATE_KEY) {
      console.log('❌ EXECUTOR_PRIVATE_KEY not found');
      return;
    }
    
    console.log('🧪 TESTING REVERSE ORDER: Original Safe FIRST\n');
    console.log('═'.repeat(60));
    
    // Prepare swap data
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
    const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
    
    const swapInterface = new ethers.utils.Interface([
      'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)'
    ]);
    
    const moduleService = createSafeModuleService(
      MODULE_ADDRESS,
      42161,
      process.env.EXECUTOR_PRIVATE_KEY
    );
    
    // TEST 1: ORIGINAL SAFE (FIRST THIS TIME)
    console.log('\n📊 TEST 1: ORIGINAL SAFE (FIRST)');
    console.log('─'.repeat(60));
    console.log('Safe:', ORIGINAL_SAFE);
    console.log('');
    
    const deadline1 = Math.floor(Date.now() / 1000) + 1200;
    const swapData1 = swapInterface.encodeFunctionData('exactInputSingle', [{
      tokenIn: USDC_ADDRESS,
      tokenOut: WETH_ADDRESS,
      fee: 3000,
      recipient: ORIGINAL_SAFE,
      deadline: deadline1,
      amountIn: '1000000', // 1 USDC
      amountOutMinimum: '0',
      sqrtPriceLimitX96: 0,
    }]);
    
    console.log('⏳ Executing trade...');
    const result1 = await moduleService.executeTrade({
      safeAddress: ORIGINAL_SAFE,
      fromToken: USDC_ADDRESS,
      toToken: WETH_ADDRESS,
      amountIn: '1000000',
      dexRouter: UNISWAP_ROUTER,
      swapData: swapData1,
      minAmountOut: '0',
      profitReceiver: '0x7e3D3Ce78D53AaA557f38a9618976c230AEd9988',
    });
    
    if (result1.success) {
      console.log('✅ SUCCESS!');
      console.log('   TX Hash:', result1.txHash);
      console.log('   Amount Out:', result1.amountOut);
    } else {
      console.log('❌ FAILED:', result1.error);
    }
    
    // Wait 5 seconds before next trade
    console.log('\n⏸️  Waiting 5 seconds before next trade...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // TEST 2: YOUR SAFE (SECOND THIS TIME)
    console.log('\n📊 TEST 2: YOUR SAFE (SECOND)');
    console.log('─'.repeat(60));
    console.log('Safe:', YOUR_SAFE);
    console.log('');
    
    const deadline2 = Math.floor(Date.now() / 1000) + 1200;
    const swapData2 = swapInterface.encodeFunctionData('exactInputSingle', [{
      tokenIn: USDC_ADDRESS,
      tokenOut: WETH_ADDRESS,
      fee: 3000,
      recipient: YOUR_SAFE,
      deadline: deadline2,
      amountIn: '1000000', // 1 USDC
      amountOutMinimum: '0',
      sqrtPriceLimitX96: 0,
    }]);
    
    console.log('⏳ Executing trade...');
    const result2 = await moduleService.executeTrade({
      safeAddress: YOUR_SAFE,
      fromToken: USDC_ADDRESS,
      toToken: WETH_ADDRESS,
      amountIn: '1000000',
      dexRouter: UNISWAP_ROUTER,
      swapData: swapData2,
      minAmountOut: '0',
      profitReceiver: '0x7e3D3Ce78D53AaA557f38a9618976c230AEd9988',
    });
    
    if (result2.success) {
      console.log('✅ SUCCESS!');
      console.log('   TX Hash:', result2.txHash);
      console.log('   Amount Out:', result2.amountOut);
    } else {
      console.log('❌ FAILED:', result2.error);
    }
    
    // SUMMARY
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY:\n');
    
    console.log('Test 1 (Original Safe - FIRST):', result1.success ? '✅ PASSED' : '❌ FAILED');
    if (!result1.success) {
      console.log('  Error:', result1.error?.substring(0, 100) + '...');
    }
    console.log('');
    
    console.log('Test 2 (Your Safe - SECOND):', result2.success ? '✅ PASSED' : '❌ FAILED');
    if (!result2.success) {
      console.log('  Error:', result2.error?.substring(0, 100) + '...');
    }
    console.log('');
    
    console.log('💡 VERDICT:');
    if (result1.success && result2.success) {
      console.log('   ✅ Both worked! Order doesn\'t matter.');
      console.log('   → Original Safe CAN trade, just needed to go first!');
    } else if (!result1.success && result2.success) {
      console.log('   ⚠️  Original Safe failed even when going first.');
      console.log('   → Original Safe has a different issue (USDC approval, etc)');
    } else if (result1.success && !result2.success) {
      console.log('   ⚠️  Your Safe failed when going second.');
      console.log('   → Likely gas ran out after first trade');
    } else {
      console.log('   ❌ Both failed.');
      console.log('   → Not enough gas for either trade');
    }
    
  } catch (error: any) {
    console.error('\n❌ Script Error:', error.message);
  }
}

testReverseOrder();

