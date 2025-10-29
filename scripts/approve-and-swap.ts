/**
 * Approve Router and Execute Swap - All via MetaMask, NO SAFE UI
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const SAFE_ABI = [
  'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) external payable returns (bool success)',
  'function nonce() view returns (uint256)',
  'function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
];

const MODULE_ABI = [
  'function initializeCapital(address safe) external',
  'function safeCapital(address safe) view returns (uint256)',
  'function executeTrade(address safe, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint24 poolFee, address profitReceiver) external returns (uint256 amountOut)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];

const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

async function approveAndSwap() {
  console.log('🚀 Complete Swap Test - NO SAFE UI NEEDED');
  console.log('━'.repeat(60));
  console.log('');

  try {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key found in .env');
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`✅ Connected as: ${wallet.address}`);
    console.log(`📍 Safe: ${SAFE_ADDRESS}`);
    console.log('');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const decimals = await usdc.decimals();

    // ============================================
    // STEP 1: Check and set approval if needed
    // ============================================
    console.log('1️⃣  CHECKING UNISWAP ROUTER APPROVAL:');
    console.log('━'.repeat(60));
    
    const currentAllowance = await usdc.allowance(SAFE_ADDRESS, UNISWAP_V3_ROUTER);
    const formattedAllowance = ethers.utils.formatUnits(currentAllowance, decimals);
    console.log(`Current allowance: ${formattedAllowance} USDC`);
    
    if (currentAllowance.lt(ethers.utils.parseUnits('1', decimals))) {
      console.log('❌ Need to approve router');
      console.log('');
      console.log('Setting approval via Safe execTransaction (NO SAFE UI)...');
      
      // Encode approve call
      const usdcInterface = new ethers.utils.Interface(ERC20_ABI);
      const approveData = usdcInterface.encodeFunctionData('approve', [
        UNISWAP_V3_ROUTER,
        ethers.constants.MaxUint256
      ]);
      
      // Get Safe contract
      const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, wallet);
      const nonce = await safe.nonce();
      
      console.log(`Safe nonce: ${nonce}`);
      
      // Build Safe transaction
      const safeTxHash = await safe.getTransactionHash(
        USDC_ADDRESS,        // to
        0,                   // value
        approveData,         // data
        0,                   // operation (CALL)
        0,                   // safeTxGas
        0,                   // baseGas
        0,                   // gasPrice
        ethers.constants.AddressZero, // gasToken
        ethers.constants.AddressZero, // refundReceiver
        nonce
      );
      
      // Sign the transaction (EIP-712 format for Safe)
      // For a 1/1 Safe, we can use contract signature (on-chain verification)
      const signature = await wallet.signMessage(ethers.utils.arrayify(safeTxHash));
      
      // Adjust signature format for Safe (add 4 to v for eth_sign)
      const signatureBytes = ethers.utils.arrayify(signature);
      signatureBytes[signatureBytes.length - 1] += 4; // Convert to eth_sign format
      const adjustedSignature = ethers.utils.hexlify(signatureBytes);
      
      console.log('Executing approval transaction...');
      
      // Execute through Safe
      const approveTx = await safe.execTransaction(
        USDC_ADDRESS,
        0,
        approveData,
        0,
        0,
        0,
        0,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        adjustedSignature,
        {
          gasLimit: 300000
        }
      );
      
      console.log(`✅ Approval tx sent: ${approveTx.hash}`);
      console.log(`🔗 https://arbiscan.io/tx/${approveTx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      await approveTx.wait();
      console.log('✅ Approval confirmed!');
      
      // Verify
      const newAllowance = await usdc.allowance(SAFE_ADDRESS, UNISWAP_V3_ROUTER);
      console.log(`New allowance: ${ethers.utils.formatUnits(newAllowance, decimals)} USDC`);
    } else {
      console.log('✅ Router already approved');
    }
    
    console.log('');

    // ============================================
    // STEP 2: Initialize capital if needed
    // ============================================
    console.log('2️⃣  CHECKING CAPITAL INITIALIZATION:');
    console.log('━'.repeat(60));
    
    const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, wallet);
    const currentCapital = await module.safeCapital(SAFE_ADDRESS);
    
    console.log(`Current capital: ${ethers.utils.formatUnits(currentCapital, decimals)} USDC`);
    
    if (currentCapital.eq(0)) {
      console.log('❌ Need to initialize capital');
      console.log('Initializing...');
      
      const initTx = await module.initializeCapital(SAFE_ADDRESS, {
        gasLimit: 200000
      });
      
      console.log(`✅ Init tx sent: ${initTx.hash}`);
      console.log(`🔗 https://arbiscan.io/tx/${initTx.hash}`);
      await initTx.wait();
      
      const newCapital = await module.safeCapital(SAFE_ADDRESS);
      console.log(`✅ Capital initialized: ${ethers.utils.formatUnits(newCapital, decimals)} USDC`);
    } else {
      console.log('✅ Capital already initialized');
    }
    
    console.log('');

    // ============================================
    // STEP 3: Execute the swap
    // ============================================
    console.log('3️⃣  EXECUTING SWAP:');
    console.log('━'.repeat(60));
    
    const usdcBalance = await usdc.balanceOf(SAFE_ADDRESS);
    const formattedBalance = ethers.utils.formatUnits(usdcBalance, decimals);
    console.log(`Safe USDC balance: ${formattedBalance} USDC`);
    
    if (usdcBalance.eq(0)) {
      console.log('❌ No USDC to swap');
      return;
    }
    
    // Use 90% for swap
    const amountIn = usdcBalance.mul(90).div(100);
    const formattedAmountIn = ethers.utils.formatUnits(amountIn, decimals);
    console.log(`Swap amount: ${formattedAmountIn} USDC → ARB`);
    
    // Get quote
    const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);
    const feeTier = 3000; // 0.3%
    
    const quotedAmountOut = await quoter.callStatic.quoteExactInputSingle(
      USDC_ADDRESS,
      ARB_ADDRESS,
      feeTier,
      amountIn,
      0
    );
    
    const arbDecimals = 18;
    const formattedQuote = ethers.utils.formatUnits(quotedAmountOut, arbDecimals);
    console.log(`Expected: ~${formattedQuote} ARB`);
    
    // 2% slippage
    const minAmountOut = quotedAmountOut.mul(98).div(100);
    const formattedMinOut = ethers.utils.formatUnits(minAmountOut, arbDecimals);
    console.log(`Min accepted: ${formattedMinOut} ARB`);
    console.log('');
    
    console.log('Executing swap through module...');
    
    const swapTx = await module.executeTrade(
      SAFE_ADDRESS,
      USDC_ADDRESS,
      ARB_ADDRESS,
      amountIn,
      minAmountOut,
      feeTier,
      wallet.address, // profit receiver
      {
        gasLimit: 800000
      }
    );
    
    console.log(`✅ Swap tx sent: ${swapTx.hash}`);
    console.log(`🔗 https://arbiscan.io/tx/${swapTx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await swapTx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ Swap successful!');
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Check final balances
      console.log('');
      console.log('4️⃣  FINAL BALANCES:');
      console.log('━'.repeat(60));
      
      const finalUSDC = await usdc.balanceOf(SAFE_ADDRESS);
      console.log(`USDC: ${ethers.utils.formatUnits(finalUSDC, decimals)} USDC`);
      
      const arb = new ethers.Contract(ARB_ADDRESS, ERC20_ABI, provider);
      const finalARB = await arb.balanceOf(SAFE_ADDRESS);
      console.log(`ARB: ${ethers.utils.formatUnits(finalARB, arbDecimals)} ARB`);
      
      console.log('');
      console.log('━'.repeat(60));
      console.log('🎉 COMPLETE SUCCESS - NO SAFE UI NEEDED!');
      console.log('━'.repeat(60));
    } else {
      console.log('❌ Swap failed');
    }

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    
    if (error.error && error.error.message) {
      console.error('Details:', error.error.message);
    }
  }
}

approveAndSwap().catch(console.error);

