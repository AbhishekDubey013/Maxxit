import { PrismaClient } from '@prisma/client';
import { createSafeModuleService } from '../lib/safe-module-service';

const prisma = new PrismaClient();

const ORIGINAL_SAFE = '0xE9ECBddB6308036f5470826A1fdfc734cFE866b1';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';

async function testTradeOriginalSafe() {
  try {
    console.log('🧪 Testing trade execution for original Safe...\n');
    console.log('Safe:', ORIGINAL_SAFE);
    console.log('Module:', MODULE_ADDRESS);
    console.log('');
    
    if (!process.env.EXECUTOR_PRIVATE_KEY) {
      console.log('❌ EXECUTOR_PRIVATE_KEY not found in .env');
      return;
    }
    
    // Create module service
    const moduleService = createSafeModuleService(
      MODULE_ADDRESS,
      42161, // Arbitrum
      process.env.EXECUTOR_PRIVATE_KEY
    );
    
    console.log('📝 Attempting to initialize capital (if needed)...');
    
    const initResult = await moduleService.initializeCapital(
      ORIGINAL_SAFE,
      '1000000' // 1 USDC in wei (6 decimals)
    );
    
    if (initResult.success) {
      console.log('✅ Capital initialized:', initResult.txHash);
    } else {
      console.log('⚠️  Capital initialization failed (might already be initialized):', initResult.error);
    }
    console.log('');
    
    console.log('🔄 Attempting test swap: 1 USDC → ARB...');
    
    // Prepare swap data (simplified - normally built by adapter)
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';
    const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
    
    // Build Uniswap V3 swap data
    const swapInterface = new (require('ethers')).ethers.utils.Interface([
      'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)'
    ]);
    
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    const swapData = swapInterface.encodeFunctionData('exactInputSingle', [{
      tokenIn: USDC_ADDRESS,
      tokenOut: ARB_ADDRESS,
      fee: 3000, // 0.3% fee tier
      recipient: ORIGINAL_SAFE,
      deadline: deadline,
      amountIn: '1000000', // 1 USDC
      amountOutMinimum: '0', // Accept any amount (for testing)
      sqrtPriceLimitX96: 0,
    }]);
    
    const tradeResult = await moduleService.executeTrade({
      safeAddress: ORIGINAL_SAFE,
      fromToken: USDC_ADDRESS,
      toToken: ARB_ADDRESS,
      amountIn: '1000000', // 1 USDC
      dexRouter: UNISWAP_ROUTER,
      swapData: swapData,
      minAmountOut: '0',
      profitReceiver: '0x7e3D3Ce78D53AaA557f38a9618976c230AEd9988', // One of the Safe owners
    });
    
    console.log('');
    console.log('📊 RESULT:');
    if (tradeResult.success) {
      console.log('✅ Trade executed successfully!');
      console.log('   TX Hash:', tradeResult.txHash);
      console.log('   Amount Out:', tradeResult.amountOut);
      console.log('');
      console.log('🎉 VERDICT: Original Safe CAN trade through the module!');
    } else {
      console.log('❌ Trade failed:', tradeResult.error);
      console.log('');
      console.log('💡 This could mean:');
      console.log('   - USDC not approved to router');
      console.log('   - Capital not initialized');
      console.log('   - Token not whitelisted');
      console.log('   - Other module restrictions');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testTradeOriginalSafe();

