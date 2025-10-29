/**
 * Find which deployment Telegram is using
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findTelegramDeployment() {
  console.log('🔍 Finding Telegram-Linked Deployment');
  console.log('━'.repeat(60));
  
  try {
    // Find all telegram users
    const telegramUsers = await prisma.telegramUser.findMany({
      include: {
        deployment: {
          include: {
            agent: true,
          }
        }
      }
    });

    console.log(`Found ${telegramUsers.length} Telegram user(s)`);
    console.log('');

    if (telegramUsers.length === 0) {
      console.log('❌ No Telegram users found');
      console.log('💡 Connect Telegram via "Connect Telegram" button');
      return;
    }

    telegramUsers.forEach((user, i) => {
      console.log(`${i + 1}. Telegram User ID: ${user.telegramUserId}`);
      console.log(`   Linked to agent: ${user.deployment.agent.name}`);
      console.log(`   Safe: ${user.deployment.safeWallet}`);
      console.log(`   Module: ${user.deployment.moduleAddress || 'NULL'}`);
      console.log(`   Last active: ${user.lastActiveAt}`);
      console.log('');
    });

    // Check for V2 modules
    const v2Users = telegramUsers.filter(u => 
      u.deployment.moduleAddress === '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46'
    );

    if (v2Users.length > 0) {
      console.log('━'.repeat(60));
      console.log('⚠️  FOUND V2 MODULE DEPLOYMENTS!');
      console.log('━'.repeat(60));
      
      v2Users.forEach(user => {
        console.log(`Telegram user ${user.telegramUserId} → ${user.deployment.agent.name}`);
        console.log(`Safe: ${user.deployment.safeWallet}`);
        console.log(`Module: ${user.deployment.moduleAddress}`);
        console.log('');
      });

      console.log('🔧 FIXING NOW...');
      
      for (const user of v2Users) {
        await prisma.agentDeployment.update({
          where: { id: user.deploymentId },
          data: {
            moduleAddress: '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb'
          }
        });
        console.log(`✅ Updated ${user.deployment.agent.name} to V3 module`);
      }
    } else {
      console.log('✅ All Telegram users using V3 module');
    }

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findTelegramDeployment().catch(console.error);

