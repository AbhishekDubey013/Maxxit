/**
 * Script to add OSTIUM to the venue_t enum in the database
 * Safe to run multiple times (idempotent)
 * 
 * Usage: node scripts/add-ostium-enum.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addOstiumEnum() {
  console.log('🔄 Adding OSTIUM to venue_t enum...');
  console.log('');

  try {
    // Check if OSTIUM already exists
    console.log('1️⃣  Checking if OSTIUM already exists...');
    const result = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'OSTIUM' 
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'venue_t'
      )
    `);

    if (result.length > 0) {
      console.log('✅ OSTIUM already exists in venue_t enum');
      console.log('');
      console.log('🎉 Database is ready! You can now create Ostium agents.');
      return;
    }

    // Add OSTIUM to the enum
    console.log('2️⃣  Adding OSTIUM to venue_t enum...');
    await prisma.$executeRawUnsafe(`
      ALTER TYPE venue_t ADD VALUE 'OSTIUM'
    `);

    console.log('✅ Successfully added OSTIUM to venue_t enum');
    console.log('');
    console.log('🎉 Database updated successfully!');
    console.log('   You can now create agents with venue="OSTIUM"');
  } catch (error) {
    console.error('');
    console.error('❌ Error adding OSTIUM to enum:');
    console.error('   ' + error.message);
    console.error('');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addOstiumEnum()
  .then(() => {
    console.log('');
    console.log('Done! 🚀');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exit(1);
  });

