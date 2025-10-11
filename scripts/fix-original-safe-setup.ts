#!/usr/bin/env tsx
/**
 * Complete the setup for Original Safe
 * Steps 2 & 3: Approve USDC + Initialize Capital
 */

import { createSafeModuleService } from '../lib/safe-module-service';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ORIGINAL_SAFE = '0xE9ECBddB6308036f5470826A1fdfc734cFE866b1';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

async function fixOriginalSafe() {
  try {
    console.log('🔧 COMPLETING SETUP FOR ORIGINAL SAFE');
    console.log('═'.repeat(70));
    console.log('Safe:', ORIGINAL_SAFE);
    console.log('Module:', MODULE_ADDRESS);
    console.log('');
    
    if (!process.env.EXECUTOR_PRIVATE_KEY) {
      throw new Error('EXECUTOR_PRIVATE_KEY not found in .env');
    }
    
    const moduleService = createSafeModuleService(
      MODULE_ADDRESS,
      42161,
      process.env.EXECUTOR_PRIVATE_KEY
    );
    
    // STEP 2: Approve USDC to Uniswap Router
    console.log('📋 STEP 2/3: Approve USDC to Uniswap Router');
    console.log('─'.repeat(70));
    
    const approvalResult = await moduleService.approveTokenForDex(
      ORIGINAL_SAFE,
      USDC_ADDRESS,
      UNISWAP_ROUTER
    );
    
    if (approvalResult.success) {
      console.log('✅ USDC approved to Uniswap Router');
      console.log('   TX Hash:', approvalResult.txHash);
      console.log('   View:', `https://arbiscan.io/tx/${approvalResult.txHash}`);
    } else {
      console.log('❌ Approval failed:', approvalResult.error);
      console.log('   (Might already be approved - continuing...)');
    }
    console.log('');
    
    // Wait for approval to confirm
    if (approvalResult.success) {
      console.log('⏳ Waiting 5 seconds for approval to confirm...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // STEP 3: Initialize Capital
    console.log('📋 STEP 3/3: Initialize Capital Tracking');
    console.log('─'.repeat(70));
    
    // Check current status
    try {
      const stats = await moduleService.getSafeStats(ORIGINAL_SAFE);
      
      if (stats.initialized) {
        console.log('✅ Capital already initialized!');
        console.log('   Initial Capital:', stats.initialCapital, 'USDC');
        console.log('   Current Balance:', stats.currentBalance, 'USDC');
      } else {
        console.log('⏳ Initializing capital...');
        console.log('   Current Balance:', stats.currentBalance, 'USDC');
        
        const initResult = await moduleService.initializeCapital(ORIGINAL_SAFE);
        
        if (initResult.success) {
          console.log('✅ Capital initialized successfully!');
          console.log('   TX Hash:', initResult.txHash);
          console.log('   View:', `https://arbiscan.io/tx/${initResult.txHash}`);
          
          // Wait and verify
          console.log('⏳ Waiting 5 seconds to verify...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const statsAfter = await moduleService.getSafeStats(ORIGINAL_SAFE);
          console.log('   Initial Capital:', statsAfter.initialCapital, 'USDC');
        } else {
          console.log('❌ Initialization failed:', initResult.error);
        }
      }
    } catch (error: any) {
      console.log('❌ Error with capital initialization:', error.message);
    }
    
    console.log('');
    console.log('═'.repeat(70));
    console.log('📊 FINAL VERIFICATION');
    console.log('═'.repeat(70));
    
    // Final check
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    const erc20Abi = ['function allowance(address owner, address spender) view returns (uint256)'];
    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
    const approval = await usdcContract.allowance(ORIGINAL_SAFE, UNISWAP_ROUTER);
    
    console.log('USDC → Router Approval:', ethers.utils.formatUnits(approval, 6), 'USDC');
    
    try {
      const finalStats = await moduleService.getSafeStats(ORIGINAL_SAFE);
      console.log('Capital Initialized:', finalStats.initialized ? '✅ YES' : '❌ NO');
      if (finalStats.initialized) {
        console.log('Initial Capital:', finalStats.initialCapital, 'USDC');
      }
    } catch (e: any) {
      console.log('Capital Status:', '⚠️  Cannot verify -', e.message);
    }
    
    console.log('');
    console.log('🎉 ORIGINAL SAFE SETUP COMPLETE!');
    console.log('   The Safe should now be able to trade successfully.');
    
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

fixOriginalSafe();

