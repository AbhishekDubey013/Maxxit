import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

async function showOpenPositions() {
  try {
    console.log('📈 CHECKING OPEN ARB POSITIONS...\n');
    
    const openPositions = await prisma.position.findMany({
      where: {
        tokenSymbol: 'ARB',
        deployment: {
          safeWallet: '0x9A85f7140776477F1A79Ea29b7A32495636f5e20',
        },
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

    console.log(`📊 ${openPositions.length} OPEN POSITIONS:\n`);

    let totalARB = 0;

    openPositions.forEach((pos, idx) => {
      const qty = pos.qty || 0;
      totalARB += qty;
      
      const hoursOpen = Math.floor((Date.now() - new Date(pos.openedAt).getTime()) / (1000 * 60 * 60));
      
      console.log(`${idx + 1}. ${pos.deployment.agent.name}`);
      console.log(`   Qty: ${qty.toFixed(4)} ARB`);
      console.log(`   Entry Price: $${pos.entryPrice}`);
      console.log(`   Open for: ${hoursOpen} hours`);
      console.log(`   Position ID: ${pos.id}`);
      console.log('');
    });

    console.log('━'.repeat(50));
    console.log(`💰 Total ARB in open positions: ${totalARB.toFixed(4)}`);
    
    // Check actual Safe balance
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const arbToken = new ethers.Contract(
      '0x912CE59144191C1204E64559FE8253a0e49E6548',
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    
    const balance = await arbToken.balanceOf('0x9A85f7140776477F1A79Ea29b7A32495636f5e20');
    const actualARB = parseFloat(ethers.utils.formatEther(balance));
    
    console.log(`💰 Actual ARB in Safe: ${actualARB.toFixed(4)}`);
    console.log('');
    
    if (Math.abs(totalARB - actualARB) > 0.01) {
      console.log('⚠️  Mismatch detected! Some positions may have qty=0 or wrong amounts.');
    } else {
      console.log('✅ Database matches Safe balance!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showOpenPositions();

