/**
 * Diagnose setup for new V2 module
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const NEW_MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const SAFE_ABI = [
  'function isModuleEnabled(address module) external view returns (bool)',
];

const ERC20_ABI = [
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

const MODULE_ABI = [
  'function getCapital(address safe) external view returns (uint256)',
];

async function main() {
  console.log('🔍 Diagnosing NEW V2 Module Setup...\n');
  console.log(`Safe: ${SAFE}`);
  console.log(`Module: ${NEW_MODULE}\n`);
  
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const safe = new ethers.Contract(SAFE, SAFE_ABI, provider);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
  const module = new ethers.Contract(NEW_MODULE, MODULE_ABI, provider);
  
  // Check 1: Module enabled
  console.log('1️⃣  Module Enabled Check:');
  const isEnabled = await safe.isModuleEnabled(NEW_MODULE);
  console.log(`   ${isEnabled ? '✅' : '❌'} Module ${isEnabled ? 'IS' : 'NOT'} enabled\n`);
  
  // Check 2: USDC balance
  console.log('2️⃣  USDC Balance:');
  const usdcBalance = await usdc.balanceOf(SAFE);
  const usdcFormatted = ethers.utils.formatUnits(usdcBalance, 6);
  console.log(`   ${usdcBalance.gt(0) ? '✅' : '❌'} ${usdcFormatted} USDC\n`);
  
  // Check 3: USDC approved to module
  console.log('3️⃣  USDC Approval to Module:');
  const usdcApprovalToModule = await usdc.allowance(SAFE, NEW_MODULE);
  const approvedToModule = usdcApprovalToModule.gt(0);
  console.log(`   ${approvedToModule ? '✅' : '❌'} ${approvedToModule ? 'Approved' : 'NOT approved'} (${ethers.utils.formatUnits(usdcApprovalToModule, 6)} USDC)\n`);
  
  // Check 4: USDC approved to Uniswap
  console.log('4️⃣  USDC Approval to Uniswap:');
  const usdcApprovalToUniswap = await usdc.allowance(SAFE, UNISWAP_ROUTER);
  const approvedToUniswap = usdcApprovalToUniswap.gt(0);
  console.log(`   ${approvedToUniswap ? '✅' : '❌'} ${approvedToUniswap ? 'Approved' : 'NOT approved'} (${ethers.utils.formatUnits(usdcApprovalToUniswap, 6)} USDC)\n`);
  
  // Check 5: Capital initialized
  console.log('5️⃣  Capital Initialized:');
  try {
    const capital = await module.getCapital(SAFE);
    const capitalFormatted = ethers.utils.formatUnits(capital, 6);
    const isInitialized = capital.gt(0);
    console.log(`   ${isInitialized ? '✅' : '❌'} ${isInitialized ? 'Initialized' : 'NOT initialized'} (${capitalFormatted} USDC)\n`);
  } catch (error: any) {
    console.log(`   ❌ NOT initialized (error: ${error.message})\n`);
  }
  
  console.log('═══════════════════════════════════════════════════════');
  
  if (!isEnabled) {
    console.log('\n❌ ISSUE: Module not enabled!');
    console.log('   → Enable module in Safe settings\n');
  } else if (!approvedToModule || !approvedToUniswap) {
    console.log('\n❌ ISSUE: Missing approvals!');
    console.log('   → Need to approve USDC to module and Uniswap\n');
    console.log('   Run completeSetup() on the module:\n');
    console.log('   1. Go to Safe Transaction Builder');
    console.log('   2. Call completeSetup() on module address');
  } else {
    console.log('\n✅ Setup looks good!\n');
  }
}

main();

