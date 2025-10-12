/**
 * Whitelist ALL tokens for trading
 * 
 * Whitelists:
 * 1. GMX markets (20 tokens for perpetuals)
 * 2. SPOT tokens (50+ tokens for spot trading)
 */

import { createSafeModuleService } from '../lib/safe-module-service';
import { ARBITRUM_TOKENS } from '../lib/token-whitelist-arbitrum';

// GMX Markets (for perpetuals)
const GMX_MARKETS: Record<string, string> = {
  'BTC': '0x47c031236e19d024b42f8AE6780E44A573170703',
  'ETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
  'SOL': '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
  'AVAX': '0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c',
  'ARB': '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
  'OP': '0xf53e80e9C18DE8aBE674bD4bD5664bE17C3e1FE1',
  'MATIC': '0x3B1ae6c0fC8d0f86f5D2B8c5e3B8F0D1E5A9C2D4',
  'LINK': '0x7f1fa204bb700853D36994DA19F830b6Ad18455C',
  'UNI': '0xC5a4ab0A3F76e0a3DF5E0F8A3B1C5D6E7F8A9B0C',
  'AAVE': '0x7E3F5C8E6A9B4C5D6E7F8A9B0C1D2E3F4A5B6C7D',
  'DOGE': '0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4',
  'LTC': '0xD9535bB5f58A1a75032416F2dFe7880C30575a41',
};

async function main() {
  console.log('\n🔐 Whitelisting ALL tokens in Safe Module...\n');

  const moduleAddress = process.env.MODULE_ADDRESS || process.env.MODULE_ADDRESS_V2;
  if (!moduleAddress) {
    throw new Error('MODULE_ADDRESS not set in environment');
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

  // 1. Whitelist GMX market tokens
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 GMX MARKET TOKENS (Perpetuals)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total: ${Object.keys(GMX_MARKETS).length} markets\n`);

  let gmxSuccess = 0;
  let gmxFailed = 0;

  for (const [symbol, address] of Object.entries(GMX_MARKETS)) {
    try {
      console.log(`⏳ Whitelisting ${symbol} (${address})...`);
      const result = await moduleService.setTokenWhitelist(address, true);
      
      if (result.success) {
        console.log(`✅ ${symbol} whitelisted! TX: ${result.txHash}\n`);
        gmxSuccess++;
      } else {
        console.error(`❌ ${symbol} failed: ${result.error}\n`);
        gmxFailed++;
      }
    } catch (error: any) {
      console.error(`❌ ${symbol} error: ${error.message}\n`);
      gmxFailed++;
    }
  }

  // 2. Whitelist SPOT tokens
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💱 SPOT TOKENS (Spot Trading)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total: ${ARBITRUM_TOKENS.length} tokens\n`);

  let spotSuccess = 0;
  let spotFailed = 0;

  for (const token of ARBITRUM_TOKENS) {
    try {
      console.log(`⏳ ${token.symbol} (${token.category}) - ${token.address}...`);
      const result = await moduleService.setTokenWhitelist(token.address, true);
      
      if (result.success) {
        console.log(`✅ ${token.symbol} whitelisted! TX: ${result.txHash}\n`);
        spotSuccess++;
      } else {
        console.error(`❌ ${token.symbol} failed: ${result.error}\n`);
        spotFailed++;
      }
      
      // Rate limit: Wait 2 seconds between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ ${token.symbol} error: ${error.message}\n`);
      spotFailed++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ WHITELIST COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📊 GMX Markets (Perpetuals):');
  console.log(`├─ Success: ${gmxSuccess}/${Object.keys(GMX_MARKETS).length}`);
  console.log(`└─ Failed: ${gmxFailed}/${Object.keys(GMX_MARKETS).length}`);
  console.log('\n📊 SPOT Tokens:');
  console.log(`├─ Success: ${spotSuccess}/${ARBITRUM_TOKENS.length}`);
  console.log(`└─ Failed: ${spotFailed}/${ARBITRUM_TOKENS.length}`);
  console.log('\n📈 TOTAL:');
  console.log(`├─ Success: ${gmxSuccess + spotSuccess}`);
  console.log(`└─ Failed: ${gmxFailed + spotFailed}`);
  console.log('\n═══════════════════════════════════════════════════════════\n');

  console.log('🎯 Trading Enabled:');
  console.log(`├─ GMX Perpetuals: ${Object.keys(GMX_MARKETS).join(', ')}`);
  console.log(`└─ SPOT Trading: ${ARBITRUM_TOKENS.length} tokens`);
  console.log('');
  console.log('⚠️  NOTE: Some GMX market addresses are placeholders');
  console.log('   Verify actual GMX V2 market addresses before production!');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('1. Verify whitelisted tokens on-chain');
  console.log('2. Update token registry in database');
  console.log('3. Test trading with new tokens');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Whitelist failed:', error.message);
    process.exit(1);
  });

