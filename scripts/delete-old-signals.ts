import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteSignals() {
  const result = await prisma.signals.deleteMany({
    where: { token_symbol: 'ARB' }
  });
  console.log(`✅ Deleted ${result.count} ARB signals`);
  await prisma.$disconnect();
}

deleteSignals();

