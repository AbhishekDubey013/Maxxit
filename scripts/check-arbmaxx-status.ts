#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkArbMaxx() {
  const agent = await prisma.agent.findFirst({
    where: { name: 'ArbMaxx' },
    include: {
      agentAccounts: {
        include: {
          ctAccount: true,
        },
      },
      deployments: true,
      signals: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!agent) {
    console.log('❌ Agent not found');
    await prisma.$disconnect();
    return;
  }

  console.log('🚀 ArbMaxx Agent - Complete Readiness Report\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 AGENT DETAILS:\n');
  console.log(`   Name: ${agent.name}`);
  console.log(`   ID: ${agent.id}`);
  console.log(`   Venue: ${agent.venue}`);
  console.log(`   Status: ${agent.status}`);
  console.log(`   Creator: ${agent.creatorWallet}`);
  console.log(`   Profit Receiver: ${agent.profitReceiverAddress}`);
  
  console.log('\n   Strategy Weights:');
  const indicators = ['Tweet', 'RSI', 'MACD', 'BB', 'Vol', 'MA', 'Mom', 'Volat'];
  agent.weights.forEach((w, i) => {
    console.log(`      ${indicators[i]}: ${w}%`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🐦 CT ACCOUNTS:\n');
  console.log(`   Total: ${agent.agentAccounts.length}`);
  agent.agentAccounts.forEach((aa, i) => {
    console.log(`\n   ${i + 1}. @${aa.ctAccount.xUsername}`);
    console.log(`      Display: ${aa.ctAccount.displayName || 'N/A'}`);
    console.log(`      Followers: ${aa.ctAccount.followersCount?.toLocaleString() || '0'}`);
    console.log(`      Impact: ${aa.ctAccount.impactFactor}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💼 DEPLOYMENTS:\n');
  console.log(`   Total: ${agent.deployments.length}`);
  agent.deployments.forEach((d, i) => {
    console.log(`\n   ${i + 1}. Deployment ${d.id.substring(0, 8)}...`);
    console.log(`      Safe Wallet: ${d.safeWallet}`);
    console.log(`      User Wallet: ${d.userWallet}`);
    console.log(`      Module Enabled: ${d.moduleEnabled ? '✅ YES' : '❌ NO'}`);
    console.log(`      Status: ${d.status}`);
    console.log(`      Subscription: ${d.subActive ? '✅ Active' : '❌ Inactive'}`);
    console.log(`      Started: ${d.subStartedAt.toISOString()}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 SIGNALS:\n');
  console.log(`   Total Signals: ${agent.signals.length}`);
  if (agent.signals.length > 0) {
    agent.signals.forEach((s, i) => {
      console.log(`\n   ${i + 1}. ${s.tokenSymbol} - ${s.side}`);
      console.log(`      Venue: ${s.venue}`);
      console.log(`      Created: ${s.createdAt.toISOString()}`);
    });
  } else {
    console.log('   No signals generated yet');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ READINESS CHECKLIST:\n');
  
  const checks = [
    { name: 'Agent Created', pass: true },
    { name: 'Agent Status ACTIVE', pass: agent.status === 'ACTIVE' },
    { name: 'CT Accounts Linked', pass: agent.agentAccounts.length > 0 },
    { name: 'Deployed to Safe', pass: agent.deployments.length > 0 },
    { name: 'Safe Module Enabled', pass: agent.deployments.some(d => d.moduleEnabled) },
    { name: 'Subscription Active', pass: agent.deployments.some(d => d.subActive) },
  ];

  checks.forEach(check => {
    console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  if (allPassed) {
    console.log('🎉 READY FOR TRADING! 🎉\n');
    console.log('Next Steps:');
    console.log('   1. Agent will monitor tweets from CT accounts');
    console.log('   2. Signals will be generated based on tweets + indicators');
    console.log('   3. Trades will execute automatically via Safe module');
    console.log('   4. Monitor positions in dashboard\n');
  } else {
    console.log('⚠️  NOT READY - Some checks failed\n');
  }

  await prisma.$disconnect();
}

checkArbMaxx();
