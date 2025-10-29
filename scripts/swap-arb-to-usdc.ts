/**
 * Swap ARB back to USDC
 * Uses the module to swap ARB → USDC
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';

const MODULE_ABI = [
  'function executeTrade(address safe, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint24 poolFee, address profitReceiver) external returns (uint256 amountOut)',
  'function initializeCapital(address safe) external',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];

const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

async function swapARBToUSDC() {
  console.log('🔄 Swapping ARB → USDC');
  console.log('━'.repeat(60));
  
  try {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key found');
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`✅ Connected as: ${wallet.address}`);
    console.log('');

    // Check ARB balance
    console.log('1️⃣  CHECKING ARB BALANCE:');
    console.log('━'.repeat(60));
    
    const arb = new ethers.Contract(ARB_ADDRESS, ERC20_ABI, provider);
    const arbBalance = await arb.balanceOf(SAFE_ADDRESS);
    const arbDecimals = 18;
    const formattedARB = ethers.utils.formatUnits(arbBalance, arbDecimals);
    
    console.log(`ARB Balance: ${formattedARB} ARB`);
    
    if (arbBalance.eq(0)) {
      console.log('❌ No ARB to swap');
      return;
    }
    console.log('');

    // Use 100% of ARB
    const amountIn = arbBalance;
    const formattedAmountIn = ethers.utils.formatUnits(amountIn, arbDecimals);
    console.log(`📊 Swap Amount: ${formattedAmountIn} ARB → USDC`);
    console.log('');

    // Get quote
    console.log('2️⃣  GETTING SWAP QUOTE:');
    console.log('━'.repeat(60));
    
    const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);
    const feeTier = 3000; // 0.3%
    
    const quotedAmountOut = await quoter.callStatic.quoteExactInputSingle(
      ARB_ADDRESS,
      USDC_ADDRESS,
      feeTier,
      amountIn,
      0
    );
    
    const usdcDecimals = 6;
    const formattedQuote = ethers.utils.formatUnits(quotedAmountOut, usdcDecimals);
    console.log(`Expected output: ${formattedQuote} USDC`);
    
    // 2% slippage
    const minAmountOut = quotedAmountOut.mul(98).div(100);
    const formattedMinOut = ethers.utils.formatUnits(minAmountOut, usdcDecimals);
    console.log(`Min output (2% slippage): ${formattedMinOut} USDC`);
    console.log('');

    // Execute swap
    console.log('3️⃣  EXECUTING SWAP:');
    console.log('━'.repeat(60));
    
    const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, wallet);
    
    console.log('Sending transaction...');
    const tx = await module.executeTrade(
      SAFE_ADDRESS,
      ARB_ADDRESS,
      USDC_ADDRESS,
      amountIn,
      minAmountOut,
      feeTier,
      wallet.address, // profit receiver
      {
        gasLimit: 800000,
      }
    );
    
    console.log(`✅ Transaction sent: ${tx.hash}`);
    console.log(`🔗 https://arbiscan.io/tx/${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    await tx.wait();
    
    console.log('✅ Swap successful!');
    console.log('');

    // Check new balances
    console.log('4️⃣  FINAL BALANCES:');
    console.log('━'.repeat(60));
    
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const finalUSDC = await usdc.balanceOf(SAFE_ADDRESS);
    const formattedUSDC = ethers.utils.formatUnits(finalUSDC, usdcDecimals);
    console.log(`USDC: ${formattedUSDC} USDC`);
    
    const finalARB = await arb.balanceOf(SAFE_ADDRESS);
    const formattedFinalARB = ethers.utils.formatUnits(finalARB, arbDecimals);
    console.log(`ARB: ${formattedFinalARB} ARB`);
    
    console.log('');
    console.log('━'.repeat(60));
    console.log('✅ SWAP COMPLETE!');
    console.log('🎉 Your Safe now has USDC for Telegram trading!');
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  }
}

swapARBToUSDC().catch(console.error);

