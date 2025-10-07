#!/usr/bin/env tsx
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
const MODULE = '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const SAFE = '0xC613Df8883852667066a8a08c65c18eDe285678D';
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ROUTER = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';

const MODULE_ABI = [
  'function isInitialized(address) view returns (bool)',
  'function initialCapital(address) view returns (uint256)',
];

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

async function checkState() {
  const module = new ethers.Contract(MODULE, MODULE_ABI, provider);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
  
  console.log('🔍 Checking Safe state for swap execution\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check capital initialization
  const initialized = await module.isInitialized(SAFE);
  const capital = await module.initialCapital(SAFE);
  
  console.log('Capital Tracking:');
  console.log('  Initialized:', initialized ? '✅ YES' : '❌ NO');
  console.log('  Initial Capital:', ethers.utils.formatUnits(capital, 6), 'USDC');
  console.log('');
  
  // Check USDC balance
  const balance = await usdc.balanceOf(SAFE);
  console.log('USDC Balance:', ethers.utils.formatUnits(balance, 6), 'USDC');
  console.log('');
  
  // Check USDC approval to router
  const allowance = await usdc.allowance(SAFE, ROUTER);
  console.log('USDC Approval to Router:');
  console.log('  Allowance:', ethers.utils.formatUnits(allowance, 6), 'USDC');
  console.log('  Router:', ROUTER);
  console.log('  Status:', allowance.gt(0) ? '✅ Approved' : '❌ Not approved');
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!initialized) {
    console.log('❌ ISSUE: Capital not initialized');
    console.log('   Module needs to initialize capital first');
    console.log('   This happens automatically on first trade\n');
  }
  
  if (allowance.eq(0)) {
    console.log('❌ ISSUE: USDC not approved to router');
    console.log('   Safe needs to approve USDC spending');
    console.log('   Module should handle this in executeTrade');
    console.log('   Check if approval step is working\n');
  }
  
  if (initialized && allowance.gt(0)) {
    console.log('✅ All state checks passed - issue is elsewhere');
  }
}

checkState().catch(console.error);
