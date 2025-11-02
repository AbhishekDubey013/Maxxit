#!/usr/bin/env npx tsx
/**
 * Test Complete AVAX Signal Flow
 * Tweet → LunarCrush → Signal → Trade → Position (Hyperliquid)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAvaxSignal() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Testing AVAX Signal with LunarCrush → Hyperliquid          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Find or create Abhishe's CT account
    console.log('━━━ Step 1: Finding Abhishe CT Account ━━━\n');
    
    let ctAccount = await prisma.ct_accounts.findFirst({
      where: {
        OR: [
          { x_username: { contains: 'abhishe', mode: 'insensitive' } },
          { x_username: { contains: 'abhishek', mode: 'insensitive' } }
        ]
      }
    });

    if (!ctAccount) {
      console.log('Creating new CT account for Abhishe...');
      ctAccount = await prisma.ct_accounts.create({
        data: {
          x_username: 'abhishe_trader',
          platform_name: 'Abhishe - Crypto Trader',
          impact_factor: 1.0
        }
      });
    }

    console.log(`✅ CT Account: ${ctAccount.x_username} (${ctAccount.id})\n`);

    // 2. Find Ring agent
    console.log('━━━ Step 2: Finding Ring Agent ━━━\n');
    
    const ringAgent = await prisma.agents.findFirst({
      where: {
        name: { contains: 'Ring', mode: 'insensitive' },
        status: 'ACTIVE'
      },
      include: {
        agent_deployments: {
          where: {
            status: 'ACTIVE',
            hyperliquid_agent_address: { not: null }
          }
        }
      }
    });

    if (!ringAgent) {
      console.error('❌ Ring agent not found or not active');
      process.exit(1);
    }

    console.log(`✅ Agent: ${ringAgent.name}`);
    console.log(`   ID: ${ringAgent.id}`);
    console.log(`   Venue: ${ringAgent.venue}`);
    console.log(`   Active Deployments: ${ringAgent.agent_deployments.length}\n`);

    if (ringAgent.agent_deployments.length === 0) {
      console.error('❌ Ring agent has no active Hyperliquid deployments');
      process.exit(1);
    }

    const deployment = ringAgent.agent_deployments[0];
    console.log(`✅ Hyperliquid Agent: ${deployment.hyperliquid_agent_address}\n`);

    // 3. Link agent to CT account if not already linked
    console.log('━━━ Step 3: Linking Agent to CT Account ━━━\n');
    
    const existingLink = await prisma.agent_accounts.findFirst({
      where: {
        agent_id: ringAgent.id,
        ct_account_id: ctAccount.id
      }
    });

    if (!existingLink) {
      await prisma.agent_accounts.create({
        data: {
          agent_id: ringAgent.id,
          ct_account_id: ctAccount.id
        }
      });
      console.log('✅ Linked Ring agent to Abhishe CT account\n');
    } else {
      console.log('✅ Already linked\n');
    }

    // 4. Create synthetic tweet
    console.log('━━━ Step 4: Creating AVAX Tweet ━━━\n');
    
    const tweetId = `avax_test_${Date.now()}`;
    const tweetContent = 'Avax is gonna break all barriers and rise 🚀';

    const tweet = await prisma.ct_posts.create({
      data: {
        tweet_id: tweetId,
        ct_account_id: ctAccount.id,
        tweet_text: tweetContent,
        is_signal_candidate: true,
        extracted_tokens: ['AVAX'],
        tweet_created_at: new Date()
      }
    });

    console.log(`✅ Tweet Created:`);
    console.log(`   ID: ${tweetId}`);
    console.log(`   Content: "${tweetContent}"`);
    console.log(`   Token: AVAX\n`);

    // 5. Call signal generation (will use LunarCrush)
    console.log('━━━ Step 5: Generating Signal with LunarCrush ━━━\n');
    
    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const signalUrl = `${apiBaseUrl}/api/admin/run-signal-once?agentId=${ringAgent.id}`;
    
    console.log(`Calling: ${signalUrl}\n`);

    const signalResponse = await fetch(signalUrl, {
      method: 'POST',
    });

    if (!signalResponse.ok) {
      const error = await signalResponse.text();
      console.error(`❌ Signal generation failed: ${error}\n`);
      process.exit(1);
    }

    const signalResult = await signalResponse.json();
    console.log(`✅ Signal generation completed`);
    console.log(`   Signals created: ${signalResult.signalsCreated}\n`);

    // 6. Check created signal
    console.log('━━━ Step 6: Checking Signal Details ━━━\n');
    
    const signal = await prisma.signals.findFirst({
      where: {
        agent_id: ringAgent.id,
        token_symbol: 'AVAX',
        created_at: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!signal) {
      console.log('⚠️  No signal created. Possible reasons:');
      console.log('   - AVAX already has a signal in this 6h bucket');
      console.log('   - LunarCrush score ≤ 0 (not tradeable)');
      console.log('   - AVAX not available on Hyperliquid');
      console.log('\nChecking if AVAX exists in venues_status...\n');
      
      const venueStatus = await prisma.venues_status.findUnique({
        where: {
          venue_token_symbol: {
            venue: 'HYPERLIQUID',
            token_symbol: 'AVAX'
          }
        }
      });
      
      if (!venueStatus) {
        console.log('❌ AVAX not found in venues_status for HYPERLIQUID');
        console.log('This token may not be available for trading on Hyperliquid.\n');
      } else {
        console.log('✅ AVAX is available on HYPERLIQUID\n');
      }
      
      process.exit(1);
    }

    const sizeModel = signal.size_model as any;
    
    console.log('✅ Signal Created!\n');
    console.log('Signal Details:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`ID:              ${signal.id}`);
    console.log(`Token:           ${signal.token_symbol}`);
    console.log(`Venue:           ${signal.venue}`);
    console.log(`Side:            ${signal.side}`);
    console.log();
    console.log('📊 LunarCrush Analysis:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`Score:           ${signal.lunarcrush_score?.toFixed(3) || 'N/A'}`);
    console.log(`Position Size:   ${sizeModel.value.toFixed(2)}% ⭐`);
    console.log(`Reasoning:       ${signal.lunarcrush_reasoning || 'N/A'}`);
    console.log();

    if (signal.lunarcrush_breakdown) {
      const breakdown = signal.lunarcrush_breakdown as any;
      console.log('Metric Breakdown:');
      console.log(`  Galaxy Score:   ${(breakdown.galaxy * 100).toFixed(1)}%`);
      console.log(`  Sentiment:      ${(breakdown.sentiment * 100).toFixed(1)}%`);
      console.log(`  Social Volume:  ${(breakdown.social * 100).toFixed(1)}%`);
      console.log(`  Momentum:       ${(breakdown.momentum * 100).toFixed(1)}%`);
      console.log(`  Market Rank:    ${(breakdown.rank * 100).toFixed(1)}%`);
      console.log();
    }

    // 7. Execute trade
    console.log('━━━ Step 7: Executing Trade on Hyperliquid ━━━\n');
    
    const tradeUrl = `${apiBaseUrl}/api/admin/execute-trade-once?signalId=${signal.id}`;
    console.log(`Calling: ${tradeUrl}\n`);

    const tradeResponse = await fetch(tradeUrl, {
      method: 'POST'
    });

    if (!tradeResponse.ok) {
      const error = await tradeResponse.text();
      console.error(`❌ Trade execution failed: ${error}\n`);
      process.exit(1);
    }

    const tradeResult = await tradeResponse.json();
    console.log(`✅ Trade execution completed`);
    console.log(`   Success: ${tradeResult.success}`);
    console.log(`   Positions created: ${tradeResult.positionsCreated}\n`);

    // 8. Check position created
    console.log('━━━ Step 8: Verifying Position on Hyperliquid ━━━\n');
    
    const position = await prisma.positions.findFirst({
      where: {
        signal_id: signal.id
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!position) {
      console.log('⚠️  No position found. Check logs above for errors.\n');
      process.exit(1);
    }

    console.log('✅ Position Created!\n');
    console.log('Position Details:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`ID:              ${position.id}`);
    console.log(`Token:           ${position.token}`);
    console.log(`Size:            ${position.size}`);
    console.log(`Side:            ${position.side}`);
    console.log(`Entry Price:     ${position.entry_price || 'N/A'}`);
    console.log(`Status:          ${position.status}`);
    console.log();

    // 9. Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ COMPLETE FLOW TEST SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Flow Summary:');
    console.log('  1. ✅ Created tweet: "Avax is gonna break all barriers and rise"');
    console.log('  2. ✅ LunarCrush scored AVAX');
    console.log(`  3. ✅ Signal created with ${sizeModel.value.toFixed(2)}% position size`);
    console.log('  4. ✅ Trade executed on Hyperliquid');
    console.log('  5. ✅ Position opened successfully');
    console.log();
    console.log('🎉 Ring agent successfully took position on Hyperliquid!');
    console.log();

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAvaxSignal();

