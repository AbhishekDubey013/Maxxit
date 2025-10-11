#!/usr/bin/env tsx
/**
 * Check if a Telegram link code exists
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLinkCode() {
  const code = 'I47PQN';
  
  console.log('🔍 CHECKING LINK CODE:', code);
  console.log('═'.repeat(70));
  console.log('');
  
  try {
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { linkCode: code },
      include: {
        deployment: {
          include: {
            agent: true
          }
        }
      }
    });
    
    if (telegramUser) {
      console.log('✅ Link code found!');
      console.log('');
      console.log('Details:');
      console.log('   User ID:', telegramUser.id);
      console.log('   Telegram User ID:', telegramUser.telegramUserId || 'Not linked yet');
      console.log('   Deployment:', telegramUser.deployment.id);
      console.log('   Agent:', telegramUser.deployment.agent.name);
      console.log('   Safe:', telegramUser.deployment.safeWallet);
      console.log('   Linked At:', telegramUser.linkedAt);
      console.log('   Active:', telegramUser.isActive);
    } else {
      console.log('❌ Link code NOT found in database!');
      console.log('');
      console.log('This code needs to be generated first.');
      console.log('Generate via: POST /api/telegram/generate-link');
      console.log('Or through the UI: My Deployments → Connect Telegram');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLinkCode();

