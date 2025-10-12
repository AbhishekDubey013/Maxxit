import { ethers } from 'ethers';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);

const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';

async function checkContract() {
  console.log('\n🔍 Checking Contract at', MODULE_ADDRESS);
  console.log('═'.repeat(60));
  
  // Check if contract exists
  const code = await provider.getCode(MODULE_ADDRESS);
  console.log('\n📜 Contract Code Length:', code.length, 'characters');
  console.log('   First 100 chars:', code.substring(0, 100));
  
  if (code === '0x') {
    console.log('\n❌ NO CONTRACT DEPLOYED at this address!');
    console.log('   The address has no bytecode.');
  } else {
    console.log('\n✅ Contract IS deployed');
    
    // Check balance
    const balance = await provider.getBalance(MODULE_ADDRESS);
    console.log('\n💰 Contract ETH Balance:', ethers.utils.formatEther(balance), 'ETH');
  }
  
  console.log('\n🔗 View on Arbiscan:');
  console.log(`https://arbiscan.io/address/${MODULE_ADDRESS}\n`);
}

checkContract().catch(console.error);

