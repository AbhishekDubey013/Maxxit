/**
 * Telegram Ingestion Worker (Microservice)
 * Handles BOTH:
 * 1. Fetches messages from Telegram channels/groups (via telegram_sources)
 * 2. Processes and classifies individual DM messages (via telegram_alpha_users)
 * 
 * Interval: 2 minutes (configurable via WORKER_INTERVAL)
 * 
 * Flow:
 * 1. Fetches new messages from channels/groups (needs TELEGRAM_BOT_TOKEN)
 * 2. Processes unclassified DM messages from database
 * 3. Classifies all messages using LLM
 * 4. Updates telegram_posts with classification results
 * 5. Signal generator picks up classified messages
 */

import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';
import { prisma } from './lib/prisma-client';
import { setupGracefulShutdown, registerCleanup } from './lib/graceful-shutdown';
import { checkDatabaseHealth } from './lib/prisma-client';
import { createLLMClassifier } from './lib/llm-classifier';

dotenv.config();

const PORT = process.env.PORT || 5006;
const INTERVAL = parseInt(process.env.WORKER_INTERVAL || '120000'); // 2 minutes default
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

let workerInterval: NodeJS.Timeout | null = null;

// Health check server
const app = express();
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    service: 'telegram-worker',
    interval: INTERVAL,
    database: dbHealthy ? 'connected' : 'disconnected',
    botTokenConfigured: !!TELEGRAM_BOT_TOKEN,
    isRunning: workerInterval !== null,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`🏥 Telegram Worker health check on port ${PORT}`);
});

/**
 * Fetch messages from a Telegram channel/group
 */
