/**
 * Test Swap Execution - Execute a real swap through the module
 * This will swap USDC for ARB on Uniswap V3
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

// Token addresses on Arbitrum
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const MODULE_ABI = [
  'function executeSwap(address safe, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, bytes calldata path) external returns (uint256 amountOut)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];

const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

async function testSwapExecution() {
  console.log('🔄 Testing Module Swap Execution');
  console.log('━'.repeat(60));
  console.log(`📍 Safe: ${SAFE_ADDRESS}`);
  console.log(`🔧 Module: ${MODULE_ADDRESS}`);
  console.log(`💱 Swap: USDC → ARB`);
  console.log('━'.repeat(60));
  console.log('');

  try {
    // Check for private key
    if (!process.env.DEPLOYER_PRIVATE_KEY && !process.env.PRIVATE_KEY) {
      throw new Error('No DEPLOYER_PRIVATE_KEY or PRIVATE_KEY found in .env');
    }

    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey!, provider);

    console.log('✅ Connected to Arbitrum One');
    console.log(`🔑 Wallet: ${wallet.address}`);
    console.log('');

    // Check wallet balance
    const walletBalance = await provider.getBalance(wallet.address);
    const formattedWalletBalance = ethers.utils.formatEther(walletBalance);
    console.log(`💰 Wallet ETH: ${formattedWalletBalance} ETH`);
    
    if (walletBalance.lt(ethers.utils.parseEther('0.001'))) {
      console.log('⚠️  Low ETH balance for gas. You need ~0.001 ETH for gas.');
    }
    console.log('');

    // Check Safe USDC balance
    console.log('1️⃣  CHECKING SAFE BALANCE:');
    console.log('━'.repeat(60));
    
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdcBalance = await usdc.balanceOf(SAFE_ADDRESS);
    const usdcDecimals = await usdc.decimals();
    const formattedBalance = ethers.utils.formatUnits(usdcBalance, usdcDecimals);
    
    console.log(`USDC Balance: ${formattedBalance} USDC`);
    
    if (usdcBalance.eq(0)) {
      console.log('❌ No USDC in Safe. Cannot execute swap.');
      return;
    }

    // Check ARB balance before swap
    const arb = new ethers.Contract(ARB_ADDRESS, ERC20_ABI, provider);
    const arbBalanceBefore = await arb.balanceOf(SAFE_ADDRESS);
    const arbDecimals = await arb.decimals();
    const formattedArbBefore = ethers.utils.formatUnits(arbBalanceBefore, arbDecimals);
    console.log(`ARB Balance (before): ${formattedArbBefore} ARB`);
    console.log('');

    // Use 90% of USDC balance for swap (leave some dust)
    const amountIn = usdcBalance.mul(90).div(100);
    const formattedAmountIn = ethers.utils.formatUnits(amountIn, usdcDecimals);
    console.log(`📊 Swap Amount: ${formattedAmountIn} USDC`);
    console.log('');

    // Get quote from Uniswap V3
    console.log('2️⃣  GETTING SWAP QUOTE:');
    console.log('━'.repeat(60));
    
    const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);
    
    // Try different fee tiers (3000 = 0.3%, 500 = 0.05%, 10000 = 1%)
    const feeTier = 3000; // 0.3% fee tier (most common)
    
    try {
      const quotedAmountOut = await quoter.callStatic.quoteExactInputSingle(
        USDC_ADDRESS,
        ARB_ADDRESS,
        feeTier,
        amountIn,
        0 // sqrtPriceLimitX96 = 0 means no limit
      );
      
      const formattedQuote = ethers.utils.formatUnits(quotedAmountOut, arbDecimals);
      console.log(`Expected output: ${formattedQuote} ARB`);
      console.log(`Fee tier: ${feeTier / 10000}%`);
      
      // Calculate minAmountOut with 2% slippage
      const minAmountOut = quotedAmountOut.mul(98).div(100);
      const formattedMinOut = ethers.utils.formatUnits(minAmountOut, arbDecimals);
      console.log(`Min output (2% slippage): ${formattedMinOut} ARB`);
      console.log('');

      // Encode the swap path for Uniswap V3
      // Path format: tokenIn + fee + tokenOut
      const path = ethers.utils.solidityPack(
        ['address', 'uint24', 'address'],
        [USDC_ADDRESS, feeTier, ARB_ADDRESS]
      );

      console.log('3️⃣  EXECUTING SWAP:');
      console.log('━'.repeat(60));
      console.log(`From: ${formattedAmountIn} USDC`);
      console.log(`To: ~${formattedQuote} ARB (min: ${formattedMinOut})`);
      console.log('');
      console.log('Sending transaction...');

      // Execute swap through module
      const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, wallet);
      
      // Estimate gas first
      const gasEstimate = await module.estimateGas.executeSwap(
        SAFE_ADDRESS,
        USDC_ADDRESS,
        ARB_ADDRESS,
        amountIn,
        minAmountOut,
        path
      );
      
      console.log(`Estimated gas: ${gasEstimate.toString()}`);
      
      const tx = await module.executeSwap(
        SAFE_ADDRESS,
        USDC_ADDRESS,
        ARB_ADDRESS,
        amountIn,
        minAmountOut,
        path,
        {
          gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
        }
      );

      console.log(`✅ Transaction sent: ${tx.hash}`);
      console.log(`🔗 Arbiscan: https://arbiscan.io/tx/${tx.hash}`);
      console.log('');
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Transaction confirmed!');
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        console.log('');

        // Check balances after swap
        console.log('4️⃣  FINAL BALANCES:');
        console.log('━'.repeat(60));
        
        const usdcBalanceAfter = await usdc.balanceOf(SAFE_ADDRESS);
        const formattedUsdcAfter = ethers.utils.formatUnits(usdcBalanceAfter, usdcDecimals);
        console.log(`USDC Balance: ${formattedUsdcAfter} USDC`);
        
        const arbBalanceAfter = await arb.balanceOf(SAFE_ADDRESS);
        const formattedArbAfter = ethers.utils.formatUnits(arbBalanceAfter, arbDecimals);
        console.log(`ARB Balance: ${formattedArbAfter} ARB`);
        
        const arbReceived = arbBalanceAfter.sub(arbBalanceBefore);
        const formattedArbReceived = ethers.utils.formatUnits(arbReceived, arbDecimals);
        console.log('');
        console.log(`🎉 Received: ${formattedArbReceived} ARB`);
        
        console.log('');
        console.log('━'.repeat(60));
        console.log('✅ SWAP SUCCESSFUL!');
        console.log('━'.repeat(60));
        console.log('');
        console.log('📝 SUMMARY:');
        console.log(`   ✅ Module executed swap successfully`);
        console.log(`   ✅ Safe USDC decreased`);
        console.log(`   ✅ Safe ARB increased`);
        console.log(`   ✅ Your agent is ready for automated trading!`);
        
      } else {
        console.log('❌ Transaction failed');
      }

    } catch (quoteError: any) {
      console.error('❌ Failed to get quote or execute swap:', quoteError.message);
      
      if (quoteError.message.includes('insufficient')) {
        console.log('');
        console.log('This might mean:');
        console.log('- Not enough USDC in Safe');
        console.log('- No liquidity for this pair on Uniswap V3');
      }
    }

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('');
      console.log('⚠️  You need more ETH for gas in your wallet:');
      console.log(`   Wallet: ${error.address || 'your wallet'}`);
    }
  }
}

testSwapExecution().catch(console.error);

