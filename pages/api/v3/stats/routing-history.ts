import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get V3 Venue Routing History
 * GET /api/v3/stats/routing-history
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '50', token_symbol, selected_venue } = req.query;

    let query = 'SELECT * FROM venue_routing_history_v3 WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (token_symbol) {
      query += ` AND token_symbol = $${paramIndex}`;
      params.push(token_symbol);
      paramIndex++;
    }

    if (selected_venue) {
      query += ` AND selected_venue = $${paramIndex}`;
      params.push(selected_venue);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(Number(limit));

    const history = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    // Calculate routing efficiency metrics
    const hyperliquidCount = history.filter((h) => h.selected_venue === 'HYPERLIQUID').length;
    const ostiumCount = history.filter((h) => h.selected_venue === 'OSTIUM').length;
    const avgDuration = history.reduce((sum, h) => sum + (h.routing_duration_ms || 0), 0) / history.length;

    return res.status(200).json({
      success: true,
      history,
      summary: {
        total: history.length,
        hyperliquid: hyperliquidCount,
        ostium: ostiumCount,
        hyperliquid_pct: ((hyperliquidCount / history.length) * 100).toFixed(1),
        ostium_pct: ((ostiumCount / history.length) * 100).toFixed(1),
        avg_duration_ms: avgDuration.toFixed(1),
      },
    });
  } catch (error: any) {
    console.error('[API] Failed to get routing history:', error);
    return res.status(500).json({
      error: 'Failed to get routing history',
      message: error.message,
    });
  }
}

