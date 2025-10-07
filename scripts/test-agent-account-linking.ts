#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAgentAccountLinking() {
  console.log('🧪 Testing Agent Account Linking\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get the most recently created agent
    const recentAgent = await prisma.agent.findFirst({
      orderBy: { id: 'desc' },
      include: {
        agentAccounts: {
          include: {
            ctAccount: true,
          },
        },
      },
    });

    if (!recentAgent) {
      console.log('❌ No agents found in database');
      console.log('   Create an agent first to test the linking functionality.\n');
      return;
    }

    console.log('✅ Most Recent Agent:\n');
    console.log(`   ID: ${recentAgent.id}`);
    console.log(`   Name: ${recentAgent.name}`);
    console.log(`   Venue: ${recentAgent.venue}`);
    console.log(`   Status: ${recentAgent.status}`);
    console.log(`   Creator: ${recentAgent.creatorWallet}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔗 Linked CT Accounts:\n');

    if (recentAgent.agentAccounts.length === 0) {
      console.log('❌ NO CT ACCOUNTS LINKED');
      console.log('   This indicates the bug is still present!\n');
      console.log('   Expected: At least 1 CT account should be linked\n');
      console.log('   Actual: 0 accounts linked\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    console.log(`✅ Found ${recentAgent.agentAccounts.length} linked account(s):\n`);
    
    recentAgent.agentAccounts.forEach((aa, idx) => {
      console.log(`${idx + 1}. @${aa.ctAccount.xUsername}`);
      console.log(`   - Display Name: ${aa.ctAccount.displayName || 'N/A'}`);
      console.log(`   - Followers: ${aa.ctAccount.followersCount?.toLocaleString() || '0'}`);
      console.log(`   - Impact Factor: ${aa.ctAccount.impactFactor}`);
      console.log(`   - Linked At: ${aa.createdAt.toISOString()}\n`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ BUG FIX VERIFIED - CT accounts are being linked properly!\n');

    // Get all agents and their account counts
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 All Agents Summary:\n');

    const allAgents = await prisma.agent.findMany({
      include: {
        agentAccounts: {
          include: {
            ctAccount: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 10,
    });

    console.log(`Total agents: ${allAgents.length}\n`);

    allAgents.forEach((agent, idx) => {
      console.log(`${idx + 1}. ${agent.name} (${agent.venue})`);
      console.log(`   - Status: ${agent.status}`);
      console.log(`   - CT Accounts: ${agent.agentAccounts.length}`);
      if (agent.agentAccounts.length > 0) {
        const usernames = agent.agentAccounts
          .map(aa => `@${aa.ctAccount.xUsername}`)
          .join(', ');
        console.log(`   - Following: ${usernames}`);
      }
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testAgentAccountLinking();

