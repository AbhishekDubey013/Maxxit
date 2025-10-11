import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllARBPositions() {
  try {
    console.log('🔍 Checking all ARB positions for Safe 0x9A85f7140776477F1A79Ea29b7A32495636f5e20\n');

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
        signal: true,
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    console.log(`📊 Found ${positions.length} ARB positions:\n`);

    let totalOpenQty = 0;
    let totalClosedQty = 0;

    positions.forEach((pos, idx) => {
      const status = pos.closedAt ? '❌ CLOSED' : '✅ OPEN';
      const qty = pos.qty || 0;
      
      console.log(`${idx + 1}. ${status}`);
      console.log(`   Position ID: ${pos.id}`);
      console.log(`   Agent: ${pos.deployment.agent.name}`);
      console.log(`   Opened: ${pos.openedAt}`);
      console.log(`   Closed: ${pos.closedAt || 'Still Open'}`);
      console.log(`   Quantity: ${qty} ARB`);
      console.log(`   Entry Price: $${pos.entryPrice}`);
      console.log(`   Entry TX: ${pos.entryTxHash || 'N/A'}`);
      console.log(`   Exit TX: ${pos.exitTxHash || 'N/A'}`);
      console.log('');

      if (pos.closedAt) {
        totalClosedQty += qty;
      } else {
        totalOpenQty += qty;
      }
    });

    console.log('📈 SUMMARY:');
    console.log(`   Open Positions: ${positions.filter(p => !p.closedAt).length}`);
    console.log(`   Total Open ARB: ${totalOpenQty.toFixed(4)}`);
    console.log(`   Closed Positions: ${positions.filter(p => p.closedAt).length}`);
    console.log(`   Total Closed ARB: ${totalClosedQty.toFixed(4)}`);
    console.log('');
    console.log('💰 Expected ARB balance in Safe based on DB: ~' + totalOpenQty.toFixed(4));
    console.log('💰 Actual ARB balance in Safe: 21.4064');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllARBPositions();

