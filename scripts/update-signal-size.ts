#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating signal with proper baseSize...\n');

  await prisma.signal.update({
    where: { id: '4fb19953-338d-40b2-a4ef-4fed0c952028' },
    data: {
      sizeModel: {
        tier: 'SMALL',
        percentage: 10,
        confidence: 75,
        baseSize: 1.5, // 1.5 USDC
      },
    },
  });

  console.log('✅ Signal updated with baseSize: 1.5 USDC\n');

  // Verify
  const signal = await prisma.signal.findUnique({
    where: { id: '4fb19953-338d-40b2-a4ef-4fed0c952028' },
  });

  console.log('Verified sizeModel:', signal?.sizeModel);
  console.log('');

  await prisma.$disconnect();
}

main();

