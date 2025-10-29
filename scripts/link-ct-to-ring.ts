import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RING_AGENT_ID = 'e103e0e9-afd1-443a-9ad9-afbb64f57ac5';
const CT_ACCOUNT_USERNAME = 'Abhishe42402615';

async function linkAccount() {
  try {
    console.log('🔗 Linking CT account to Ring agent...\n');

    // Find the CT account
    const ctAccount = await prisma.ctAccount.findUnique({
      where: { xUsername: CT_ACCOUNT_USERNAME },
    });

    if (!ctAccount) {
      console.error(`❌ CT account not found: ${CT_ACCOUNT_USERNAME}`);
      return;
    }

    console.log(`✅ Found CT account: ${ctAccount.xUsername} (${ctAccount.id})`);

    // Check if already linked
    const existingLink = await prisma.agentAccount.findUnique({
      where: {
        agentId_ctAccountId: {
          agentId: RING_AGENT_ID,
          ctAccountId: ctAccount.id,
        },
      },
    });

    if (existingLink) {
      console.log(`ℹ️  Account already linked to Ring agent`);
      return;
    }

    // Create the link
    const link = await prisma.agentAccount.create({
      data: {
        agentId: RING_AGENT_ID,
        ctAccountId: ctAccount.id,
      },
    });

    console.log(`\n✅ Successfully linked!`);
    console.log(`   Agent ID: ${link.agentId}`);
    console.log(`   CT Account ID: ${link.ctAccountId}`);
    console.log(`   Created at: ${link.createdAt}`);

    // Verify the link
    const allLinkedAccounts = await prisma.agentAccount.findMany({
      where: { agentId: RING_AGENT_ID },
      include: { ctAccount: true },
    });

    console.log(`\n📋 All CT accounts linked to Ring agent (${allLinkedAccounts.length}):`);
    allLinkedAccounts.forEach((link, i) => {
      console.log(`   ${i + 1}. @${link.ctAccount.xUsername} (Impact: ${link.ctAccount.impactFactor})`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

linkAccount();

