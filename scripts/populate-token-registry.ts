/**
 * Populate Token Registry with real tokens from Arbitrum, Base, GMX, and Hyperliquid
 * Run: npx tsx scripts/populate-token-registry.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Token Registry Data
// Sources: DEX Screener, CoinGecko, Official Protocol Docs

const tokens = [
  // Major assets - Available everywhere
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    coingeckoId: 'bitcoin',
    chains: {
      arbitrum: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // WBTC
      base: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', // cbBTC
    },
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    coingeckoId: 'ethereum',
    chains: {
      arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      base: '0x4200000000000000000000000000000000000006', // WETH
    },
  },
  
  // Stablecoins - Available on all chains
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
    chains: {
      arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    coingeckoId: 'tether',
    chains: {
      arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      base: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    },
  },
  
  // Layer 1 Alternatives
  {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    coingeckoId: 'solana',
    chains: {
      arbitrum: '0xb74Da9FE2F96B9E0a5f4A3cf0b92dd2bEC617124', // Bridged SOL
    },
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    decimals: 18,
    coingeckoId: 'avalanche-2',
    chains: {
      arbitrum: '0x565609fAF65B92F7be02468acF86f8979423e514',
    },
  },
  
  // Arbitrum Ecosystem
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    decimals: 18,
    coingeckoId: 'arbitrum',
    chains: {
      arbitrum: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    },
  },
  {
    symbol: 'GMX',
    name: 'GMX',
    decimals: 18,
    coingeckoId: 'gmx',
    chains: {
      arbitrum: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
    },
  },
  
  // Base Ecosystem
  {
    symbol: 'AERO',
    name: 'Aerodrome',
    decimals: 18,
    coingeckoId: 'aerodrome-finance',
    chains: {
      base: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    },
  },
  
  // Popular L2 tokens
  {
    symbol: 'OP',
    name: 'Optimism',
    decimals: 18,
    coingeckoId: 'optimism',
    chains: {
      arbitrum: '0x6f620EC89B8479e97A6985792d0c64F237566746', // Bridged
      base: '0x4200000000000000000000000000000000000042', // Native
    },
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    coingeckoId: 'matic-network',
    chains: {
      arbitrum: '0x7c9f4C87d911613Fe9ca58b579f737911AAD2D43',
    },
  },
  
  // DeFi Blue Chips
  {
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    coingeckoId: 'chainlink',
    chains: {
      arbitrum: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
      base: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196',
    },
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    coingeckoId: 'uniswap',
    chains: {
      arbitrum: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
      base: '0xc3De830EA07524a0761646a6a4e4be0e114a3C83',
    },
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    decimals: 18,
    coingeckoId: 'aave',
    chains: {
      arbitrum: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    },
  },
  
  // Trending Alt L1s
  {
    symbol: 'SUI',
    name: 'Sui',
    decimals: 9,
    coingeckoId: 'sui',
    chains: {
      // Bridged versions when available
    },
  },
  {
    symbol: 'APT',
    name: 'Aptos',
    decimals: 8,
    coingeckoId: 'aptos',
    chains: {
      // Bridged versions when available
    },
  },
  {
    symbol: 'SEI',
    name: 'Sei',
    decimals: 6,
    coingeckoId: 'sei-network',
    chains: {
      // Bridged versions when available
    },
  },
  
  // Meme coins (high volume)
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    decimals: 8,
    coingeckoId: 'dogecoin',
    chains: {
      arbitrum: '0xC4da4c24fd591125c3F47b340b6f4f76111883d8', // Bridged
    },
  },
  {
    symbol: 'PEPE',
    name: 'Pepe',
    decimals: 18,
    coingeckoId: 'pepe',
    chains: {
      arbitrum: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00',
      base: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    },
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    decimals: 6,
    coingeckoId: 'dogwifcoin',
    chains: {
      // Primarily on Solana
    },
  },
  
  // Additional popular tokens
  {
    symbol: 'LDO',
    name: 'Lido DAO',
    decimals: 18,
    coingeckoId: 'lido-dao',
    chains: {
      arbitrum: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60',
    },
  },
  {
    symbol: 'CRV',
    name: 'Curve DAO',
    decimals: 18,
    coingeckoId: 'curve-dao-token',
    chains: {
      arbitrum: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
    },
  },
  {
    symbol: 'MKR',
    name: 'Maker',
    decimals: 18,
    coingeckoId: 'maker',
    chains: {
      arbitrum: '0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879',
    },
  },
];

async function main() {
  console.log('🔧 Populating Token Registry...\n');

  let created = 0;
  let updated = 0;

  for (const token of tokens) {
    try {
      const existing = await prisma.tokenRegistry.findUnique({
        where: { symbol: token.symbol },
      });

      const data = {
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        coingeckoId: token.coingeckoId,
        contractAddresses: token.chains as any,
      };

      if (existing) {
        await prisma.tokenRegistry.update({
          where: { symbol: token.symbol },
          data,
        });
        updated++;
        console.log(`✅ Updated: ${token.symbol} (${token.name})`);
      } else {
        await prisma.tokenRegistry.create({ data });
        created++;
        console.log(`✅ Created: ${token.symbol} (${token.name})`);
      }

      // Show contract addresses
      if (token.chains.arbitrum) {
        console.log(`   Arbitrum: ${token.chains.arbitrum}`);
      }
      if (token.chains.base) {
        console.log(`   Base: ${token.chains.base}`);
      }
    } catch (error) {
      console.error(`❌ Error for ${token.symbol}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${tokens.length}`);
  console.log('\n✅ Token Registry populated!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
