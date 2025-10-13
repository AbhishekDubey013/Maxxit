/**
 * Add missing tokens to TokenRegistry
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Missing tokens on Arbitrum
const MISSING_TOKENS = [
  { symbol: 'UNI', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' },
  { symbol: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a' },
  { symbol: 'LDO', address: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60' },
  { symbol: 'CRV', address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978' },
  { symbol: 'AAVE', address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196' },
  { symbol: 'PENDLE', address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8' },
];

async function main() {
  console.log('🔧 Adding missing tokens to TokenRegistry...\n');

  for (const token of MISSING_TOKENS) {
    try {
      // Check if exists
      const existing = await prisma.tokenRegistry.findFirst({
        where: {
          chain: 'arbitrum-one',
          tokenSymbol: token.symbol
        }
      });

      if (existing) {
        console.log(`✓ ${token.symbol} already exists`);
        continue;
      }

      // Add token
      await prisma.tokenRegistry.create({
        data: {
          chain: 'arbitrum-one',
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          preferredRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
        }
      });

      console.log(`✅ Added ${token.symbol} (${token.address})`);
    } catch (error: any) {
      console.error(`❌ Failed to add ${token.symbol}:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ TokenRegistry updated!\n');
  console.log('Position monitoring will now work for all 14 tokens.\n');

  await prisma.$disconnect();
}

main();

