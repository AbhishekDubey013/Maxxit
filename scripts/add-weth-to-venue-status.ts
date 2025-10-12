/**
 * Add WETH to venueStatus table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('📝 Adding WETH to venueStatus...\n');

    // Check if already exists
    const existing = await prisma.venueStatus.findUnique({
      where: {
        venue_tokenSymbol: {
          venue: 'SPOT',
          tokenSymbol: 'WETH',
        },
      },
    });

    if (existing) {
      console.log('ℹ️  WETH already exists in venueStatus');
      console.log(`   Available: ${existing.isAvailable}`);
      
      if (!existing.isAvailable) {
        // Update to make it available
        await prisma.venueStatus.update({
          where: {
            venue_tokenSymbol: {
              venue: 'SPOT',
              tokenSymbol: 'WETH',
            },
          },
          data: {
            isAvailable: true,
          },
        });
        console.log('✅ Updated WETH to available');
      }
    } else {
      // Create new entry
      await prisma.venueStatus.create({
        data: {
          venue: 'SPOT',
          tokenSymbol: 'WETH',
          isAvailable: true,
        },
      });
      console.log('✅ Added WETH to venueStatus');
    }

    console.log('\n🎉 WETH is now tradeable on SPOT!');
    console.log('   You can now trade WETH via Telegram or auto-trading\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

