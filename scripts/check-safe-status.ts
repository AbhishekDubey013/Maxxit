/**
 * Check Safe Status - Verify module enablement
 */

import { ethers } from 'ethers';

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb'; // V3 Module on Arbitrum
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

const SAFE_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function isModuleEnabled(address module) view returns (bool)',
  'function getModulesPaginated(address start, uint256 pageSize) view returns (address[] array, address next)',
  'function nonce() view returns (uint256)',
];

async function checkSafeStatus() {
  console.log('🔍 Checking Safe Status on Arbitrum One');
  console.log('━'.repeat(60));
  console.log(`📍 Safe Address: ${SAFE_ADDRESS}`);
  console.log(`🔧 Module Address: ${MODULE_ADDRESS}`);
  console.log('━'.repeat(60));

  try {
    // Connect to Arbitrum mainnet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    // Get block number to confirm connection
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to Arbitrum One (Block: ${blockNumber})`);
    console.log('');

    // Check if Safe exists by getting its code
    const code = await provider.getCode(SAFE_ADDRESS);
    if (code === '0x') {
      console.log('❌ ERROR: No contract found at this address!');
      console.log('This means the Safe was not deployed.');
      return;
    }
    console.log('✅ Safe contract exists at this address');

    // Create Safe contract instance
    const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);

    // Get Safe details
    console.log('');
    console.log('📊 SAFE DETAILS:');
    console.log('━'.repeat(60));

    const owners = await safe.getOwners();
    console.log(`👥 Owners (${owners.length}):`);
    owners.forEach((owner, i) => {
      console.log(`   ${i + 1}. ${owner}`);
    });

    const threshold = await safe.getThreshold();
    console.log(`🔑 Threshold: ${threshold}/${owners.length}`);

    const nonce = await safe.nonce();
    console.log(`🔢 Nonce: ${nonce}`);
    console.log(`   (Number of transactions executed: ${nonce})`);

    // Check module status
    console.log('');
    console.log('🔧 MODULE STATUS:');
    console.log('━'.repeat(60));

    const isModuleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    console.log(`Module: ${MODULE_ADDRESS}`);
    console.log(`Status: ${isModuleEnabled ? '✅ ENABLED' : '❌ NOT ENABLED'}`);

    // Get all enabled modules
    console.log('');
    console.log('📋 ALL ENABLED MODULES:');
    console.log('━'.repeat(60));
    
    const SENTINEL_ADDRESS = '0x0000000000000000000000000000000000000001';
    const [modules] = await safe.getModulesPaginated(SENTINEL_ADDRESS, 10);
    
    if (modules.length === 0) {
      console.log('   No modules enabled');
    } else {
      modules.forEach((module, i) => {
        console.log(`   ${i + 1}. ${module}`);
      });
    }

    // Get Safe creation info from block explorer
    console.log('');
    console.log('🔗 BLOCK EXPLORER LINKS:');
    console.log('━'.repeat(60));
    console.log(`Safe: https://arbiscan.io/address/${SAFE_ADDRESS}`);
    console.log(`Module: https://arbiscan.io/address/${MODULE_ADDRESS}`);
    
    console.log('');
    console.log('━'.repeat(60));
    console.log('✅ CHECK COMPLETE');

    // Summary
    console.log('');
    console.log('📝 SUMMARY:');
    console.log('━'.repeat(60));
    if (isModuleEnabled) {
      console.log('✅ Safe is properly configured with module enabled!');
      console.log('✅ Your agent can now execute trades through this Safe.');
    } else {
      console.log('⚠️  Safe is deployed but module is NOT enabled.');
      console.log('⚠️  You need to enable the module for the agent to work.');
    }

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    if (error.code === 'CALL_EXCEPTION') {
      console.log('');
      console.log('This might mean:');
      console.log('- The Safe contract is not deployed at this address');
      console.log('- The RPC is having issues');
    }
  }
}

checkSafeStatus().catch(console.error);

