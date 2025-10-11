#!/usr/bin/env tsx
/**
 * Check why WETH position failed to close
 */

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFailedClose() {
  try {
    console.log('🔍 CHECKING WETH POSITION CLOSE FAILURE');
    console.log('═'.repeat(70));
    console.log('');
    
    // Find the WETH position
    const position = await prisma.position.findFirst({
      where: {
        tokenSymbol: 'WETH',
        source: 'telegram',
        closedAt: null,
      },
      include: {
        deployment: {
          include: {
            agent: true,
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });
    
    if (!position) {
      console.log('✅ No open WETH positions found - it might have closed!');
      
      // Check recently closed
      const recentlyClosed = await prisma.position.findFirst({
        where: {
          tokenSymbol: 'WETH',
          source: 'telegram',
          closedAt: { not: null },
        },
        orderBy: {
          closedAt: 'desc',
        },
      });
      
      if (recentlyClosed) {
        console.log('');
        console.log('Found recently closed position:');
        console.log('  Closed at:', recentlyClosed.closedAt);
        console.log('  Exit TX:', recentlyClosed.exitTxHash);
        console.log('  P&L:', recentlyClosed.pnl?.toString() || 'Not calculated');
      }
      
      await prisma.$disconnect();
      return;
    }
    
    console.log('📊 Position Details:');
    console.log('  ID:', position.id);
    console.log('  Token:', position.tokenSymbol);
    console.log('  Qty:', position.qty.toString());
    console.log('  Entry Price:', position.entryPrice.toString());
    console.log('  Entry TX:', position.entryTxHash);
    console.log('  Opened:', position.openedAt);
    console.log('  Safe:', position.deployment.safeWallet);
    console.log('');
    
    // Check if WETH exists in Safe
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
    
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, provider);
    const wethBalance = await wethContract.balanceOf(position.deployment.safeWallet);
    
    console.log('💰 Safe WETH Balance:');
    console.log('  Balance:', ethers.utils.formatEther(wethBalance), 'WETH');
    console.log('  Position Qty:', position.qty.toString(), 'WETH');
    console.log('');
    
    if (wethBalance.eq(0)) {
      console.log('❌ PROBLEM: No WETH in Safe!');
      console.log('   Either:');
      console.log('   1. Position was manually closed outside system');
      console.log('   2. Tokens were manually swapped');
      console.log('   3. Trade never actually executed');
      console.log('');
      console.log('   Check entry TX on Arbiscan:');
      console.log(`   https://arbiscan.io/tx/${position.entryTxHash}`);
    } else {
      const expectedWETH = ethers.utils.parseUnits(position.qty.toString(), 18);
      
      if (wethBalance.lt(expectedWETH)) {
        console.log('⚠️  WETH balance less than position qty');
        console.log('   This might cause issues with closing');
      } else {
        console.log('✅ WETH balance sufficient for closing');
      }
    }
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('🔧 TO CLOSE MANUALLY:');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Option 1: Via Telegram');
    console.log('  Send: "Close my WETH"');
    console.log('');
    console.log('Option 2: Via Script');
    console.log(`  npx tsx scripts/test-close-position.ts ${position.id}`);
    console.log('');
    console.log('Option 3: Check executor gas');
    console.log('  Executor might be out of gas again');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFailedClose();

