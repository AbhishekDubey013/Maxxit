/**
 * Trade Execution Worker
 * Runs automatically to execute pending signals
 * Schedule: Every 15-30 minutes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function executeTradesForSignals() {
  console.log('[TradeWorker] Starting trade execution...');

  try {
    // Fetch all pending signals (signals without positions = not yet executed)
    const pendingSignals = await prisma.signal.findMany({
      where: {
        positions: {
          none: {}, // No positions created yet
        },
        skippedReason: null, // Not skipped
        agent: {
          status: 'ACTIVE',
          deployments: {
            some: {
              status: 'ACTIVE',
            },
          },
        },
      },
      include: {
        agent: {
          include: {
            deployments: {
              where: { status: 'ACTIVE' },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 20, // Process 20 signals per run
    });

    console.log(`[TradeWorker] Found ${pendingSignals.length} pending signals`);

    let successCount = 0;
    let failureCount = 0;

    // Execute each signal
    for (const signal of pendingSignals) {
      try {
        console.log(`[TradeWorker] Executing signal ${signal.id} (${signal.tokenSymbol} ${signal.side})...`);

        // Call the trade execution API
        const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiBaseUrl}/api/admin/execute-trade-once?signalId=${signal.id}`, {
          method: 'POST',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            successCount++;
            console.log(`[TradeWorker] ✅ Signal ${signal.id} executed successfully`);
          } else {
            failureCount++;
            console.error(`[TradeWorker] ❌ Signal ${signal.id} execution failed:`, result.error);
          }
        } else {
          failureCount++;
          console.error(`[TradeWorker] ❌ Signal ${signal.id} API call failed:`, await response.text());
        }

        // Small delay between executions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        failureCount++;
        console.error(`[TradeWorker] Error executing signal ${signal.id}:`, error);
      }
    }

    console.log(`[TradeWorker] Complete! Success: ${successCount}, Failed: ${failureCount}`);
    return { success: true, executed: successCount, failed: failureCount };
  } catch (error: any) {
    console.error('[TradeWorker] Fatal error:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  executeTradesForSignals()
    .then(result => {
      console.log('[TradeWorker] Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('[TradeWorker] Fatal error:', error);
      process.exit(1);
    });
}

