import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

async function checkWETHPositions() {
  try {
    console.log('🔍 Checking WETH positions...\n');
    
    const positions = await prisma.position.findMany({
      where: {
        tokenSymbol: 'WETH',
        deployment: {
          safeWallet: '0x9A85f7140776477F1A79Ea29b7A32495636f5e20',
        },
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

    const openPositions = positions.filter(p => !p.closedAt);
    const closedPositions = positions.filter(p => p.closedAt);

    console.log('📊 WETH POSITION SUMMARY:');
    console.log('   Total Positions:', positions.length);
    console.log('   ✅ Open:', openPositions.length);
    console.log('   ❌ Closed:', closedPositions.length);
    console.log('');

    if (positions.length === 0) {
      console.log('📭 No WETH positions found.');
      console.log('   Only ARB positions have been opened so far.');
      console.log('');
      
      // Check if there's WETH balance in Safe anyway
      const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
      const wethToken = new ethers.Contract(
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      
      const balance = await wethToken.balanceOf('0x9A85f7140776477F1A79Ea29b7A32495636f5e20');
      const actualWETH = parseFloat(ethers.utils.formatEther(balance));
      
      console.log('💰 WETH in Safe:', actualWETH.toFixed(6), 'WETH');
      
      if (actualWETH > 0.0001) {
        console.log('⚠️  Safe has WETH but no positions tracked in DB!');
      }
    } else {
      if (openPositions.length > 0) {
        console.log('📈 OPEN WETH POSITIONS:');
        openPositions.forEach((pos, idx) => {
          console.log(`${idx + 1}. ${pos.deployment.agent.name}`);
          console.log(`   Qty: ${pos.qty || 0} WETH`);
          console.log(`   Entry Price: $${pos.entryPrice}`);
          console.log(`   Opened: ${pos.openedAt}`);
          console.log('');
        });
      }

      if (closedPositions.length > 0) {
        console.log('❌ CLOSED WETH POSITIONS:');
        closedPositions.forEach((pos, idx) => {
          console.log(`${idx + 1}. ${pos.deployment.agent.name}`);
          console.log(`   Qty: ${pos.qty || 0} WETH`);
          console.log(`   Closed: ${pos.closedAt}`);
          console.log('');
        });
      }
      
      // Check actual balance
      const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
      const wethToken = new ethers.Contract(
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      
      const balance = await wethToken.balanceOf('0x9A85f7140776477F1A79Ea29b7A32495636f5e20');
      const actualWETH = parseFloat(ethers.utils.formatEther(balance));
      
      console.log('💰 Actual WETH in Safe:', actualWETH.toFixed(6), 'WETH');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWETHPositions();

