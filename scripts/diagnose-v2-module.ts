import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const WETH_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';

const MODULE_ABI = [
  'function getCapital(address safe) external view returns (uint256)',
  'function getSafeStats(address safe) external view returns (bool initialized, uint256 initialCapital, uint256 currentCapital, int256 profitLoss, uint256 profitTaken, uint256 unrealizedProfit)',
  'function isTokenWhitelisted(address safe, address token) public view returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

async function diagnose() {
  console.log('\n🔍 V2 Module Diagnostic\n');
  console.log('═'.repeat(60));
  
  const moduleContract = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, provider);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

  // 1. Check USDC balance
  const usdcBalance = await usdcContract.balanceOf(SAFE_ADDRESS);
  console.log(`\n💰 USDC Balance: ${ethers.utils.formatUnits(usdcBalance, 6)} USDC`);

  // 2. Check USDC approval to module
  const usdcApproval = await usdcContract.allowance(SAFE_ADDRESS, MODULE_ADDRESS);
  console.log(`✅ USDC Approved to Module: ${ethers.utils.formatUnits(usdcApproval, 6)} USDC`);

  // 3. Check capital
  const capital = await moduleContract.getCapital(SAFE_ADDRESS);
  console.log(`\n💼 Capital: ${ethers.utils.formatUnits(capital, 6)} USDC`);

  // 4. Check Safe stats
  const stats = await moduleContract.getSafeStats(SAFE_ADDRESS);
  console.log(`\n📊 Safe Stats:`);
  console.log(`   Initialized: ${stats.initialized ? '✅ YES' : '❌ NO'}`);
  console.log(`   Initial Capital: ${ethers.utils.formatUnits(stats.initialCapital, 6)} USDC`);
  console.log(`   Current Capital: ${ethers.utils.formatUnits(stats.currentCapital, 6)} USDC`);

  // 5. Check WETH whitelisted
  const isWETHWhitelisted = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, WETH_ADDRESS);
  console.log(`\n🪙 WETH Whitelisted for this Safe: ${isWETHWhitelisted ? '✅ YES' : '❌ NO'}`);

  // 6. Check USDC whitelisted
  const isUSDCWhitelisted = await moduleContract.isTokenWhitelisted(SAFE_ADDRESS, USDC_ADDRESS);
  console.log(`🪙 USDC Whitelisted for this Safe: ${isUSDCWhitelisted ? '✅ YES' : '❌ NO'}`);

  console.log('\n═'.repeat(60));
  console.log('\n🔗 Transaction that failed:');
  console.log('https://arbiscan.io/tx/0x1c5ff59dcf2bd4dd5ad959cd022629551391b83b5377a700f1e0ec1ff82f73b0');
  console.log('\n');
}

diagnose().catch(console.error);

