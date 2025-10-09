#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding WETH to SPOT venue...\n');

  // Check what's there
  const existing = await prisma.venueStatus.findMany({
    where: { venue: 'SPOT' },
  });

  console.log('Current SPOT venue tokens:', existing.length);
  existing.forEach(s => {
    console.log('  -', s.tokenSymbol, '(enabled:', s.isEnabled + ')');
  });
  console.log('');

  // Add WETH
  await prisma.venueStatus.upsert({
    where: {
      venue_tokenSymbol: {
        venue: 'SPOT',
        tokenSymbol: 'WETH',
      },
    },
    update: {},
    create: {
      venue: 'SPOT',
      tokenSymbol: 'WETH',
    },
  });

  console.log('✅ WETH added/updated in SPOT venue\n');

  // Verify
  const weth = await prisma.venueStatus.findUnique({
    where: {
      venue_tokenSymbol: {
        venue: 'SPOT',
        tokenSymbol: 'WETH',
      },
    },
  });

  console.log('Verified:');
  console.log('  Venue:', weth?.venue);
  console.log('  Token:', weth?.tokenSymbol);
  console.log('  Enabled:', weth?.isEnabled);
  console.log('');

  await prisma.$disconnect();
}

main();

