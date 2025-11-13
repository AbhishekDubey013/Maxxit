/**
 * API: Monitoring Dashboard
 * Complete monitoring data for dashboards
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { venueRouterMonitoring } from '../../../lib/venue-router-monitoring';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get health status
    const health = await venueRouterMonitoring.getHealthReport();

    // Get routing analytics (last 24h)
    const analytics = await venueRouterMonitoring.getRoutingAnalytics('day');

    // Get active MULTI agents
    const multiAgents = await prisma.agents.count({
      where: {
        venue: 'MULTI',
        status: 'ACTIVE',
      },
    });

    // Get open positions across all venues
    const openPositions = await prisma.positions.findMany({
      where: { status: 'OPEN' },
      select: {
        id: true,
        venue: true,
        token_symbol: true,
        side: true,
        entry_price: true,
        current_price: true,
        pnl: true,
        opened_at: true,
        deployment_id: true,
      },
      orderBy: { opened_at: 'desc' },
      take: 50,
    });

    // Group positions by venue
    const positionsByVenue = openPositions.reduce((acc, p) => {
      acc[p.venue] = (acc[p.venue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get recent signals (last 100)
    const recentSignals = await prisma.signals.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
        },
      },
      select: {
        id: true,
        venue: true,
        token_symbol: true,
        side: true,
        skipped_reason: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    // Calculate signal stats
    const totalSignals = recentSignals.length;
    const multiSignals = recentSignals.filter(s => s.venue === 'MULTI').length;
    const skippedSignals = recentSignals.filter(s => s.skipped_reason !== null).length;
    const executedSignals = totalSignals - skippedSignals;

    // Get recent errors from audit logs
    const recentErrors = await prisma.audit_logs.findMany({
      where: {
        event_name: { in: ['ROUTING_ERROR', 'TRADE_ERROR', 'VENUE_ERROR'] },
        occurred_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { occurred_at: 'desc' },
      take: 20,
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date(),
      health,
      analytics,
      agents: {
        total: await prisma.agents.count({ where: { status: 'ACTIVE' } }),
        multiVenue: multiAgents,
        byVenue: await prisma.agents.groupBy({
          by: ['venue'],
          where: { status: 'ACTIVE' },
          _count: true,
        }),
      },
      positions: {
        total: openPositions.length,
        byVenue: positionsByVenue,
        recent: openPositions.slice(0, 10),
      },
      signals: {
        total: totalSignals,
        multiVenue: multiSignals,
        executed: executedSignals,
        skipped: skippedSignals,
        executionRate: totalSignals > 0 ? (executedSignals / totalSignals) * 100 : 0,
      },
      errors: {
        count: recentErrors.length,
        recent: recentErrors.slice(0, 5).map(e => ({
          event: e.event_name,
          message: (e.payload as any)?.error || 'Unknown error',
          timestamp: e.occurred_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Dashboard] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

