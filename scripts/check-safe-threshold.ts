/**
 * Check Safe threshold and owners
 */

import { ethers } from 'ethers';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';

const SAFE_ABI = [
  'function getThreshold() view returns (uint256)',
  'function getOwners() view returns (address[])',
];

async function main() {
  try {
    console.log('🔍 Checking Safe configuration...\n');
    console.log('Safe:', SAFE_ADDRESS);
    console.log('');

    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
    const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);

    const threshold = await safe.getThreshold();
    const owners = await safe.getOwners();

    console.log('Signature Threshold:', threshold.toString());
    console.log('Number of Owners:', owners.length);
    console.log('\nOwners:');
    owners.forEach((owner: string, i: number) => {
      console.log(`  ${i + 1}. ${owner}`);
    });

    console.log('');
    if (threshold.toNumber() > 1) {
      console.log('⚠️  Your Safe requires', threshold.toString(), 'signatures!');
      console.log('   Make sure all required owners sign the transaction.');
    } else {
      console.log('✅ Safe requires only 1 signature.');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();

