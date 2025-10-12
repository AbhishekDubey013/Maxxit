import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkARBPosition() {
  console.log('\n📊 Checking ARB Position\n');
  console.log('═'.repeat(60));

  try {
    // Find the ARB position (open = closedAt is null)
    const position = await prisma.position.findFirst({
      where: {
        tokenSymbol: {
          contains: 'ARB_MANUAL',
        },
        closedAt: null, // Open positions have null closedAt
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
      console.log('❌ No open ARB position found');
      
      // Check if it's already closed
      const closedPosition = await prisma.position.findFirst({
        where: {
          tokenSymbol: {
            contains: 'ARB_MANUAL',
          },
          closedAt: {
            not: null,
          },
        },
        orderBy: {
          closedAt: 'desc',
        },
      });
      
      if (closedPosition) {
        console.log('\n✅ Found closed ARB position:');
        console.log(`   Position ID: ${closedPosition.id}`);
        console.log(`   Closed At: ${closedPosition.closedAt}`);
        console.log(`   PnL: ${closedPosition.pnl} USDC`);
      }
      
      return;
    }

    console.log('✅ Open ARB Position Found:\n');
    console.log(`   Position ID: ${position.id}`);
    console.log(`   Token: ${position.tokenSymbol}`);
    console.log(`   Quantity: ${position.qty} ARB`);
    console.log(`   Entry Price: $${position.entryPrice}`);
    console.log(`   Opened At: ${position.openedAt}`);
    console.log(`\n   Agent: ${position.deployment.agent.name}`);
    console.log(`   Safe: ${position.deployment.safeWallet}`);

    console.log('\n═'.repeat(60));
    console.log('\n✅ Ready to close via Telegram!');
    console.log('\n💡 Send to your Telegram bot:');
    console.log('   Close ARB\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkARBPosition();

