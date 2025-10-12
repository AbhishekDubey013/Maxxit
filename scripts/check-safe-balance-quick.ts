import { ethers } from 'ethers';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

async function checkBalance() {
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const usdcContract = new ethers.Contract(
    USDC_ADDRESS,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  
  const balance = await usdcContract.balanceOf(SAFE_ADDRESS);
  const formatted = ethers.utils.formatUnits(balance, 6);
  
  console.log(`\n💰 Safe USDC Balance: ${formatted} USDC`);
  
  if (parseFloat(formatted) < 0.5) {
    console.log('\n⚠️  Balance is low. For testing, recommend adding USDC to Safe.');
    console.log(`   Safe Address: ${SAFE_ADDRESS}`);
  } else {
    console.log(`\n✅ Sufficient balance for testing!`);
    console.log(`\n💡 Suggested test trades:`);
    console.log(`   - Buy 0.25 USDC ARB`);
    console.log(`   - Buy 0.3 USDC LINK`);
  }
}

checkBalance();

