/**
 * Check if there's WETH to close and if it's approved
 */

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

async function main() {
  console.log('🔍 Checking WETH position status...\n');
  
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const weth = new ethers.Contract(WETH, ERC20_ABI, provider);
  
  // Check WETH balance
  console.log('1️⃣  WETH Balance in Safe:');
  const wethBalance = await weth.balanceOf(SAFE);
  const wethFormatted = ethers.utils.formatEther(wethBalance);
  console.log(`   ${wethBalance.gt(0) ? '✅' : '❌'} ${wethFormatted} WETH\n`);
  
  // Check WETH approval
  console.log('2️⃣  WETH Approval to Uniswap:');
  const wethApproval = await weth.allowance(SAFE, UNISWAP_ROUTER);
  const isApproved = wethApproval.gt(0);
  console.log(`   ${isApproved ? '✅' : '❌'} ${isApproved ? 'Approved' : 'NOT approved'} (${ethers.utils.formatEther(wethApproval)} WETH)\n`);
  
  // Check database for open WETH positions
  console.log('3️⃣  Open WETH Positions in Database:');
  const positions = await prisma.position.findMany({
    where: {
      deployment: {
        safeWallet: {
          equals: SAFE,
          mode: 'insensitive',
        },
      },
      tokenSymbol: 'WETH',
      status: 'OPEN',
    },
    include: {
      deployment: {
        include: {
          agent: true,
        },
      },
    },
  });
  
  if (positions.length === 0) {
    console.log('   ❌ No open WETH positions found in database\n');
  } else {
    console.log(`   ✅ Found ${positions.length} open position(s):\n`);
    positions.forEach((p) => {
      console.log(`   • Agent: ${p.deployment.agent.name}`);
      console.log(`     Qty: ${p.qty} WETH`);
      console.log(`     Entry: $${p.entryPrice}`);
      console.log(`     Opened: ${p.openedAt}\n`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (wethBalance.eq(0)) {
    console.log('❌ ISSUE: No WETH in Safe to close!');
    console.log('   → Position was likely already closed or never opened\n');
  } else if (!isApproved) {
    console.log('❌ ISSUE: WETH not approved to Uniswap!');
    console.log('   → Need to approve WETH before closing\n');
  } else {
    console.log('✅ WETH can be closed!\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

