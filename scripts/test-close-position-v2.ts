import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY!;

const MODULE_ABI = [
  'function closePosition(address safe, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint24 poolFee, address agentOwner, uint256 entryValueUSDC) external returns (uint256)',
];

async function testClosePosition() {
  console.log('\n🧪 Testing V2 Module closePosition\n');
  console.log('═'.repeat(60));

  try {
    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
    const executor = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);
    
    console.log(`Executor: ${executor.address}`);
    console.log(`Safe: ${SAFE_ADDRESS}`);
    console.log(`Module: ${MODULE_ADDRESS}\n`);

    // Get ARB balance
    const arbContract = new ethers.Contract(
      ARB_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const arbBalance = await arbContract.balanceOf(SAFE_ADDRESS);
    console.log(`ARB Balance: ${ethers.utils.formatEther(arbBalance)} ARB`);

    // Connect to module
    const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, executor);

    console.log('\n📤 Calling closePosition...\n');
    
    const tx = await module.closePosition(
      SAFE_ADDRESS,
      ARB_ADDRESS,
      USDC_ADDRESS,
      arbBalance, // Use full balance
      0, // minAmountOut
      3000, // poolFee 0.3%
      executor.address, // agentOwner (profit receiver)
      { gasLimit: 1000000 }
    );

    console.log(`Transaction Hash: ${tx.hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('\n✅ Position closed successfully!');
    } else {
      console.log('\n❌ Transaction reverted');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.error) {
      console.log('\nContract Revert Reason:', error.error.message || error.error);
    }
    
    if (error.reason) {
      console.log('Reason:', error.reason);
    }
  }
}

testClosePosition();

