/**
 * Diagnose Telegram Trade Failure
 * Checks all pre-trade validation steps
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const SAFE_ADDRESS = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320'; // Your test Safe
const TOKEN_SYMBOL = 'WETH'; // Token you're trying to trade
const VENUE = 'SPOT';
const CHAIN = 'arbitrum';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

async function diagnose() {
  console.log('🔍 Diagnosing Telegram Trade Failure');
  console.log('━'.repeat(60));
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log(`Token: ${TOKEN_SYMBOL}`);
  console.log(`Venue: ${VENUE}`);
  console.log('━'.repeat(60));
  console.log('');

  try {
    // CHECK 1: Venue Status
    console.log('1️⃣  CHECKING VENUE STATUS:');
    console.log('━'.repeat(60));
    
    const venueStatus = await prisma.venueStatus.findUnique({
      where: {
        venue_tokenSymbol: {
          venue: VENUE as any,
          tokenSymbol: TOKEN_SYMBOL,
        },
      },
    });

    if (!venueStatus) {
      console.log(`❌ ${TOKEN_SYMBOL} not available on ${VENUE}`);
      console.log('');
      console.log('💡 SOLUTION: Add token to venue status');
      console.log(`   Run: npx prisma studio`);
      console.log(`   Add VenueStatus: venue="${VENUE}", tokenSymbol="${TOKEN_SYMBOL}"`);
    } else {
      console.log(`✅ ${TOKEN_SYMBOL} available on ${VENUE}`);
    }
    console.log('');

    // CHECK 2: USDC Balance
    console.log('2️⃣  CHECKING USDC BALANCE:');
    console.log('━'.repeat(60));
    
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdcBalance = await usdc.balanceOf(SAFE_ADDRESS);
    const formattedBalance = ethers.utils.formatUnits(usdcBalance, 6);
    
    console.log(`USDC Balance: ${formattedBalance} USDC`);
    
    if (usdcBalance.eq(0)) {
      console.log('❌ No USDC in Safe');
      console.log('');
      console.log('💡 SOLUTION: Send USDC to Safe');
      console.log(`   Address: ${SAFE_ADDRESS}`);
    } else {
      console.log('✅ Safe has USDC');
    }
    console.log('');

    // CHECK 3: Token Registry
    console.log('3️⃣  CHECKING TOKEN REGISTRY:');
    console.log('━'.repeat(60));
    
    const tokenRegistry = await prisma.tokenRegistry.findUnique({
      where: {
        chain_tokenSymbol: {
          chain: CHAIN,
          tokenSymbol: TOKEN_SYMBOL,
        },
      },
    });

    if (!tokenRegistry) {
      console.log(`❌ ${TOKEN_SYMBOL} not found in TokenRegistry for ${CHAIN}`);
      console.log('');
      console.log('💡 SOLUTION: Add token to registry');
      console.log('   Option A: Run seed script');
      console.log('   Option B: Add manually via Prisma Studio');
      
      // Show example tokens
      console.log('');
      console.log('📋 Available tokens in registry:');
      const availableTokens = await prisma.tokenRegistry.findMany({
        where: { chain: CHAIN },
        select: { tokenSymbol: true, tokenAddress: true },
        take: 10,
      });
      
      if (availableTokens.length === 0) {
        console.log('   ⚠️  No tokens in registry! Need to seed database.');
      } else {
        availableTokens.forEach(t => {
          console.log(`   • ${t.tokenSymbol}: ${t.tokenAddress}`);
        });
      }
    } else {
      console.log(`✅ ${TOKEN_SYMBOL} found in registry`);
      console.log(`   Address: ${tokenRegistry.tokenAddress}`);
      console.log(`   Decimals: ${tokenRegistry.decimals}`);
    }
    console.log('');

    // CHECK 4: Module Status
    console.log('4️⃣  CHECKING MODULE STATUS:');
    console.log('━'.repeat(60));
    
    const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
    const SAFE_ABI = ['function isModuleEnabled(address module) view returns (bool)'];
    const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);
    const isModuleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    
    console.log(`Module enabled: ${isModuleEnabled ? '✅ YES' : '❌ NO'}`);
    
    if (!isModuleEnabled) {
      console.log('');
      console.log('💡 SOLUTION: Enable module');
      console.log('   Run one-click setup on deployment page');
    }
    console.log('');

    // SUMMARY
    console.log('━'.repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('━'.repeat(60));
    
    const checks = [
      { name: 'Venue Status', pass: !!venueStatus },
      { name: 'USDC Balance', pass: usdcBalance.gt(0) },
      { name: 'Token Registry', pass: !!tokenRegistry },
      { name: 'Module Enabled', pass: isModuleEnabled },
    ];
    
    checks.forEach(check => {
      console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
    });
    
    const allPass = checks.every(c => c.pass);
    
    console.log('');
    if (allPass) {
      console.log('🎉 ALL CHECKS PASSED! Trade should work.');
    } else {
      console.log('⚠️  FIX THE FAILED CHECKS ABOVE');
      console.log('');
      console.log('🔧 Quick Fix Command:');
      
      if (!tokenRegistry) {
        console.log('   1. Add token to registry:');
        console.log(`      npx tsx scripts/add-token-to-registry.ts ${TOKEN_SYMBOL}`);
      }
      
      if (!venueStatus) {
        console.log('   2. Add venue status:');
        console.log('      npx prisma studio → VenueStatus → Add');
      }
      
      if (!isModuleEnabled) {
        console.log('   3. Enable module via deployment page');
      }
      
      if (usdcBalance.eq(0)) {
        console.log('   4. Fund Safe with USDC');
      }
    }

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose().catch(console.error);

