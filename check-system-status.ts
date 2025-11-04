/**
 * Quick status check for the trading system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    SYSTEM STATUS CHECK                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Check agents
    const agents = await prisma.agents.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        venue: true,
        status: true,
        _count: {
          select: {
            agent_deployments: true,
            agent_accounts: true,
          }
        }
      }
    });

    console.log(`📦 AGENTS: ${agents.length} active`);
    agents.forEach(agent => {
      console.log(`   • ${agent.name} (${agent.venue})`);
      console.log(`     Deployments: ${agent._count.agent_deployments}, CT Accounts: ${agent._count.agent_accounts}`);
    });
    console.log();

    // Check deployments
    const deployments = await prisma.agent_deployments.findMany({
      where: { status: 'ACTIVE' },
      include: {
        agents: {
          select: { name: true }
        }
      }
    });

    console.log(`🚀 DEPLOYMENTS: ${deployments.length} active`);
    deployments.forEach(dep => {
      console.log(`   • ${dep.agents.name}`);
      console.log(`     User: ${dep.user_wallet.substring(0, 10)}...`);
      console.log(`     Safe: ${dep.safe_wallet.substring(0, 10)}...`);
      if (dep.hyperliquid_agent_address) {
        console.log(`     HL Agent: ${dep.hyperliquid_agent_address.substring(0, 10)}...`);
      }
    });
    console.log();

    // Check CT accounts
    const ctAccounts = await prisma.ct_accounts.findMany({
      where: { is_active: true },
      select: {
        x_username: true,
        last_seen_at: true,
        _count: {
          select: { ct_posts: true }
        }
      }
    });

    console.log(`📱 CT ACCOUNTS: ${ctAccounts.length} active`);
    ctAccounts.forEach(account => {
      console.log(`   • @${account.x_username}`);
      console.log(`     Posts: ${account._count.ct_posts}, Last seen: ${account.last_seen_at?.toLocaleString() || 'Never'}`);
    });
    console.log();

    // Check recent tweets
    const recentTweets = await prisma.ct_posts.findMany({
      take: 5,
      orderBy: { tweet_created_at: 'desc' },
      include: {
        ct_accounts: {
          select: { x_username: true }
        }
      }
    });

    console.log(`🐦 RECENT TWEETS: ${recentTweets.length}`);
    recentTweets.forEach(tweet => {
      console.log(`   • @${tweet.ct_accounts.x_username}: "${tweet.tweet_text.substring(0, 50)}..."`);
      console.log(`     Signal: ${tweet.is_signal_candidate}, Tokens: ${tweet.extracted_tokens?.join(', ') || 'none'}`);
    });
    console.log();

    // Check signals
    const pendingSignals = await prisma.signals.findMany({
      where: {
        positions: { none: {} },
        skipped_reason: null,
      },
      include: {
        agents: { select: { name: true } }
      },
      take: 5,
    });

    console.log(`📊 PENDING SIGNALS: ${pendingSignals.length}`);
    pendingSignals.forEach(signal => {
      console.log(`   • ${signal.agents?.name}: ${signal.token_symbol} ${signal.side}`);
      console.log(`     Venue: ${signal.venue}, Created: ${signal.created_at.toLocaleString()}`);
    });
    console.log();

    // Check positions
    const openPositions = await prisma.positions.findMany({
      where: { closed_at: null },
      include: {
        agent_deployments: {
          include: {
            agents: { select: { name: true } }
          }
        }
      }
    });

    console.log(`💼 OPEN POSITIONS: ${openPositions.length}`);
    openPositions.forEach(pos => {
      console.log(`   • ${pos.agent_deployments.agents.name}: ${pos.token_symbol} ${pos.side}`);
      console.log(`     Entry: $${pos.entry_price}, Qty: ${pos.qty}, Venue: ${pos.venue}`);
    });
    console.log();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Status check complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Error checking status:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();

