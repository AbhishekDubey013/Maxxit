/**
 * Whitelist GMX market tokens in MaxxitTradingModuleV2
 */

import { createSafeModuleService } from '../lib/safe-module-service';

// GMX Market tokens (Arbitrum One)
const GMX_MARKETS: Record<string, string> = {
  'BTC': '0x47c031236e19d024b42f8AE6780E44A573170703',
  'ETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
  'WETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336', // Same as ETH
  'SOL': '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
  'ARB': '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
  'LINK': '0x7f1fa204bb700853D36994DA19F830b6Ad18455C',
};

async function main() {
  console.log('\n🔐 Whitelisting GMX market tokens...\n');

  const moduleAddress = process.env.MODULE_ADDRESS_V2 || process.env.MODULE_ADDRESS;
  if (!moduleAddress) {
    throw new Error('MODULE_ADDRESS_V2 not set in environment');
  }

  const chainId = 42161; // Arbitrum One

  console.log('📋 Configuration:');
  console.log(`├─ Module: ${moduleAddress}`);
  console.log(`└─ Chain: Arbitrum One (${chainId})\n`);

  const moduleService = createSafeModuleService(
    moduleAddress,
    chainId,
    process.env.EXECUTOR_PRIVATE_KEY
  );

  console.log('🏷️  Tokens to whitelist:');
  for (const [symbol, address] of Object.entries(GMX_MARKETS)) {
    console.log(`├─ ${symbol}: ${address}`);
  }
  console.log('');

  // Whitelist each market token
  let successCount = 0;
  let failCount = 0;

  for (const [symbol, address] of Object.entries(GMX_MARKETS)) {
    try {
      console.log(`⏳ Whitelisting ${symbol}...`);
      const result = await moduleService.setTokenWhitelist(address, true);
      
      if (result.success) {
        console.log(`✅ ${symbol} whitelisted! TX: ${result.txHash}\n`);
        successCount++;
      } else {
        console.error(`❌ ${symbol} failed: ${result.error}\n`);
        failCount++;
      }
    } catch (error: any) {
      console.error(`❌ ${symbol} error: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Whitelist Complete!`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Results:`);
  console.log(`├─ Success: ${successCount}/${Object.keys(GMX_MARKETS).length}`);
  console.log(`└─ Failed: ${failCount}/${Object.keys(GMX_MARKETS).length}`);
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Test GMX trading flow');
  console.log('2. Create GMX agent');
  console.log('3. Execute manual trade via Telegram');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Whitelist failed:', error);
    process.exit(1);
  });

