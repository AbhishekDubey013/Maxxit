/**
 * Production Setup Script
 * Fixes all configuration issues and prepares system for automated trading
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

// Token configurations for Arbitrum
const TOKENS = [
  {
    symbol: 'ARB',
    address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
    decimals: 18,
    uniswapV3Pool: '0xC6F780497A95e246EB9449f5e4770916DCd6396A', // ARB/USDC 0.05% pool
  },
  {
    symbol: 'WETH',
    address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    decimals: 18,
    uniswapV3Pool: '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443', // WETH/USDC 0.05% pool
  },
  {
    symbol: 'LINK',
    address: '0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
    decimals: 18,
    uniswapV3Pool: '0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff', // LINK/USDC 0.3% pool
  },
  {
    symbol: 'UNI',
    address: '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0',
    decimals: 18,
    uniswapV3Pool: '0x0845c0bFe75691B1e21b24351aAc581a7FB6b7Df', // UNI/USDC 0.3% pool
  },
];

async function setupProduction() {
  console.log('🚀 Production Setup Script\n');
  console.log('━'.repeat(60));
  
  let fixedCount = 0;
  let addedCount = 0;

  try {
    // 1. Fix existing token registry entries (wrong chain name)
    console.log('\n📋 Step 1: Fixing Token Registry\n');
    
    const wrongChainTokens = await prisma.tokenRegistry.findMany({
      where: {
        chain: {
          not: 'arbitrum-one'
        }
      }
    });

    for (const token of wrongChainTokens) {
      // Check if arbitrum-one version already exists
      const existing = await prisma.tokenRegistry.findFirst({
        where: {
          chain: 'arbitrum-one',
          tokenSymbol: token.tokenSymbol,
        }
      });

      if (existing) {
        // Delete the wrong chain entry
        await prisma.tokenRegistry.delete({
          where: { id: token.id }
        });
        console.log(`   ✅ Removed duplicate ${token.tokenSymbol} (${token.chain})`);
      } else {
        // Update to correct chain
        await prisma.tokenRegistry.update({
          where: { id: token.id },
          data: { chain: 'arbitrum-one' }
        });
        console.log(`   ✅ Fixed ${token.tokenSymbol}: ${token.chain} → arbitrum-one`);
      }
      fixedCount++;
    }

    // 2. Add missing tokens to registry
    console.log('\n📋 Step 2: Adding Tokens to Registry\n');
    
    for (const token of TOKENS) {
      const existing = await prisma.tokenRegistry.findFirst({
        where: {
          chain: 'arbitrum-one',
          tokenSymbol: token.symbol,
        },
      });

      if (existing) {
        // Update if address is wrong
        if (existing.tokenAddress.toLowerCase() !== token.address.toLowerCase()) {
          await prisma.tokenRegistry.update({
            where: { id: existing.id },
            data: {
              tokenAddress: token.address,
              preferredRouter: token.uniswapV3Pool,
            },
          });
          console.log(`   ✅ Updated ${token.symbol}: ${existing.tokenAddress} → ${token.address}`);
          fixedCount++;
        } else {
          console.log(`   ✓  ${token.symbol}: Already configured`);
        }
      } else {
        // Add new token
        await prisma.tokenRegistry.create({
          data: {
            chain: 'arbitrum-one',
            tokenSymbol: token.symbol,
            tokenAddress: token.address,
            preferredRouter: token.uniswapV3Pool,
          },
        });
        console.log(`   ✅ Added ${token.symbol} to registry`);
        addedCount++;
      }
    }

    // 3. Verify all tokens are accessible
    console.log('\n📋 Step 3: Verifying Token Prices\n');
    
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc'
    );

    for (const token of TOKENS) {
      try {
        // Check token exists on-chain
        const code = await provider.getCode(token.address);
        if (code === '0x') {
          console.log(`   ❌ ${token.symbol}: Not found on-chain at ${token.address}`);
        } else {
          console.log(`   ✅ ${token.symbol}: Verified on-chain`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${token.symbol}: ${error.message}`);
      }
    }

    // 4. Check venue status (simple check, no updates needed)
    console.log('\n📋 Step 4: Checking Venue Status\n');
    
    const spotTokens = await prisma.venueStatus.findMany({
      where: { venue: 'SPOT' }
    });

    if (spotTokens.length > 0) {
      console.log(`   ✅ SPOT venue: ${spotTokens.length} tokens configured`);
    } else {
      console.log('   ⚠️  SPOT venue: No tokens configured (will use any SPOT-compatible token)');
    }

    // 5. Summary
    console.log('\n━'.repeat(60));
    console.log('\n✅ Setup Complete!\n');
    console.log(`   Fixed entries: ${fixedCount}`);
    console.log(`   Added tokens: ${addedCount}`);
    console.log(`   Total tokens in registry: ${TOKENS.length}`);
    
    console.log('\n📋 Token Registry:');
    const allTokens = await prisma.tokenRegistry.findMany({
      where: { chain: 'arbitrum-one' }
    });
    
    allTokens.forEach(token => {
      console.log(`   • ${token.tokenSymbol.padEnd(6)} ${token.tokenAddress}`);
    });

    console.log('\n🚀 Next Steps:');
    console.log('   1. Start workers: bash workers/start-workers.sh');
    console.log('   2. View logs: tail -f logs/*.log');
    console.log('   3. Monitor positions: npx tsx workers/position-monitor-v2.ts');
    console.log('\n━'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupProduction();

