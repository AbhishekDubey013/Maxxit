/**
 * Diagnose Friend's Trading Setup
 * Check why the trade failed for Safe 0xe9ecbddb6308036f5470826a1fdfc734cfe866b1
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0xe9ecbddb6308036f5470826a1fdfc734cfe866b1';
const MODULE_ADDRESS = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

async function main() {
  console.log('\n🔍 DIAGNOSING FRIEND\'S SETUP\n');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Safe Address: ${SAFE_ADDRESS}`);
  console.log(`Module Address: ${MODULE_ADDRESS}\n`);

  const provider = new ethers.providers.JsonRpcProvider(RPC);

  // Check 1: Module Enabled
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1️⃣  CHECKING MODULE STATUS\n');
  
  const safeAbi = ['function isModuleEnabled(address module) view returns (bool)'];
  const safe = new ethers.Contract(SAFE_ADDRESS, safeAbi, provider);
  
  try {
    const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    if (isEnabled) {
      console.log('✅ Module is ENABLED on Safe');
    } else {
      console.log('❌ Module is NOT ENABLED on Safe');
      console.log('   → Friend needs to enable the module first!');
      console.log('   → Use Safe Transaction Builder to call enableModule()');
      return;
    }
  } catch (error: any) {
    console.log('❌ Failed to check module status:', error.message);
    return;
  }

  // Check 2: USDC Balance
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('2️⃣  CHECKING USDC BALANCE\n');
  
  const erc20Abi = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ];
  
  const usdc = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
  
  try {
    const balance = await usdc.balanceOf(SAFE_ADDRESS);
    const balanceFormatted = ethers.utils.formatUnits(balance, 6);
    console.log(`USDC Balance: ${balanceFormatted} USDC`);
    
    if (balance.lt(ethers.utils.parseUnits('1', 6))) {
      console.log('❌ Insufficient USDC balance (need at least 1 USDC for trade)');
      return;
    } else {
      console.log('✅ Sufficient USDC balance');
    }
  } catch (error: any) {
    console.log('❌ Failed to check USDC balance:', error.message);
  }

  // Check 3: USDC Approval to Module
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('3️⃣  CHECKING USDC APPROVAL TO MODULE\n');
  
  try {
    const allowance = await usdc.allowance(SAFE_ADDRESS, MODULE_ADDRESS);
    const allowanceFormatted = ethers.utils.formatUnits(allowance, 6);
    console.log(`USDC Allowance: ${allowanceFormatted} USDC`);
    
    if (allowance.lt(ethers.utils.parseUnits('1', 6))) {
      console.log('❌ USDC not approved to module');
      console.log('   → Friend needs to approve USDC to module!');
      console.log(`   → Call: USDC.approve(${MODULE_ADDRESS}, MAX_UINT256)`);
      return;
    } else {
      console.log('✅ USDC is approved to module');
    }
  } catch (error: any) {
    console.log('❌ Failed to check USDC approval:', error.message);
  }

  // Check 4: Capital Initialized
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('4️⃣  CHECKING CAPITAL INITIALIZATION\n');
  
  const moduleAbi = [
    'function getCapital(address safe) view returns (uint256)',
    'function isTokenWhitelisted(address safe, address token) view returns (bool)'
  ];
  
  const module = new ethers.Contract(MODULE_ADDRESS, moduleAbi, provider);
  
  try {
    const capital = await module.getCapital(SAFE_ADDRESS);
    const capitalFormatted = ethers.utils.formatUnits(capital, 6);
    console.log(`Capital Tracked: ${capitalFormatted} USDC`);
    
    if (capital.eq(0)) {
      console.log('❌ Capital NOT initialized');
      console.log('   → Friend needs to initialize capital!');
      console.log('   → This should have been done during setup');
      return;
    } else {
      console.log('✅ Capital is initialized');
    }
  } catch (error: any) {
    console.log('❌ Failed to check capital:', error.message);
  }

  // Check 5: WETH Whitelisted
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('5️⃣  CHECKING WETH WHITELIST STATUS\n');
  
  try {
    const isWhitelisted = await module.isTokenWhitelisted(SAFE_ADDRESS, WETH_ADDRESS);
    
    if (!isWhitelisted) {
      console.log('❌ WETH is NOT whitelisted for this Safe');
      console.log('   → Module owner needs to whitelist WETH');
      console.log(`   → Call: module.setTokenWhitelist(${SAFE_ADDRESS}, ${WETH_ADDRESS}, true)`);
      return;
    } else {
      console.log('✅ WETH is whitelisted');
    }
  } catch (error: any) {
    console.log('❌ Failed to check WETH whitelist:', error.message);
  }

  // Check 6: USDC Approval to Uniswap Router
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('6️⃣  CHECKING USDC APPROVAL TO UNISWAP ROUTER\n');
  
  try {
    const allowance = await usdc.allowance(SAFE_ADDRESS, UNISWAP_ROUTER);
    const allowanceFormatted = ethers.utils.formatUnits(allowance, 6);
    console.log(`USDC → Uniswap Allowance: ${allowanceFormatted} USDC`);
    
    if (allowance.lt(ethers.utils.parseUnits('1', 6))) {
      console.log('❌ USDC not approved to Uniswap Router');
      console.log('   → Module should handle this automatically');
      console.log('   → But checking if it\'s the issue...');
    } else {
      console.log('✅ USDC is approved to Uniswap Router');
    }
  } catch (error: any) {
    console.log('❌ Failed to check Uniswap approval:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('🔍 DIAGNOSIS COMPLETE\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

