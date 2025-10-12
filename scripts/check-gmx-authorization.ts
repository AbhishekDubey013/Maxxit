/**
 * Check if executor is authorized on GMX
 */

import { ethers } from 'ethers';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const EXECUTOR_ADDRESS = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';

const ROUTER_ABI = [
  'function isSubaccount(address account, address subaccount) external view returns (bool)',
];

async function main() {
  try {
    console.log('🔍 Checking GMX authorization...\n');
    console.log('Safe:', SAFE_ADDRESS);
    console.log('Executor:', EXECUTOR_ADDRESS);
    console.log('GMX Router:', GMX_ROUTER);
    console.log('');

    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
    
    // Check if contract exists
    const code = await provider.getCode(GMX_ROUTER);
    if (code === '0x') {
      console.log('❌ GMX Router contract does NOT exist at this address!');
      console.log('   This is the problem - wrong address!');
      return;
    }
    
    console.log('✅ GMX Router contract exists');
    console.log('');

    // Check authorization
    const router = new ethers.Contract(GMX_ROUTER, ROUTER_ABI, provider);
    
    try {
      const isAuthorized = await router.isSubaccount(SAFE_ADDRESS, EXECUTOR_ADDRESS);
      console.log('Executor Authorized:', isAuthorized ? '✅ YES' : '❌ NO');
      
      if (isAuthorized) {
        console.log('\n✅ Executor is already authorized! No need for Step 2.');
      } else {
        console.log('\n⚠️  Executor NOT authorized. Step 2 is needed.');
      }
    } catch (error: any) {
      console.log('❌ Error calling isSubaccount():', error.message);
      console.log('   The contract might not have this function!');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
