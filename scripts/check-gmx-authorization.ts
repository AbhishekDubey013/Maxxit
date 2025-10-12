/**
 * Check if executor is authorized as GMX subaccount for a Safe
 */

import { ethers } from 'ethers';

const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
const EXECUTOR_ADDRESS = process.env.EXECUTOR_ADDRESS || '';
const SAFE_ADDRESS = process.argv[2];
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

async function main() {
  if (!SAFE_ADDRESS) {
    console.error('Usage: npx tsx scripts/check-gmx-authorization.ts <SAFE_ADDRESS>');
    process.exit(1);
  }

  if (!EXECUTOR_ADDRESS) {
    throw new Error('EXECUTOR_ADDRESS not set in environment');
  }

  console.log('\n🔍 Checking GMX Authorization...\n');

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);

  const subaccountRouterAbi = [
    'function isSubaccount(address account, address subaccount) external view returns (bool)',
  ];

  const subaccountRouter = new ethers.Contract(GMX_ROUTER, subaccountRouterAbi, provider);

  const isAuthorized = await subaccountRouter.isSubaccount(SAFE_ADDRESS, EXECUTOR_ADDRESS);

  console.log('Safe Address:', SAFE_ADDRESS);
  console.log('Executor Address:', EXECUTOR_ADDRESS);
  console.log('GMX Router:', GMX_ROUTER);
  console.log('');
  console.log('Authorization Status:', isAuthorized ? '✅ AUTHORIZED' : '❌ NOT AUTHORIZED');
  console.log('');

  if (isAuthorized) {
    console.log('✅ Executor can create GMX orders for this Safe');
    console.log('✅ Ready for GMX trading!');
  } else {
    console.log('❌ Executor NOT authorized');
    console.log('');
    console.log('To authorize, run:');
    console.log(`npx tsx scripts/authorize-gmx-subaccount.ts ${SAFE_ADDRESS}`);
  }

  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

