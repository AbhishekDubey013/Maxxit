/**
 * Setup and Execute Swap - Approve router then swap
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

// Token addresses
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const SAFE_ABI = [
  'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) external payable returns (bool success)',
  'function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
  'function nonce() view returns (uint256)',
];

const MODULE_ABI = [
  'function executeGenericTransaction(address safe, address to, uint256 value, bytes calldata data) external returns (bool success)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

async function setupAndSwap() {
  console.log('🔧 Setup Approval and Execute Swap');
  console.log('━'.repeat(60));
  
  try {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key found in .env');
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`✅ Connected as: ${wallet.address}`);
    console.log('');

    // Check current allowance
    console.log('1️⃣  CHECKING CURRENT ALLOWANCE:');
    console.log('━'.repeat(60));
    
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const currentAllowance = await usdc.allowance(SAFE_ADDRESS, UNISWAP_V3_ROUTER);
    const decimals = await usdc.decimals();
    console.log(`Current allowance: ${ethers.utils.formatUnits(currentAllowance, decimals)} USDC`);
    
    if (currentAllowance.gt(0)) {
      console.log('✅ Router already has approval!');
    } else {
      console.log('❌ No approval set. Need to approve router first.');
      console.log('');
      console.log('2️⃣  SETTING UP APPROVAL:');
      console.log('━'.repeat(60));
      
      // Encode approve call
      const approveAmount = ethers.constants.MaxUint256; // Unlimited approval
      const usdcInterface = new ethers.utils.Interface(ERC20_ABI);
      const approveData = usdcInterface.encodeFunctionData('approve', [
        UNISWAP_V3_ROUTER,
        approveAmount
      ]);
      
      console.log('Preparing approval transaction through Safe...');
      console.log(`Approving: Unlimited USDC to Uniswap Router`);
      console.log('');

      // Method 1: Try using the module to execute the approval
      console.log('Option A: Using module to execute approval (if supported)');
      const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, wallet);
      
      try {
        // Check if module has executeGenericTransaction
        const tx = await module.executeGenericTransaction(
          SAFE_ADDRESS,
          USDC_ADDRESS,
          0,
          approveData,
          {
            gasLimit: 500000
          }
        );
        
        console.log(`✅ Approval tx sent: ${tx.hash}`);
        console.log(`🔗 https://arbiscan.io/tx/${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        await tx.wait();
        console.log('✅ Approval confirmed!');
        
      } catch (moduleError: any) {
        console.log('❌ Module method failed:', moduleError.message);
        console.log('');
        console.log('Option B: Need to approve through Safe UI or direct Safe transaction');
        console.log('');
        console.log('📋 MANUAL STEPS REQUIRED:');
        console.log('━'.repeat(60));
        console.log('1. Go to: https://app.safe.global/home?safe=arb1:' + SAFE_ADDRESS);
        console.log('2. Click "New Transaction" → "Contract Interaction"');
        console.log('3. Enter contract address:');
        console.log(`   ${USDC_ADDRESS}`);
        console.log('4. Select method: approve(address spender, uint256 amount)');
        console.log('5. Enter parameters:');
        console.log(`   - spender: ${UNISWAP_V3_ROUTER}`);
        console.log(`   - amount: 115792089237316195423570985008687907853269984665640564039457584007913129639935`);
        console.log('   (This is max uint256 for unlimited approval)');
        console.log('6. Execute the transaction');
        console.log('');
        console.log('After approval is set, run this script again to execute the swap.');
        return;
      }
    }
    
    // Now check if approval was successful
    console.log('');
    console.log('3️⃣  VERIFYING APPROVAL:');
    console.log('━'.repeat(60));
    
    const newAllowance = await usdc.allowance(SAFE_ADDRESS, UNISWAP_V3_ROUTER);
    console.log(`New allowance: ${ethers.utils.formatUnits(newAllowance, decimals)} USDC`);
    
    if (newAllowance.eq(0)) {
      console.log('❌ Approval still not set. Please follow manual steps above.');
      return;
    }
    
    console.log('✅ Router is approved! Ready to swap.');
    console.log('');
    console.log('4️⃣  EXECUTING SWAP:');
    console.log('━'.repeat(60));
    console.log('Now run the swap script:');
    console.log('  npx tsx scripts/test-swap-execution.ts');
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  }
}

setupAndSwap().catch(console.error);

