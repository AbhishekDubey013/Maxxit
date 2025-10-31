/**
 * Trade Execution Worker
 * Runs automatically to execute pending signals
 * Schedule: Every 5 minutes (synced with signal generation)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function executeTradesForSignals() {
  console.log('[TradeWorker] Starting trade execution...');
  console.log('[TradeWorker] Timestamp:', new Date().toISOString());

  try {
    // Fetch all pending signals (signals without positions = not yet executed)
    console.log('[TradeWorker] Querying for pending signals...');
    console.log('[TradeWorker] Criteria: no positions, not skipped, agent ACTIVE, deployment ACTIVE with module enabled');
    
    const pendingSignals = await prisma.signals.findMany({
      where: {
        positions: {
          none: {}, // No positions created yet
        },
        skipped_reason: null, // Not skipped
        agents: {
          status: 'ACTIVE',
          agent_deployments: {
            some: {
              status: 'ACTIVE',
              module_enabled: true, // CRITICAL: Only execute on deployments with module enabled
            },
          },
        },
      },
      include: {
        agents: {
          include: {
            agent_deployments: {
              where: { 
                status: 'ACTIVE',
                module_enabled: true, // CRITICAL: Only fetch deployments with module enabled
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
      take: 20, // Process 20 signals per run
    });

    console.log(`[TradeWorker] Found ${pendingSignals.length} pending signals`);
    
    if (pendingSignals.length > 0) {
      console.log('[TradeWorker] Signal details:');
      pendingSignals.forEach(s => {
        console.log(`[TradeWorker]   - ${s.id.substring(0, 8)}... (${s.agents?.name}): ${s.token_symbol} ${s.side}, created ${s.created_at}`);
        console.log(`[TradeWorker]     Deployments: ${s.agents?.agent_deployments?.length || 0}`);
        if (s.agents?.agent_deployments && s.agents.agent_deployments.length > 0) {
          s.agents.agent_deployments.forEach(d => {
            console.log(`[TradeWorker]       Safe: ${d.safe_wallet}, Module: ${d.module_enabled}`);
          });
        }
      });
    } else {
      console.log('[TradeWorker] No pending signals found. Checking why...');
      
      // Debug: Check if any signals exist without positions
      const allSignalsWithoutPositions = await prisma.signals.findMany({
        where: {
          positions: { none: {} },
        },
        select: {
          id: true,
          token_symbol: true,
          skipped_reason: true,
          agents: {
            select: {
              name: true,
              status: true,
            },
          },
        },
        take: 5,
      });
      
      console.log(`[TradeWorker] DEBUG: Signals without positions (any status): ${allSignalsWithoutPositions.length}`);
      if (allSignalsWithoutPositions.length > 0) {
        allSignalsWithoutPositions.forEach(s => {
          console.log(`[TradeWorker]   - ${s.id.substring(0, 8)}... (${s.agents?.name}): ${s.token_symbol}, agent_status=${s.agents?.status}, skipped=${!!s.skipped_reason}`);
        });
      }
    }

    let successCount = 0;
    let failureCount = 0;

    // Execute each signal
    for (const signal of pendingSignals) {
      try {
        console.log(`[TradeWorker] Executing signal ${signal.id} (${signal.token_symbol} ${signal.side})...`);
        console.log(`[TradeWorker]   Agent: ${signal.agents?.name}`);
        console.log(`[TradeWorker]   Deployment Safe: ${signal.agents?.agent_deployments?.[0]?.safe_wallet}`);

        // Call the trade execution API
        const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiBaseUrl}/api/admin/execute-trade-once?signalId=${signal.id}`, {
          method: 'POST',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.positionsCreated > 0) {
            successCount++;
            console.log(`[TradeWorker] ✅ Signal ${signal.id} executed successfully`);
            console.log(`[TradeWorker]    Positions created: ${result.positionsCreated}`);
            if (result.positions && result.positions[0]) {
              console.log(`[TradeWorker]    TX Hash: ${result.positions[0].entryTxHash}`);
              console.log(`[TradeWorker]    Arbiscan: https://arbiscan.io/tx/${result.positions[0].entryTxHash}`);
            }
          } else {
            failureCount++;
            console.error(`[TradeWorker] ❌ Signal ${signal.id} execution failed`);
            console.error(`[TradeWorker]    Error: ${result.message || result.error}`);
            if (result.errors && result.errors.length > 0) {
              result.errors.forEach((err: any) => {
                console.error(`[TradeWorker]    - Deployment ${err.deploymentId}: ${err.error}`);
                if (err.reason) console.error(`[TradeWorker]      Reason: ${err.reason}`);
              });
            }
          }
        } else {
          failureCount++;
          const errorText = await response.text();
          console.error(`[TradeWorker] ❌ Signal ${signal.id} API call failed (${response.status})`);
          console.error(`[TradeWorker]    Response: ${errorText}`);
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

