/**
 * Add X/Twitter account to database for tweet ingestion
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addXAccount() {
  const username = 'Abhishe42402615';
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  📱 Adding X Account: @${username}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    // Check if account already exists
    const existing = await prisma.ctAccount.findUnique({
      where: { xUsername: username },
    });

    if (existing) {
      console.log(`⚠️  Account @${username} already exists in database`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   Display Name: ${existing.displayName}`);
      console.log(`   Impact Factor: ${existing.impactFactor}`);
      return;
    }

    // Create new CT account
    const account = await prisma.ctAccount.create({
      data: {
        xUsername: username,
        displayName: 'Abhishe42402615',
        impactFactor: 1.0,
      },
    });

    console.log(`✅ Successfully added X account!\n`);
    console.log(`   ID: ${account.id}`);
    console.log(`   Username: @${account.xUsername}`);
    console.log(`   Display Name: ${account.displayName}`);
    console.log(`   Impact Factor: ${account.impactFactor}\n`);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  🎯 Next Steps`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`1. Tweet ingestion worker will now fetch from @${username}`);
    console.log(`2. Link this account to an agent to start trading`);
    console.log(`3. Tweets will be classified automatically\n`);

  } catch (error: any) {
    console.error(`❌ Error adding X account:`, error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
addXAccount()
  .then(() => {
    console.log(`✅ Complete!\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

