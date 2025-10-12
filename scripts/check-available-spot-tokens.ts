/**
 * Check available SPOT tokens
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking Available SPOT Tokens\n');
    console.log('═══════════════════════════════════════════════\n');

    // Get all tokens from token registry (SPOT tokens on Arbitrum)
    const spotTokens = await prisma.tokenRegistry.findMany({
      where: {
        chain: 'arbitrum',
      },
      orderBy: {
        tokenSymbol: 'asc',
      },
    });

    if (spotTokens.length === 0) {
      console.log('❌ No SPOT tokens found in registry');
      console.log('   Run setup-tokens-and-venues.ts to populate\n');
      return;
    }

    console.log(`Found ${spotTokens.length} SPOT tokens:\n`);

    // Group by category
    const categories: Record<string, any[]> = {
      'Stablecoins': [],
      'Major Crypto': [],
      'Meme Coins': [],
      'DeFi': [],
      'Layer 1/2': [],
      'Other': [],
    };

    for (const token of spotTokens) {
      const symbol = token.tokenSymbol;
      
      if (['USDC', 'USDT', 'DAI'].includes(symbol)) {
        categories['Stablecoins'].push(token);
      } else if (['BTC', 'ETH', 'WETH'].includes(symbol)) {
        categories['Major Crypto'].push(token);
      } else if (['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK'].includes(symbol)) {
        categories['Meme Coins'].push(token);
      } else if (['UNI', 'LINK', 'AAVE', 'CRV', 'MKR', 'COMP'].includes(symbol)) {
        categories['DeFi'].push(token);
      } else if (['ARB', 'OP', 'MATIC', 'SOL', 'AVAX', 'NEAR'].includes(symbol)) {
        categories['Layer 1/2'].push(token);
      } else {
        categories['Other'].push(token);
      }
    }

    // Display by category
    for (const [category, tokens] of Object.entries(categories)) {
      if (tokens.length === 0) continue;
      
      console.log(`📦 ${category} (${tokens.length}):`);
      for (const token of tokens) {
        const hasAddress = token.tokenAddress ? '✅' : '❌';
        console.log(`   ${hasAddress} ${token.tokenSymbol.padEnd(8)} ${token.tokenAddress || '(no address)'}`);
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════');
    console.log(`📊 Total: ${spotTokens.length} SPOT tokens`);
    console.log('═══════════════════════════════════════════════\n');

    console.log('💡 Note:');
    console.log('   • Tokens with ✅ have addresses and can be traded');
    console.log('   • Tokens with ❌ need addresses added to database');
    console.log('   • Trading pairs: TOKEN/USDC via Uniswap V3\n');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

