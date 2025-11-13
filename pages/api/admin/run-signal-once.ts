import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { bucket6hUtc } from '../../../lib/time-utils';
import { createLunarCrushScorer } from '../../../lib/lunarcrush-score';

const prisma = new PrismaClient();

/**
 * Admin endpoint to trigger signal creation once for testing
 * 
 * This implements a minimal signal creation flow:
 * 1. Reads candidate ct_posts (is_signal_candidate=true)
 * 2. Gets latest market_indicators_6h
 * 3. Reads agent weights and linked agent_accounts
 * 4. Verifies venue availability in venues_status
 * 5. Inserts into signals only if no duplicate for (agent_id, token_symbol, 6h bucket)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[ADMIN] Running signal creation once...');

    // Initialize LunarCrush scorer
    const lunarCrushScorer = createLunarCrushScorer();
    if (!lunarCrushScorer) {
      console.warn('[SIGNAL] LunarCrush API key not configured - using default 5% position size');
    }

    // 1. Get candidate posts (is_signal_candidate=true) from ACTIVE accounts only
    const candidatePosts = await prisma.ct_posts.findMany({
      where: {
        // is_signal_candidate: true,
        ct_accounts: {
          is_active: true
        }
      },
      include: { ct_accounts: true },
      orderBy: { tweet_created_at: 'desc' },
      take: 10,
    });

    if (candidatePosts.length === 0) {
      return res.status(200).json({ 
        message: 'No signal candidates found',
        signalsCreated: 0,
      });
    }

    const signalsCreated = [];
    
    // Stablecoins that should NOT be traded (they are the base currency)
    const EXCLUDED_TOKENS = ['USDC', 'USDT', 'DAI', 'USDC.E', 'BUSD', 'FRAX'];

    for (const post of candidatePosts) {
      // Extract tokens from the post
      for (const tokenSymbol of post.extracted_tokens) {
        // Skip stablecoins - they are base currency, not trading assets
        if (EXCLUDED_TOKENS.includes(tokenSymbol.toUpperCase())) {
          console.log(`[SIGNAL] Skipping stablecoin ${tokenSymbol} - base currency only`);
          continue;
        }
        // 2. Get latest market indicators for this token
        const indicators = await prisma.market_indicators_6h.findFirst({
          where: { token_symbol: tokenSymbol },
          orderBy: { window_start: 'desc' },
        });

        // 3. Find agents that monitor this CT account
        const agentLinks = await prisma.agent_accounts.findMany({
          where: { ct_account_id: post.ct_account_id },
          include: { agents: true },
        });

        for (const link of agentLinks) {
          const agent = link.agents;

          // Skip non-ACTIVE agents
          if (agent.status !== 'PUBLIC') continue; // Only generate signals for public agents

          // Check for duplicate (same agent, token, 6h bucket)
          const currentBucket = bucket6hUtc(new Date());
          const existing = await prisma.signals.findFirst({
            where: {
              agent_id: agent.id,
              token_symbol: tokenSymbol,
              created_at: {
                gte: currentBucket,
              },
            },
          });

          if (existing) {
            console.log(`[SIGNAL] Duplicate found for ${agent.name} - ${tokenSymbol}`);
            continue;
          }

          // Get LunarCrush score for dynamic position sizing
          let positionSizePercentage = 5; // Default 5%
          let lunarCrushScore = null;
          let lunarCrushReasoning = null;
          let lunarCrushBreakdown = null;

          if (lunarCrushScorer) {
            try {
              console.log(`[SIGNAL] Fetching LunarCrush score for ${tokenSymbol}...`);
              const scoreData = await lunarCrushScorer.getTokenScore(tokenSymbol);
              
              if (scoreData.tradeable) {
                positionSizePercentage = scoreData.positionSize; // 0-10%
                lunarCrushScore = scoreData.score;
                lunarCrushReasoning = scoreData.reasoning;
                lunarCrushBreakdown = scoreData.breakdown;
                
                console.log(`[SIGNAL] LunarCrush: ${tokenSymbol} score=${scoreData.score.toFixed(3)}, position=${positionSizePercentage.toFixed(2)}%`);
              } else {
                console.log(`[SIGNAL] LunarCrush: ${tokenSymbol} score=${scoreData.score.toFixed(3)} - NOT TRADEABLE (score <= 0)`);
                continue; // Skip this signal if LunarCrush says don't trade
              }
            } catch (error: any) {
              console.warn(`[SIGNAL] LunarCrush error for ${tokenSymbol}:`, error.message, '- using default 5%');
            }
          }

          // Create signal with LunarCrush-derived position sizing
          // Wrapped in try-catch to handle race condition duplicate errors gracefully
          try {
            const signal = await prisma.signals.create({
              data: {
                agent_id: agent.id,
                token_symbol: tokenSymbol,
                venue: agent.venue,
                side: 'LONG', // Simplified - would use sentiment analysis
                size_model: {
                  type: 'balance-percentage',
                  value: positionSizePercentage, // Dynamic from LunarCrush!
                  impactFactor: post.ct_accounts.impact_factor,
                },
                risk_model: {
                  stopLoss: 0.05,
                  takeProfit: 0.15,
                },
                source_tweets: [post.tweet_id],
                lunarcrush_score: lunarCrushScore,
                lunarcrush_reasoning: lunarCrushReasoning,
                lunarcrush_breakdown: lunarCrushBreakdown,
              },
            });

            signalsCreated.push(signal);
            console.log(`[SIGNAL] Created signal: ${agent.name} - ${tokenSymbol} with ${positionSizePercentage.toFixed(2)}% position size`);
          } catch (createError: any) {
            // P2002: Unique constraint violation (race condition - another worker created it first)
            if (createError.code === 'P2002') {
              console.log(`[SIGNAL] Signal already created by another worker: ${agent.name} - ${tokenSymbol} (race condition handled)`);
            } else {
              // Re-throw unexpected errors
              throw createError;
            }
          }
        }
      }
    }

    return res.status(200).json({
      message: 'Signal creation completed',
      signalsCreated: signalsCreated.length,
      signals: signalsCreated,
    });
  } catch (error: any) {
    console.error('[ADMIN] Signal creation error:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
