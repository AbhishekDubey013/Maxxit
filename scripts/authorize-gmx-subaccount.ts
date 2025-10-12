/**
 * Authorize Executor as GMX Subaccount
 * 
 * This script generates the transaction data that users need to execute
 * via their Safe wallet to authorize the executor as a GMX subaccount.
 * 
 * SECURITY: This is a one-time setup per Safe
 * 
 * What this does:
 * - Authorizes executor to create GMX orders on behalf of Safe
 * - Positions are OWNED by Safe (not executor)
 * - Profits go to Safe
 * - Can be revoked anytime by Safe
 */

import { ethers } from 'ethers';

// Configuration
const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6'; // GMX SubaccountRouter on Arbitrum
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY || '';
const EXECUTOR_ADDRESS_ENV = process.env.EXECUTOR_ADDRESS || '';
const SAFE_ADDRESS = process.argv[2]; // Pass as argument

async function main() {
  if (!SAFE_ADDRESS) {
    console.error('Usage: npx tsx scripts/authorize-gmx-subaccount.ts <SAFE_ADDRESS>');
    process.exit(1);
  }

  // Derive executor address from private key if not explicitly set
  let EXECUTOR_ADDRESS = EXECUTOR_ADDRESS_ENV;
  if (!EXECUTOR_ADDRESS && EXECUTOR_PRIVATE_KEY) {
    const wallet = new ethers.Wallet(EXECUTOR_PRIVATE_KEY);
    EXECUTOR_ADDRESS = wallet.address;
  }

  if (!EXECUTOR_ADDRESS) {
    throw new Error('EXECUTOR_ADDRESS or EXECUTOR_PRIVATE_KEY must be set in environment');
  }

  console.log('\n🔐 GMX Subaccount Authorization\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Safe Address:', SAFE_ADDRESS);
  console.log('Executor Address:', EXECUTOR_ADDRESS);
  console.log('GMX Router:', GMX_ROUTER);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Build authorization transaction
  const subaccountRouterAbi = [
    'function setSubaccount(address subaccount, bool authorized) external',
  ];

  const iface = new ethers.utils.Interface(subaccountRouterAbi);
  const data = iface.encodeFunctionData('setSubaccount', [EXECUTOR_ADDRESS, true]);

  console.log('📋 Transaction to Execute via Safe:\n');
  console.log('To:', GMX_ROUTER);
  console.log('Value: 0 ETH');
  console.log('Data:', data);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 NEXT STEPS:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('1. Go to Safe Transaction Builder:');
  console.log('   https://app.safe.global/apps/open?safe=arb1:' + SAFE_ADDRESS);
  console.log('');
  console.log('2. Create New Transaction:');
  console.log('   - To:', GMX_ROUTER);
  console.log('   - Value: 0');
  console.log('   - Data (ABI):', 'setSubaccount(address,bool)');
  console.log('   - Subaccount:', EXECUTOR_ADDRESS);
  console.log('   - Authorized:', 'true');
  console.log('');
  console.log('3. Submit and Sign with Safe owners');
  console.log('');
  console.log('4. After execution, verify with:');
  console.log('   npx tsx scripts/check-gmx-authorization.ts', SAFE_ADDRESS);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('ℹ️  What this does:');
  console.log('   ✅ Authorizes executor to create GMX orders for this Safe');
  console.log('   ✅ GMX positions are OWNED by Safe (not executor)');
  console.log('   ✅ Profits go to Safe');
  console.log('   ✅ Can be revoked anytime by calling setSubaccount(executor, false)');
  console.log('');
  console.log('⚠️  Security limits (enforced by backend):');
  console.log('   - Max leverage: 10x');
  console.log('   - Max position size: 5000 USDC');
  console.log('   - Max daily volume: 20000 USDC');
  console.log('   - Whitelisted tokens: BTC, ETH, SOL, ARB, LINK');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Generate JSON for programmatic use
  const txJson = {
    to: GMX_ROUTER,
    value: '0',
    data: data,
    operation: 0, // CALL
    description: `Authorize ${EXECUTOR_ADDRESS} as GMX subaccount`,
  };

  console.log('📄 Transaction JSON (for API/SDK):\n');
  console.log(JSON.stringify(txJson, null, 2));
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