async function getChannelMessages(chatId: string): Promise<any[]> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getUpdates`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    // Filter updates for this specific chat
    const messages: any[] = [];
    for (const update of data.result) {
      const msg = update.channel_post || update.message;
      if (msg && String(msg.chat.id) === chatId && msg.text) {
        messages.push(msg);
      }
    }

    return messages;
  } catch (error: any) {
    console.error(`[Telegram] Error fetching messages for chat ${chatId}:`, error.message);
    return [];
  }
}

/**
 * Process Telegram messages (channels + individual DMs)
 */
async function processTelegramMessages() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📱 TELEGRAM INGESTION WORKER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  let totalProcessed = 0;
  let totalSignals = 0;

  // ============================================
  // PART 1: Fetch messages from channels/groups
  // ============================================
  if (TELEGRAM_BOT_TOKEN) {
    try {
      const sources = await prisma.telegram_sources.findMany({
        where: { is_active: true },
        orderBy: { created_at: 'asc' },
      });

      if (sources.length > 0) {
        console.log(`📺 Processing ${sources.length} channel/group source(s)...\n`);
        
        const classifier = createLLMClassifier();

        for (const source of sources) {
          if (!source.telegram_id) continue;

          try {
            const messages = await getChannelMessages(source.telegram_id);
            console.log(`[${source.source_name}] Found ${messages.length} new messages`);

            for (const msg of messages) {
              const messageKey = `${source.telegram_id}_${msg.message_id}`;
              const existing = await prisma.telegram_posts.findUnique({
                where: { message_id: messageKey },
              });

              if (existing || !msg.text) continue;

              // Pre-filter
              const hasToken = /\$[A-Z]{2,10}\b|BTC|ETH|SOL|AVAX|ARB|OP|MATIC|LINK|UNI|AAVE/i.test(msg.text);
              const isShortNonSignal = msg.text.length < 30 && !hasToken;
              const isCommonChatter = /^(gm|gn|good morning|good night|hello|hi|hey|wagmi|lfg|lets go|thank you|thanks|👍|❤️|🔥)$/i.test(msg.text.trim());

              if (isShortNonSignal || isCommonChatter) {
                await prisma.telegram_posts.create({
                  data: {
                    source_id: source.id,
                    message_id: messageKey,
                    message_text: msg.text,
                    message_created_at: new Date(msg.date * 1000),
                    sender_id: msg.from?.id ? String(msg.from.id) : null,
                    sender_username: msg.from?.username || null,
                    is_signal_candidate: false,
                    extracted_tokens: [],
                  },
                });
                totalProcessed++;
                continue;
              }

              // Classify
              if (classifier) {
                const classification = await classifier.classifyTweet(msg.text);
                await prisma.telegram_posts.create({
                  data: {
                    source_id: source.id,
                    message_id: messageKey,
                    message_text: msg.text,
                    message_created_at: new Date(msg.date * 1000),
                    sender_id: msg.from?.id ? String(msg.from.id) : null,
                    sender_username: msg.from?.username || null,
                    is_signal_candidate: classification.isSignalCandidate,
                    extracted_tokens: classification.extractedTokens,
                    confidence_score: classification.confidence,
                    signal_type: classification.sentiment === 'bullish' ? 'LONG' : 
                                 classification.sentiment === 'bearish' ? 'SHORT' : null,
                  },
                });
                totalProcessed++;
                if (classification.isSignalCandidate) {
                  totalSignals++;
                  console.log(`[${source.source_name}] ✅ Signal: ${classification.extractedTokens.join(', ')}`);
                }
              }
            }

            await prisma.telegram_sources.update({
              where: { id: source.id },
              data: { last_fetched_at: new Date() },
            });
          } catch (error: any) {
            console.error(`[${source.source_name}] ❌ Error:`, error.message);
          }
        }
      }
    } catch (error: any) {
      console.error('[Channels] ❌ Error:', error.message);
    }
  } else {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set - skipping channel ingestion\n');
  }

  // ============================================
  // PART 2: Process unclassified DM messages
  // ============================================

  try {
    // Get unprocessed messages from telegram alpha users (individual DMs)
    const unprocessedMessages = await prisma.telegram_posts.findMany({
      where: {
        alpha_user_id: { not: null },
        is_signal_candidate: null, // Not yet classified
        telegram_alpha_users: {
          is_active: true,
        },
      },
      include: {
        telegram_alpha_users: true,
      },
      orderBy: {
        message_created_at: 'asc',
      },
      take: 50,
    });

    if (unprocessedMessages.length > 0) {
      console.log(`💬 Processing ${unprocessedMessages.length} unclassified DM message(s)...\n`);

      const classifier = createLLMClassifier();
      if (!classifier) {
        console.log('⚠️  LLM Classifier not available - skipping classification');
        console.log('   Set PERPLEXITY_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY\n');
      } else {
        // Process each message
        for (const message of unprocessedMessages) {
          try {
            const user = message.telegram_alpha_users;
            const username = user?.telegram_username || user?.first_name || 'Unknown';
            
            console.log(`[${username}] Processing: "${message.message_text.substring(0, 50)}..."`);

            // Quick pre-filter: Skip obvious non-signals
            const hasToken = /\$[A-Z]{2,10}\b|BTC|ETH|SOL|AVAX|ARB|OP|MATIC|LINK|UNI|AAVE/i.test(message.message_text);
            const isShortNonSignal = message.message_text.length < 20 && !hasToken;
            const isCommonChatter = /^(gm|gn|good morning|good night|hello|hi|hey|wagmi|lfg|lets go|thank you|thanks|👍|❤️|🔥)$/i.test(message.message_text.trim());

            if (isShortNonSignal || isCommonChatter) {
              // Mark as not a signal (skip LLM call)
              await prisma.telegram_posts.update({
                where: { id: message.id },
                data: {
                  is_signal_candidate: false,
                  extracted_tokens: [],
                  confidence_score: 0,
                },
              });
              totalProcessed++;
              console.log(`[${username}] ⏭️  Skipped (too short/common chatter)`);
              continue;
            }

            // Classify message using LLM
            const classification = await classifier.classifyTweet(message.message_text);

            // Update message with classification
            await prisma.telegram_posts.update({
              where: { id: message.id },
              data: {
                is_signal_candidate: classification.isSignalCandidate,
                extracted_tokens: classification.extractedTokens,
                confidence_score: classification.confidence,
                signal_type: classification.sentiment === 'bullish' ? 'LONG' : 
                             classification.sentiment === 'bearish' ? 'SHORT' : null,
              },
            });

            totalProcessed++;

            if (classification.isSignalCandidate) {
              totalSignals++;
              console.log(`[${username}] ✅ Signal detected: ${classification.extractedTokens.join(', ')} - ${classification.sentiment} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`);
            } else {
              console.log(`[${username}] ℹ️  Not a signal`);
            }

          } catch (error: any) {
            console.error(`[Message ${message.id}] ❌ Error:`, error.message);
            
            // Mark as error (not a signal) to avoid reprocessing
            try {
              await prisma.telegram_posts.update({
                where: { id: message.id },
                data: {
                  is_signal_candidate: false,
                  extracted_tokens: [],
                  confidence_score: 0,
                },
              });
              totalProcessed++;
            } catch (updateError) {
              console.error(`[Message ${message.id}] Failed to mark as processed:`, updateError);
            }
          }
        }
      }
    } else {
      console.log('✅ No unclassified DM messages found\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PROCESSING SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Messages Processed: ${totalProcessed}`);
    console.log(`  Signals Detected: ${totalSignals}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('[Telegram] ❌ Fatal error:', error.message);
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Telegram Worker starting...');
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000}s)`);
  
  // Check bot token
  if (TELEGRAM_BOT_TOKEN) {
    console.log('✅ Telegram Bot Token: CONFIGURED');
  } else {
    console.log('⚠️  Telegram Bot Token: NOT SET (channel ingestion disabled)');
  }
  
  // Check LLM classifier availability
  const classifier = createLLMClassifier();
  if (classifier) {
    console.log('🤖 LLM Classifier: ENABLED');
  } else {
    console.log('⚠️  LLM Classifier: DISABLED (no API key)');
    console.log('   Set PERPLEXITY_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to enable');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Run immediately on startup
  await processTelegramMessages();
  
  // Then run on interval
  workerInterval = setInterval(async () => {
    await processTelegramMessages();
  }, INTERVAL);
}

// Register cleanup to stop worker interval
registerCleanup(async () => {
  console.log('🛑 Stopping Telegram Worker interval...');
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
});

// Setup graceful shutdown
setupGracefulShutdown('Telegram Worker', server);

// Start worker
if (require.main === module) {
  runWorker().catch(error => {
    console.error('[Telegram] ❌ Worker failed to start:', error);
    process.exit(1);
  });
}

export { processTelegramMessages };

