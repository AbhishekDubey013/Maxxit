import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get V3 System Overview Statistics
 * GET /api/v3/stats/overview
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Agent counts
    const agentStats = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
        COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
        COUNT(*) FILTER (WHERE status = 'PAUSED') as paused
      FROM agents_v3;
    `;

    // Signal counts
    const signalStats = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'ROUTED') as routed,
        COUNT(*) FILTER (WHERE status = 'EXECUTED') as executed,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed
      FROM signals_v3;
    `;

    // Position counts
    const positionStats = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as closed,
        SUM(CASE WHEN pnl IS NOT NULL THEN pnl ELSE 0 END) as total_pnl
      FROM positions_v3;
    `;

    // Venue routing stats
    const routingStats = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE selected_venue = 'HYPERLIQUID') as hyperliquid,
        COUNT(*) FILTER (WHERE selected_venue = 'OSTIUM') as ostium,
        AVG(routing_duration_ms) as avg_duration_ms
      FROM venue_routing_history_v3;
    `;

    // Deployment counts
    const deploymentStats = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
      FROM agent_deployments_v3;
    `;

    // Recent activity (last 24h)
    const recentActivity = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as signals_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as signals_7d
      FROM signals_v3;
    `;

    return res.status(200).json({
      success: true,
      version: 'V3',
      timestamp: new Date().toISOString(),
      stats: {
        agents: {
          total: Number(agentStats[0].total),
          active: Number(agentStats[0].active),
          draft: Number(agentStats[0].draft),
          paused: Number(agentStats[0].paused),
        },
        deployments: {
          total: Number(deploymentStats[0].total),
          active: Number(deploymentStats[0].active),
        },
        signals: {
          total: Number(signalStats[0].total),
          pending: Number(signalStats[0].pending),
          routed: Number(signalStats[0].routed),
          executed: Number(signalStats[0].executed),
          failed: Number(signalStats[0].failed),
          last_24h: Number(recentActivity[0].signals_24h),
          last_7d: Number(recentActivity[0].signals_7d),
        },
        positions: {
          total: Number(positionStats[0].total),
          open: Number(positionStats[0].open),
          closed: Number(positionStats[0].closed),
          total_pnl: Number(positionStats[0].total_pnl || 0),
        },
        routing: {
          total: Number(routingStats[0]?.total || 0),
          hyperliquid: Number(routingStats[0]?.hyperliquid || 0),
          ostium: Number(routingStats[0]?.ostium || 0),
          avg_duration_ms: Number(routingStats[0]?.avg_duration_ms || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Failed to get V3 stats:', error);
    return res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
}

