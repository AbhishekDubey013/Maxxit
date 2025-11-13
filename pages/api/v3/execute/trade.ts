import type { NextApiRequest, NextApiResponse } from 'next';
import { tradeExecutorV3 } from '../../../../lib/v3/trade-executor-v3';

/**
 * Execute V3 Trade (with automatic venue routing)
 * POST /api/v3/execute/trade
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signal_id } = req.body;

    if (!signal_id) {
      return res.status(400).json({ error: 'signal_id is required' });
    }

    console.log('[API] Executing V3 trade for signal:', signal_id);

    const result = await tradeExecutorV3.executeTrade(signal_id);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Trade executed successfully',
        position: result.position,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('[API] Trade execution failed:', error);
    return res.status(500).json({
      error: 'Trade execution failed',
      message: error.message,
    });
  }
}

