/**
 * Complete setup for new V2 module
 * This will approve USDC to module and Uniswap, and initialize capital
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const NEW_MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';

const MODULE_ABI = [
  'function completeSetup()',
];

async function main() {
  console.log('🔧 Setting up NEW V2 Module...\n');
  console.log(`Safe: ${SAFE}`);
  console.log(`Module: ${NEW_MODULE}\n`);
  
  // Generate the transaction data
  const iface = new ethers.utils.Interface(MODULE_ABI);
  const txData = iface.encodeFunctionData('completeSetup', []);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 TRANSACTION DATA FOR SAFE TRANSACTION BUILDER');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('**To Address:**');
  console.log(NEW_MODULE);
  console.log('\n**Value:**');
  console.log('0');
  console.log('\n**Data (Hex):**');
  console.log(txData);
  console.log('\n**Or use this ABI:**');
  console.log('function completeSetup()');
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎯 WHAT THIS DOES:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('1. ✅ Approves USDC to module (for 0.2 USDC platform fees)');
  console.log('2. ✅ Approves USDC to Uniswap (for token swaps)');
  console.log('3. ✅ Initializes capital tracking in module\n');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📝 STEPS TO EXECUTE:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('1. Go to Safe Transaction Builder:');
  console.log('   https://app.safe.global/apps/open?safe=arb1:0x9A85f7140776477F1A79Ea29b7A32495636f5e20&appUrl=https://safe-apps.dev.gnosisdev.com/tx-builder\n');
  console.log('2. Click "Add Transaction"');
  console.log('3. Enter:');
  console.log(`   - To: ${NEW_MODULE}`);
  console.log('   - Value: 0');
  console.log('   - ABI: function completeSetup()');
  console.log('4. Click "Add Transaction"');
  console.log('5. Click "Create Batch" → Sign → Execute\n');
  
  console.log('✅ After execution, all tokens will be approved and trading will work!\n');
}

main();
