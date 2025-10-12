import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const WETH_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const MODULE_ABI = [
  'function isModuleEnabled(address safe, address module) view returns (bool)',
  'function getCapital(address safe) view returns (uint256)',
  'function isTokenWhitelisted(address token) view returns (bool)',
];

async function diagnose() {
  console.log('\n🔍 Diagnosing WETH Trade Failure\n');
  console.log('═'.repeat(50));
  
  // 1. Check Safe USDC balance
  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const usdcBalance = await usdcContract.balanceOf(SAFE_ADDRESS);
  console.log(`\n💰 Safe USDC Balance: ${ethers.utils.formatUnits(usdcBalance, 6)} USDC`);
  
  // 2. Check USDC approval to module
  const usdcApproval = await usdcContract.allowance(SAFE_ADDRESS, MODULE_ADDRESS);
  console.log(`✅ USDC Approved to Module: ${ethers.utils.formatUnits(usdcApproval, 6)} USDC`);
  
  // 3. Check if module is enabled
  const moduleContract = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, provider);
  const isEnabled = await moduleContract.isModuleEnabled(SAFE_ADDRESS, MODULE_ADDRESS);
  console.log(`\n🔧 Module Enabled: ${isEnabled ? '✅ YES' : '❌ NO'}`);
  
  // 4. Check capital initialized
  const capital = await moduleContract.getCapital(SAFE_ADDRESS);
  console.log(`💼 Capital Initialized: ${capital.gt(0) ? '✅ YES' : '❌ NO'} (${ethers.utils.formatUnits(capital, 6)} USDC)`);
  
  // 5. Check WETH whitelisted
  const isWETHWhitelisted = await moduleContract.isTokenWhitelisted(WETH_ADDRESS);
  console.log(`\n🪙 WETH Whitelisted: ${isWETHWhitelisted ? '✅ YES' : '❌ NO'}`);
  
  // 6. Check USDC whitelisted
  const isUSDCWhitelisted = await moduleContract.isTokenWhitelisted(USDC_ADDRESS);
  console.log(`🪙 USDC Whitelisted: ${isUSDCWhitelisted ? '✅ YES' : '❌ NO'}`);
  
  // 7. Get transaction receipt for revert reason
  console.log('\n═'.repeat(50));
  console.log('\n📜 Checking Transaction Revert Reason...\n');
  const txHash = '0x9f4745d77de08e0f9d9d2a3492f558166eeda9ed41ed13bb38810c6938aa16e7';
  
  try {
    const tx = await provider.getTransaction(txHash);
    const code = await provider.call(tx, tx.blockNumber);
    console.log('Revert reason:', code);
  } catch (error: any) {
    if (error.data) {
      console.log('❌ Revert data:', error.data);
      // Try to decode revert reason
      if (error.data.startsWith('0x08c379a0')) {
        const reason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + error.data.substring(10));
        console.log('❌ Revert reason:', reason[0]);
      }
    } else {
      console.log('❌ Error:', error.message);
    }
  }
  
  console.log('\n═'.repeat(50));
  console.log('\n🔗 View on Arbiscan:');
  console.log(`https://arbiscan.io/tx/${txHash}\n`);
}

diagnose().catch(console.error);

