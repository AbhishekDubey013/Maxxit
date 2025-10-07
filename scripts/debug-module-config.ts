#!/usr/bin/env tsx
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
const MODULE_ADDRESS = '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const SAFE_ADDRESS = '0xC613Df8883852667066a8a08c65c18eDe285678D';
const EXECUTOR = '0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6';
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
const ROUTER = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';

const MODULE_ABI = [
  'function authorizedExecutors(address) view returns (bool)',
  'function whitelistedDexes(address) view returns (bool)',
  'function whitelistedTokens(address) view returns (bool)',
  'function moduleOwner() view returns (address)',
];

const SAFE_ABI = [
  'function isModuleEnabled(address) view returns (bool)',
];

async function checkConfig() {
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, provider);
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);
  
  console.log('🔍 Debugging Module Configuration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Check module owner
    const owner = await module.moduleOwner();
    console.log('Module Owner:', owner);
    
    // Check if executor is authorized
    const executorAuthorized = await module.authorizedExecutors(EXECUTOR);
    console.log('Executor Address:', EXECUTOR);
    console.log('Is Authorized:', executorAuthorized ? '✅ YES' : '❌ NO');
    console.log('');
    
    // Check Safe has module enabled
    const moduleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    console.log('Safe Has Module Enabled:', moduleEnabled ? '✅ YES' : '❌ NO');
    console.log('');
    
    // Check token whitelists
    const usdcWhitelisted = await module.whitelistedTokens(USDC);
    const wethWhitelisted = await module.whitelistedTokens(WETH);
    console.log('USDC Whitelisted:', usdcWhitelisted ? '✅ YES' : '❌ NO', USDC);
    console.log('WETH Whitelisted:', wethWhitelisted ? '✅ YES' : '❌ NO', WETH);
    console.log('');
    
    // Check DEX whitelist
    const routerWhitelisted = await module.whitelistedDexes(ROUTER);
    console.log('Uniswap Router Whitelisted:', routerWhitelisted ? '✅ YES' : '❌ NO', ROUTER);
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Determine the issue
    if (!executorAuthorized) {
      console.log('❌ ISSUE: Executor not authorized in module!');
      console.log('   The executor needs to be whitelisted');
      console.log('\n   FIX: Module owner needs to call:');
      console.log(`   module.setExecutorAuthorization("${EXECUTOR}", true)`);
    } else if (!moduleEnabled) {
      console.log('❌ ISSUE: Module not enabled on Safe!');
      console.log('   Safe does not have the module enabled');
      console.log('\n   FIX: Enable module via Safe UI or transaction');
    } else if (!usdcWhitelisted || !wethWhitelisted) {
      console.log('❌ ISSUE: Tokens not whitelisted in module!');
      if (!usdcWhitelisted) console.log('   - USDC needs to be whitelisted');
      if (!wethWhitelisted) console.log('   - WETH needs to be whitelisted');
      console.log('\n   FIX: Module owner needs to call:');
      if (!usdcWhitelisted) console.log(`   module.setTokenWhitelist("${USDC}", true)`);
      if (!wethWhitelisted) console.log(`   module.setTokenWhitelist("${WETH}", true)`);
    } else if (!routerWhitelisted) {
      console.log('❌ ISSUE: DEX Router not whitelisted in module!');
      console.log('   Uniswap router needs to be whitelisted');
      console.log('\n   FIX: Module owner needs to call:');
      console.log(`   module.setDexWhitelist("${ROUTER}", true)`);
    } else {
      console.log('✅ All configuration checks passed!');
      console.log('   Issue must be something else (check transaction data)');
    }
    
  } catch (error: any) {
    console.log('❌ Error checking config:', error.message);
  }
}

checkConfig();
