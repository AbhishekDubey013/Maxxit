#!/usr/bin/env tsx

/**
 * Verify Arbitrum Configuration
 * 
 * Checks that all environment variables are set correctly for Arbitrum
 * 
 * Usage:
 *   npx tsx scripts/verify-arbitrum-config.ts
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const REQUIRED_VARS = [
  'TRADING_MODULE_ADDRESS',
  'PLATFORM_FEE_RECEIVER',
  'EXECUTOR_ADDRESS',
  'DEPLOYER_PRIVATE_KEY',
];

const ARBITRUM_VARS = [
  'CHAIN_ID',
  'ARBITRUM_RPC',
  'USDC_ADDRESS',
];

const EXPECTED_VALUES = {
  CHAIN_ID: '42161',
  TRADING_MODULE_ADDRESS: '0x74437d894C8E8A5ACf371E10919c688ae79E89FA',
  USDC_ADDRESS: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

async function main() {
  console.log('🔍 Verifying Arbitrum Configuration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let hasErrors = false;

// Check required vars
console.log('1️⃣  Checking Required Variables:\n');
for (const varName of REQUIRED_VARS) {
  const value = process.env[varName];
  if (!value) {
    console.log(`   ❌ ${varName} - NOT SET`);
    hasErrors = true;
  } else {
    const displayValue = varName.includes('PRIVATE_KEY') 
      ? `${value.slice(0, 10)}...` 
      : value;
    console.log(`   ✅ ${varName} - ${displayValue}`);
  }
}

console.log('');

// Check Arbitrum vars
console.log('2️⃣  Checking Arbitrum Variables:\n');
for (const varName of ARBITRUM_VARS) {
  const value = process.env[varName];
  if (!value) {
    console.log(`   ⚠️  ${varName} - NOT SET (will use default)`);
  } else {
    console.log(`   ✅ ${varName} - ${value}`);
  }
}

console.log('');

// Verify expected values
console.log('3️⃣  Verifying Expected Values:\n');
for (const [varName, expected] of Object.entries(EXPECTED_VALUES)) {
  const actual = process.env[varName];
  if (actual === expected) {
    console.log(`   ✅ ${varName} - Correct`);
  } else if (actual) {
    console.log(`   ⚠️  ${varName}`);
    console.log(`      Expected: ${expected}`);
    console.log(`      Actual:   ${actual}`);
  } else {
    console.log(`   ❌ ${varName} - NOT SET`);
    hasErrors = true;
  }
}

console.log('');

// Check RPC connection
console.log('4️⃣  Testing RPC Connection:\n');
try {
  const rpcUrl = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  
  if (network.chainId === 42161) {
    console.log(`   ✅ Connected to Arbitrum (Chain ID: ${network.chainId})`);
    console.log(`   ✅ Current block: ${blockNumber}`);
  } else {
    console.log(`   ❌ Wrong network! Chain ID: ${network.chainId}`);
    hasErrors = true;
  }
} catch (error: any) {
  console.log(`   ❌ RPC connection failed: ${error.message}`);
  hasErrors = true;
}

console.log('');

// Check module contract
console.log('5️⃣  Checking Module Contract:\n');
try {
  const rpcUrl = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const moduleAddress = process.env.TRADING_MODULE_ADDRESS;
  
  if (moduleAddress) {
    const code = await provider.getCode(moduleAddress);
    if (code !== '0x' && code !== '0x0') {
      console.log(`   ✅ Module contract exists at ${moduleAddress}`);
      console.log(`   ✅ Contract size: ${(code.length - 2) / 2} bytes`);
    } else {
      console.log(`   ❌ No contract at ${moduleAddress}`);
      hasErrors = true;
    }
  } else {
    console.log(`   ❌ TRADING_MODULE_ADDRESS not set`);
    hasErrors = true;
  }
} catch (error: any) {
  console.log(`   ❌ Module check failed: ${error.message}`);
  hasErrors = true;
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

if (hasErrors) {
  console.log('❌ Configuration has errors! Please fix before proceeding.');
  console.log('');
  console.log('📝 To fix, add these to your .env:');
  console.log('');
  console.log('CHAIN_ID=42161');
  console.log('ARBITRUM_RPC=https://arb1.arbitrum.io/rpc');
  console.log('TRADING_MODULE_ADDRESS=0x74437d894C8E8A5ACf371E10919c688ae79E89FA');
  console.log('USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
  console.log('');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Your system is configured for Arbitrum.');
  console.log('');
  console.log('🚀 Ready to:');
  console.log('  - Accept user Safe wallets on Arbitrum');
  console.log('  - Execute gasless trades via module');
  console.log('  - Process signals and positions');
  console.log('');
  process.exit(0);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

