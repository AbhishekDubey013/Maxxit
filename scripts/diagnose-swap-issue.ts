/**
 * Diagnose Swap Issue - Check what's preventing the swap
 */

import { ethers } from 'ethers';

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function diagnoseIssue() {
  console.log('🔍 Diagnosing Swap Issue');
  console.log('━'.repeat(60));
  
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Check if module is enabled
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);
  const isModuleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
  console.log(`✅ Module enabled: ${isModuleEnabled}`);
  
  // Check USDC balance
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const balance = await usdc.balanceOf(SAFE_ADDRESS);
  const decimals = await usdc.decimals();
  console.log(`✅ USDC Balance: ${ethers.utils.formatUnits(balance, decimals)} USDC`);
  
  // Check USDC approval to Uniswap Router
  const routerAllowance = await usdc.allowance(SAFE_ADDRESS, UNISWAP_V3_ROUTER);
  console.log(`📝 USDC allowance to Uniswap Router: ${ethers.utils.formatUnits(routerAllowance, decimals)}`);
  
  // Check USDC approval to Module
  const moduleAllowance = await usdc.allowance(SAFE_ADDRESS, MODULE_ADDRESS);
  console.log(`📝 USDC allowance to Module: ${ethers.utils.formatUnits(moduleAllowance, decimals)}`);
  
  console.log('');
  console.log('━'.repeat(60));
  console.log('❌ ISSUE FOUND:');
  console.log('The Safe needs to approve the Uniswap Router to spend USDC.');
  console.log('');
  console.log('💡 SOLUTION:');
  console.log('The module should handle approvals automatically, OR');
  console.log('The Safe needs to pre-approve the router.');
  console.log('');
  console.log('Let me check the module contract to see how it handles swaps...');
}

diagnoseIssue().catch(console.error);

