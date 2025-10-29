/**
 * Check Safe Setup for Telegram Trading
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
const RPC_URL = 'https://arb1.arbitrum.io/rpc';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const SAFE_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function isModuleEnabled(address module) view returns (bool)',
  'function nonce() view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

async function checkSafe() {
  console.log('🔍 Checking Safe Setup for Telegram Trading');
  console.log('━'.repeat(60));
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log('━'.repeat(60));
  console.log('');

  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    // Check if Safe exists
    const code = await provider.getCode(SAFE_ADDRESS);
    if (code === '0x') {
      console.log('❌ ERROR: No contract found at this address!');
      console.log('This Safe does not exist or is on a different network.');
      return;
    }
    console.log('✅ Safe contract exists');
    console.log('');

    const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);

    // 1. Check Safe details
    console.log('1️⃣  SAFE DETAILS:');
    console.log('━'.repeat(60));
    const owners = await safe.getOwners();
    console.log(`Owners (${owners.length}):`);
    owners.forEach((owner, i) => {
      console.log(`   ${i + 1}. ${owner}`);
    });
    const threshold = await safe.getThreshold();
    console.log(`Threshold: ${threshold}/${owners.length}`);
    const nonce = await safe.nonce();
    console.log(`Transactions executed: ${nonce}`);
    console.log('');

    // 2. Check module status
    console.log('2️⃣  MODULE STATUS:');
    console.log('━'.repeat(60));
    const isModuleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    console.log(`Module: ${MODULE_ADDRESS}`);
    console.log(`Status: ${isModuleEnabled ? '✅ ENABLED' : '❌ NOT ENABLED'}`);
    
    if (!isModuleEnabled) {
      console.log('');
      console.log('⚠️  MODULE NOT ENABLED!');
      console.log('💡 FIX: Use "Enable Module (One-Click)" button in My Deployments');
    }
    console.log('');

    // 3. Check USDC balance
    console.log('3️⃣  USDC BALANCE:');
    console.log('━'.repeat(60));
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdcBalance = await usdc.balanceOf(SAFE_ADDRESS);
    const formattedBalance = ethers.utils.formatUnits(usdcBalance, 6);
    console.log(`Balance: ${formattedBalance} USDC`);
    
    if (usdcBalance.eq(0)) {
      console.log('');
      console.log('⚠️  NO USDC IN SAFE!');
      console.log('💡 FIX: Send USDC to this Safe address');
    } else {
      console.log('✅ Safe has USDC for trading');
    }
    console.log('');

    // 4. Check USDC approval
    console.log('4️⃣  USDC APPROVAL:');
    console.log('━'.repeat(60));
    const allowance = await usdc.allowance(SAFE_ADDRESS, UNISWAP_V3_ROUTER);
    const formattedAllowance = ethers.utils.formatUnits(allowance, 6);
    console.log(`Allowance: ${formattedAllowance} USDC`);
    
    const isApproved = allowance.gt(ethers.utils.parseUnits('1000000', 6));
    console.log(`Status: ${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}`);
    
    if (!isApproved) {
      console.log('');
      console.log('⚠️  USDC NOT APPROVED FOR UNISWAP!');
      console.log('💡 FIX: Use "Enable Module (One-Click)" button (includes approval)');
    }
    console.log('');

    // 5. Check if linked to Telegram
    console.log('5️⃣  TELEGRAM LINKAGE:');
    console.log('━'.repeat(60));
    const deployment = await prisma.agentDeployment.findFirst({
      where: { safeWallet: SAFE_ADDRESS },
      include: {
        agent: true,
        telegramUsers: true,
      },
    });

    if (!deployment) {
      console.log('❌ No deployment found for this Safe');
      console.log('');
      console.log('⚠️  SAFE NOT LINKED TO ANY AGENT!');
      console.log('💡 FIX: Deploy an agent with this Safe address');
    } else {
      console.log(`✅ Linked to agent: ${deployment.agent.name}`);
      console.log(`   Agent ID: ${deployment.agentId}`);
      console.log(`   Venue: ${deployment.agent.venue}`);
      
      if (deployment.telegramUsers.length > 0) {
        console.log(`✅ Telegram connected (${deployment.telegramUsers.length} user(s))`);
      } else {
        console.log('⚠️  Telegram not connected yet');
        console.log('💡 FIX: Click "Connect Telegram" in My Deployments');
      }
    }
    console.log('');

    // SUMMARY
    console.log('━'.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('━'.repeat(60));
    
    const checks = [
      { name: 'Safe exists', pass: true },
      { name: 'Module enabled', pass: isModuleEnabled },
      { name: 'Has USDC', pass: usdcBalance.gt(0) },
      { name: 'USDC approved', pass: isApproved },
      { name: 'Linked to agent', pass: !!deployment },
    ];
    
    checks.forEach(check => {
      console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
    });
    
    const allPass = checks.every(c => c.pass);
    
    console.log('');
    if (allPass) {
      console.log('🎉 ALL CHECKS PASSED!');
      console.log('✅ Ready for Telegram trading!');
    } else {
      console.log('⚠️  SOME CHECKS FAILED');
      console.log('');
      console.log('🔧 FIXES NEEDED:');
      
      if (!isModuleEnabled || !isApproved) {
        console.log('   1. Go to My Deployments page');
        console.log('   2. Find this Safe deployment');
        console.log('   3. Click "Enable Module (One-Click)"');
        console.log('   4. Sign the transaction');
      }
      
      if (usdcBalance.eq(0)) {
        console.log(`   5. Send USDC to: ${SAFE_ADDRESS}`);
      }
      
      if (!deployment) {
        console.log('   6. Create agent deployment with this Safe');
      } else if (deployment.telegramUsers.length === 0) {
        console.log('   7. Click "Connect Telegram" and link bot');
      }
    }
    
    console.log('');
    console.log('🔗 LINKS:');
    console.log(`   Safe UI: https://app.safe.global/home?safe=arb1:${SAFE_ADDRESS}`);
    console.log(`   Arbiscan: https://arbiscan.io/address/${SAFE_ADDRESS}`);

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSafe().catch(console.error);

