/**
 * Execute Trade API
 * Manually trigger trade execution for a signal
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createTradeExecutor } from '../../../lib/trade-executor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signalId } = req.body;

    if (!signalId) {
      return res.status(400).json({
        error: 'Missing required field: signalId',
      });
    }

    const executor = createTradeExecutor();
    const result = await executor.executeSignal(signalId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        reason: result.reason,
        executionSummary: result.executionSummary,
      });
    }

    return res.status(200).json({
      success: true,
      txHash: result.txHash,
      positionId: result.positionId,
      message: 'Trade executed successfully',
    });
  } catch (error: any) {
    console.error('[ExecuteTrade] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to execute trade',
    });
  }
}
