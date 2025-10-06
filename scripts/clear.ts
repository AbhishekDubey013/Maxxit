import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Clearing database...\n');
  
  // Delete in order respecting foreign keys
  await prisma.impactFactorHistory.deleteMany();
  await prisma.pnlSnapshot.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.position.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.agentDeployment.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.ctPost.deleteMany();
  await prisma.ctAccount.deleteMany();
  await prisma.marketIndicators6h.deleteMany();
  await prisma.venueStatus.deleteMany();
  await prisma.tokenRegistry.deleteMany();
  await prisma.auditLog.deleteMany();
  
  console.log('✓ Database cleared!\n');
}

clearDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
