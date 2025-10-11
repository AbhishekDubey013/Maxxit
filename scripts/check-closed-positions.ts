import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkClosedPositions() {
  try {
    console.log('🔍 Checking position status...\n');
    
    const positions = await prisma.position.findMany({
      where: {
        tokenSymbol: 'ARB',
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

    console.log('📊 POSITION SUMMARY:');
    console.log('   Total Positions:', positions.length);
    console.log('   ✅ Open:', openPositions.length);
    console.log('   ❌ Closed:', closedPositions.length);
    console.log('');

    if (closedPositions.length > 0) {
      console.log('🎉 CLOSED POSITIONS:');
      closedPositions.forEach((pos, idx) => {
        const pnl = pos.closedPnl || 0;
        const pnlEmoji = pnl > 0 ? '📈' : pnl < 0 ? '📉' : '➖';
        console.log(`${idx + 1}. ${pos.deployment.agent.name} - ${pos.tokenSymbol}`);
        console.log(`   Qty: ${pos.qty} ARB`);
        console.log(`   Entry: $${pos.entryPrice} | Exit: $${pos.exitPrice || 'N/A'}`);
        console.log(`   ${pnlEmoji} P&L: $${pnl.toFixed(2)}`);
        console.log(`   Closed: ${pos.closedAt}`);
        console.log(`   Exit TX: ${pos.exitTxHash || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⏳ No positions closed yet.');
      console.log('   Workers are monitoring for exit conditions...');
      console.log('');
      
      // Show latest open positions
      console.log('📈 LATEST OPEN POSITIONS (Top 5):');
      openPositions.slice(0, 5).forEach((pos, idx) => {
        console.log(`${idx + 1}. ${pos.deployment.agent.name} - ${pos.qty || 0} ARB`);
        console.log(`   Entry Price: $${pos.entryPrice}`);
        console.log(`   Opened: ${pos.openedAt}`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClosedPositions();

