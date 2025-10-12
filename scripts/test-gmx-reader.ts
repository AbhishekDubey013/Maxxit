/**
 * Test GMX Reader - On-Chain Price Oracle
 * 
 * Tests that we can get prices from GMX contracts directly
 */

import { createGMXReader } from '../lib/adapters/gmx-reader';
import { ethers } from 'ethers';

const TEST_TOKENS = ['ETH', 'BTC', 'ARB', 'LINK'];

async function main() {
  console.log('\n🧪 ═══════════════════════════════════════════════════════');
  console.log('   GMX READER TEST - On-Chain Price Oracle');
  console.log('═══════════════════════════════════════════════════════\n');

  const rpcUrl = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  console.log(`📡 RPC: ${rpcUrl}\n`);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const gmxReader = createGMXReader(provider);

  console.log('🔍 Testing GMX Reader for multiple tokens...\n');

  for (const token of TEST_TOKENS) {
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`📊 ${token}/USD`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    try {
      const priceData = await gmxReader.getMarketPrice(token);
      
      if (priceData) {
        console.log(`✅ Success!`);
        console.log(`├─ Price: $${priceData.price.toFixed(2)}`);
        console.log(`├─ Price (Wei): ${priceData.priceWei.toString()} (30 decimals)`);
        console.log(`├─ Timestamp: ${new Date(priceData.timestamp * 1000).toISOString()}`);
        console.log(`└─ Source: GMX Reader (on-chain)\n`);
      } else {
        console.log(`⚠️  No price data returned`);
        console.log(`   This might be due to GMX Reader contract interface changes.\n`);
      }
    } catch (error: any) {
      console.log(`❌ Error:`, error.message);
      console.log(`   This is expected if GMX V2 Reader interface has changed.\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('📝 Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('ℹ️  GMX Reader Status:');
  console.log('   If all prices failed, GMX V2 Reader contract interface needs updating.');
  console.log('   The adapter is calling:');
  console.log('   - Contract: 0xf60becbba223EEA9495Da3f606753867eC10d139');
  console.log('   - Function: getMarketTokenPrice()');
  console.log('   - Network: Arbitrum One\n');

  console.log('🔧 Next Steps:');
  console.log('   1. If prices work: GMX Reader is ready! ✅');
  console.log('   2. If prices fail: Update GMX Reader ABI in gmx-reader.ts');
  console.log('   3. Check GMX V2 docs: https://gmx.io/docs/api/contracts-v2\n');

  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => {
    console.log('✅ GMX Reader test complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  });

