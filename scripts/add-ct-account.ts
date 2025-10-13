/**
 * Add CT account to database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = 'Abhishe42402615';
  
  console.log(`🔍 Checking if @${username} exists...\n`);
  
  const existing = await prisma.ctAccount.findUnique({
    where: { xUsername: username },
  });
  
  if (existing) {
    console.log(`✅ @${username} already exists!`);
    console.log(`   ID: ${existing.id}`);
    console.log(`   Impact Factor: ${existing.impactFactor}`);
    console.log(`   Last Seen: ${existing.lastSeenAt || 'Never'}\n`);
    return;
  }
  
  console.log(`📝 Adding @${username}...\n`);
  
  const account = await prisma.ctAccount.create({
    data: {
      xUsername: username,
      displayName: username,
      impactFactor: 1.0,
    },
  });
  
  console.log(`✅ Successfully added @${username}!`);
  console.log(`   ID: ${account.id}`);
  console.log(`   Impact Factor: ${account.impactFactor}\n`);
  
  // Show all CT accounts
  const allAccounts = await prisma.ctAccount.findMany({
    orderBy: { xUsername: 'asc' },
  });
  
  console.log('📋 All CT accounts:');
  allAccounts.forEach((acc) => {
    console.log(`   • @${acc.xUsername} (impact: ${acc.impactFactor})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

