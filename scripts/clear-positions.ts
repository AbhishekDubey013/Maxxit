/**
 * Clear all positions from database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearPositions() {
  console.log('🗑️  Deleting all positions...');

  try {
    const deleted = await prisma.position.deleteMany({});
    console.log(`✅ Deleted ${deleted.count} positions`);
    
    const remaining = await prisma.position.count();
    console.log(`📊 Remaining positions: ${remaining}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearPositions();

