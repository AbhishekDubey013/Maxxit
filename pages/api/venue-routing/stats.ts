/**
 * API: Venue Routing Statistics
 * GET: Get routing statistics and history
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timeWindow = 'day', tokenSymbol } = req.query;

    if (typeof timeWindow !== 'string' || !['hour', 'day', 'week'].includes(timeWindow)) {
      return res.status(400).json({
        error: 'Invalid timeWindow. Must be: hour, day, or week',
      });
    }

    // Calculate time filter
    const now = new Date();
    const timeFilter = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    }[timeWindow];

    // Get routing history
    const routingHistory = await prisma.venue_routing_history.findMany({
      where: {
        created_at: { gte: timeFilter },
        ...(tokenSymbol && typeof tokenSymbol === 'string' && { token_symbol: tokenSymbol }),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    // Calculate statistics
    const stats = {
      total: routingHistory.length,
      byVenue: {} as Record<string, number>,
      byToken: {} as Record<string, { total: number; venues: Record<string, number> }>,
      avgRoutingTimeMs: 0,
      successRate: 100, // All records here are successful routes
    };

    let totalRoutingTime = 0;

    for (const record of routingHistory) {
      // Count by venue
      stats.byVenue[record.selected_venue] = (stats.byVenue[record.selected_venue] || 0) + 1;

      // Count by token
      if (!stats.byToken[record.token_symbol]) {
        stats.byToken[record.token_symbol] = { total: 0, venues: {} };
      }
      stats.byToken[record.token_symbol].total++;
      stats.byToken[record.token_symbol].venues[record.selected_venue] = 
        (stats.byToken[record.token_symbol].venues[record.selected_venue] || 0) + 1;

      // Sum routing time
      if (record.routing_duration_ms) {
        totalRoutingTime += record.routing_duration_ms;
      }
    }

    stats.avgRoutingTimeMs = routingHistory.length > 0
      ? Math.round(totalRoutingTime / routingHistory.length)
      : 0;

    // Get recent routing decisions (last 20)
    const recentRouting = routingHistory.slice(0, 20).map(record => ({
      id: record.id,
      tokenSymbol: record.token_symbol,
      selectedVenue: record.selected_venue,
      routingReason: record.routing_reason,
      checkedVenues: record.checked_venues,
      venueAvailability: record.venue_availability,
      routingDurationMs: record.routing_duration_ms,
      createdAt: record.created_at,
    }));

    return res.status(200).json({
      success: true,
      timeWindow,
      stats,
      recentRouting,
    });
  } catch (error: any) {
    console.error('[VenueRoutingStats] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

