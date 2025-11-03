/**
 * Test Complete Automated Hyperliquid Flow
 * Creates synthetic tweet → Signal → Trade → Position
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAutomatedFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   🧪 TEST AUTOMATED HYPERLIQUID FLOW                         ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Find approved Hyperliquid wallet
    console.log('Step 1: Finding approved Hyperliquid wallet...');
    const userWallet = await prisma.user_hyperliquid_wallets.findFirst({
      where: { is_approved: true }
    });

    if (!userWallet) {
      console.error('❌ No approved Hyperliquid wallet found!');
      console.error('Please set up a Hyperliquid agent first.');
      process.exit(1);
    }

    console.log('✅ Found wallet:', userWallet.user_wallet.slice(0, 10) + '...');
    console.log('   Agent Address:', userWallet.agent_address.slice(0, 10) + '...');

    // Step 2: Find or create Hyperliquid agent
    console.log('\nStep 2: Finding Hyperliquid agent...');
    let agent = await prisma.agents.findFirst({
      where: { venue: 'HYPERLIQUID' },
      include: {
        agent_accounts: {
          include: {
            ct_accounts: true
          }
        }
      }
    });

    if (!agent) {
      console.error('❌ No Hyperliquid agent found!');
      process.exit(1);
    }

    console.log('✅ Found agent:', agent.name);
    console.log('   Agent ID:', agent.id);

    // Step 3: Create or find deployment
    console.log('\nStep 3: Creating deployment...');
    let deployment = await prisma.agent_deployments.findFirst({
      where: {
        agent_id: agent.id,
        user_wallet: userWallet.user_wallet
      }
    });

    if (!deployment) {
      deployment = await prisma.agent_deployments.create({
        data: {
          agent_id: agent.id,
          user_wallet: userWallet.user_wallet.toLowerCase(),
          safe_wallet: userWallet.user_wallet.toLowerCase(), // Same as user wallet for Hyperliquid
          module_enabled: false, // Not needed for Hyperliquid
        }
      });
      console.log('✅ Created deployment:', deployment.id);
    } else {
      console.log('✅ Found existing deployment:', deployment.id);
    }

    // Step 4: Find or create CT account
    console.log('\nStep 4: Setting up CT account...');
    let ctAccount = await prisma.ct_accounts.findFirst({
      where: { x_username: 'Abhishe42402615' }
    });

    if (!ctAccount) {
      ctAccount = await prisma.ct_accounts.create({
        data: {
          x_username: 'Abhishe42402615',
          display_name: 'Abhishe Test',
          followers_count: 100,
          impact_factor: 1.0
        }
      });
    }

    console.log('✅ CT Account:', ctAccount.x_username);

    // Step 5: Link CT account to agent if not linked
    const existingLink = await prisma.agent_accounts.findFirst({
      where: {
        agent_id: agent.id,
        ct_account_id: ctAccount.id
      }
    });

    if (!existingLink) {
      await prisma.agent_accounts.create({
        data: {
          agent_id: agent.id,
          ct_account_id: ctAccount.id,
          weight: 1.0
        }
      });
      console.log('✅ Linked CT account to agent');
    } else {
      console.log('✅ CT account already linked');
    }

    // Step 6: Create synthetic tweet
    console.log('\nStep 6: Creating synthetic tweet...');
    const tweetText = 'Just opened a LONG position on $SOL at $178. Expecting pump to $200! 🚀 #Solana';
    
    // Delete old test tweets to avoid duplicates
    await prisma.ct_posts.deleteMany({
      where: {
        ct_account_id: ctAccount.id,
        tweet_text: tweetText
      }
    });

    const tweet = await prisma.ct_posts.create({
      data: {
        ct_account_id: ctAccount.id,
        tweet_id: `test_${Date.now()}`,
        tweet_text: tweetText,
        tweet_created_at: new Date(),
        is_signal_candidate: null, // Not processed yet
        processed_for_signals: false
      }
    });

    console.log('✅ Created synthetic tweet:');
    console.log('   Tweet ID:', tweet.id);
    console.log('   Text:', tweet.tweet_text);
    console.log('   Account:', ctAccount.x_username);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🎯 What Happens Next (Automated):');
    console.log('');
    console.log('1. Signal Generator Worker will:');
    console.log('   - Detect unprocessed tweet');
    console.log('   - Classify with LLM (token: SOL, sentiment: LONG, confidence)');
    console.log('   - Fetch LunarCrush score for SOL');
    console.log('   - Calculate position size (0-10%)');
    console.log('   - Create signal in database');
    console.log('');
    console.log('2. Trade Executor Worker will:');
    console.log('   - Detect new unexecuted signal');
    console.log('   - Get user Hyperliquid agent private key');
    console.log('   - Execute trade on Hyperliquid');
    console.log('   - Create position in database');
    console.log('');
    console.log('3. Position Monitor Worker will:');
    console.log('   - Detect new position');
    console.log('   - Track real-time PnL');
    console.log('   - Auto-close based on exit strategy');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Monitor Progress:');
    console.log('');
    console.log('  Check Signal:');
    console.log('  SELECT * FROM signals WHERE agent_id = \'' + agent.id + '\' ORDER BY created_at DESC LIMIT 1;');
    console.log('');
    console.log('  Check Position:');
    console.log('  SELECT * FROM positions WHERE deployment_id = \'' + deployment.id + '\' ORDER BY created_at DESC LIMIT 1;');
    console.log('');
    console.log('  Watch Logs:');
    console.log('  tail -f logs/signal-generator.log');
    console.log('  tail -f logs/trade-executor.log');
    console.log('  tail -f logs/position-monitor.log');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⏱️  Expected Timeline:');
    console.log('  - Signal generation: 30-60 seconds');
    console.log('  - Trade execution: 30-60 seconds');
    console.log('  - Position appears: 1-2 minutes total');
    console.log('');
    console.log('🚀 Workers should process this automatically!');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutomatedFlow();

