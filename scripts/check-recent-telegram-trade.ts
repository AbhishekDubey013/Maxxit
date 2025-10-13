/**
 * Check recent Telegram trade to see what went wrong
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking recent Telegram trades...\n');
  
  const trades = await prisma.telegramTrade.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      deployment: {
        include: {
          agent: true,
        },
      },
    },
  });
  
  if (trades.length === 0) {
    console.log('No Telegram trades found.\n');
    return;
  }
  
  console.log(`Found ${trades.length} recent trade(s):\n`);
  
  trades.forEach((trade, i) => {
    console.log(`${i + 1}. Trade ID: ${trade.id}`);
    console.log(`   Command: "${trade.command}"`);
    console.log(`   Parsed Intent:`, trade.parsedIntent);
    console.log(`   Status: ${trade.status}`);
    console.log(`   Agent: ${trade.deployment?.agent?.name || 'N/A'}`);
    console.log(`   Created: ${trade.createdAt}`);
    if (trade.errorMessage) {
      console.log(`   Error: ${trade.errorMessage.substring(0, 200)}...`);
    }
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

