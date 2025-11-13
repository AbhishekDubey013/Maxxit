/**
 * Venue Router Monitoring & Health Checks
 * Comprehensive monitoring for Agent Where routing system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface VenueHealth {
  venue: string;
  status: 'healthy' | 'degraded' | 'down';
  availableMarkets: number;
  lastSync: Date | null;
  responseTime?: number;
  error?: string;
}

export interface RoutingHealthReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  venues: {
    hyperliquid: VenueHealth;
    ostium: VenueHealth;
  };
  routing: {
    avgRoutingTimeMs: number;
    totalRoutingDecisions: number;
    successRate: number;
    failureRate: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  recommendations: string[];
}

export class VenueRouterMonitoring {
  /**
   * Get comprehensive health report for Agent Where system
   */
  async getHealthReport(): Promise<RoutingHealthReport> {
    const startTime = Date.now();
    
    try {
      // Check database connectivity
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStart;

      // Check venue health
      const [hyperliquidHealth, ostiumHealth] = await Promise.all([
        this.checkVenueHealth('HYPERLIQUID'),
        this.checkVenueHealth('OSTIUM'),
      ]);

      // Check routing performance (last hour)
      const routingStats = await this.getRoutingStats('hour');

      // Determine overall status
      const overallStatus = this.determineOverallStatus(
        hyperliquidHealth,
        ostiumHealth,
        routingStats
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        hyperliquidHealth,
        ostiumHealth,
        routingStats
      );

      return {
        timestamp: new Date(),
        overallStatus,
        venues: {
          hyperliquid: hyperliquidHealth,
          ostium: ostiumHealth,
        },
        routing: {
          avgRoutingTimeMs: routingStats.avgRoutingTimeMs,
          totalRoutingDecisions: routingStats.total,
          successRate: routingStats.successRate,
          failureRate: routingStats.failureRate,
        },
        database: {
          status: 'connected',
          responseTime: dbResponseTime,
        },
        recommendations,
      };
    } catch (error: any) {
      console.error('[VenueRouterMonitoring] Health check failed:', error);
      return {
        timestamp: new Date(),
        overallStatus: 'critical',
        venues: {
          hyperliquid: { venue: 'HYPERLIQUID', status: 'down', availableMarkets: 0, lastSync: null, error: error.message },
          ostium: { venue: 'OSTIUM', status: 'down', availableMarkets: 0, lastSync: null, error: error.message },
        },
        routing: {
          avgRoutingTimeMs: 0,
          totalRoutingDecisions: 0,
          successRate: 0,
          failureRate: 100,
        },
        database: {
          status: 'disconnected',
          responseTime: Date.now() - startTime,
        },
        recommendations: ['Critical: System health check failed. Investigate database connectivity.'],
      };
    }
  }

  /**
   * Check health of a specific venue
   */
  private async checkVenueHealth(venue: 'HYPERLIQUID' | 'OSTIUM'): Promise<VenueHealth> {
    try {
      const startTime = Date.now();

      // Get market data
      const markets = await prisma.venue_markets.findMany({
        where: { venue },
        select: {
          is_active: true,
          last_synced: true,
        },
      });

      const responseTime = Date.now() - startTime;
      const activeMarkets = markets.filter(m => m.is_active).length;
      const lastSync = markets.length > 0 
        ? markets.reduce((latest, m) => 
            m.last_synced > latest ? m.last_synced : latest, 
            markets[0].last_synced
          )
        : null;

      // Determine status
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      
      if (activeMarkets === 0) {
        status = 'down';
      } else if (activeMarkets < 5) {
        status = 'degraded';
      } else if (lastSync && (Date.now() - lastSync.getTime()) > 24 * 60 * 60 * 1000) {
        // Markets not synced in 24 hours
        status = 'degraded';
      }

      return {
        venue,
        status,
        availableMarkets: activeMarkets,
        lastSync,
        responseTime,
      };
    } catch (error: any) {
      return {
        venue,
        status: 'down',
        availableMarkets: 0,
        lastSync: null,
        error: error.message,
      };
    }
  }

  /**
   * Get routing statistics for a time window
   */
  private async getRoutingStats(timeWindow: 'hour' | 'day' | 'week') {
    const now = new Date();
    const timeFilter = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    }[timeWindow];

    const routingHistory = await prisma.venue_routing_history.findMany({
      where: {
        created_at: { gte: timeFilter },
      },
      select: {
        routing_duration_ms: true,
        selected_venue: true,
      },
    });

    // Get failed signals (skipped due to no venue available)
    const failedSignals = await prisma.signals.findMany({
      where: {
        created_at: { gte: timeFilter },
        venue: 'MULTI',
        skipped_reason: { contains: 'No venue available' },
      },
    });

    const total = routingHistory.length;
    const avgRoutingTimeMs = total > 0
      ? routingHistory.reduce((sum, r) => sum + (r.routing_duration_ms || 0), 0) / total
      : 0;

    const totalAttempts = total + failedSignals.length;
    const successRate = totalAttempts > 0 ? (total / totalAttempts) * 100 : 0;
    const failureRate = 100 - successRate;

    return {
      total,
      avgRoutingTimeMs: Math.round(avgRoutingTimeMs),
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    hyperliquid: VenueHealth,
    ostium: VenueHealth,
    routing: { successRate: number; avgRoutingTimeMs: number }
  ): 'healthy' | 'degraded' | 'critical' {
    // Critical if both venues are down
    if (hyperliquid.status === 'down' && ostium.status === 'down') {
      return 'critical';
    }

    // Critical if routing success rate < 50%
    if (routing.successRate < 50) {
      return 'critical';
    }

    // Degraded if any venue is down or degraded
    if (hyperliquid.status !== 'healthy' || ostium.status !== 'healthy') {
      return 'degraded';
    }

    // Degraded if routing is slow
    if (routing.avgRoutingTimeMs > 200) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    hyperliquid: VenueHealth,
    ostium: VenueHealth,
    routing: { successRate: number; avgRoutingTimeMs: number; total: number }
  ): string[] {
    const recommendations: string[] = [];

    // Venue health recommendations
    if (hyperliquid.status === 'down') {
      recommendations.push('🔴 CRITICAL: Hyperliquid venue is down. Check service availability and sync markets.');
    } else if (hyperliquid.status === 'degraded') {
      recommendations.push('⚠️  WARNING: Hyperliquid venue is degraded. Consider syncing markets: npx tsx scripts/sync-hyperliquid-markets.ts');
    }

    if (ostium.status === 'down') {
      recommendations.push('🔴 CRITICAL: Ostium venue is down. Check service availability and sync markets.');
    } else if (ostium.status === 'degraded') {
      recommendations.push('⚠️  WARNING: Ostium venue is degraded. Consider syncing markets: npx tsx scripts/sync-ostium-markets.ts');
    }

    // Market sync recommendations
    if (hyperliquid.lastSync && (Date.now() - hyperliquid.lastSync.getTime()) > 24 * 60 * 60 * 1000) {
      recommendations.push('📅 Hyperliquid markets not synced in 24 hours. Run: npx tsx scripts/sync-hyperliquid-markets.ts');
    }

    if (ostium.lastSync && (Date.now() - ostium.lastSync.getTime()) > 24 * 60 * 60 * 1000) {
      recommendations.push('📅 Ostium markets not synced in 24 hours. Run: npx tsx scripts/sync-ostium-markets.ts');
    }

    // Routing performance recommendations
    if (routing.avgRoutingTimeMs > 200) {
      recommendations.push('🐌 Routing is slow (avg ' + routing.avgRoutingTimeMs + 'ms). Check database indexes and connection pool.');
    }

    if (routing.successRate < 80 && routing.total > 10) {
      recommendations.push('⚠️  Routing success rate is low (' + routing.successRate + '%). Check venue availability and market data.');
    }

    // If everything is good
    if (recommendations.length === 0) {
      recommendations.push('✅ All systems operational. Agent Where is healthy.');
    }

    return recommendations;
  }

  /**
   * Get detailed routing analytics
   */
  async getRoutingAnalytics(timeWindow: 'hour' | 'day' | 'week') {
    const now = new Date();
    const timeFilter = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    }[timeWindow];

    // Get routing history
    const routingHistory = await prisma.venue_routing_history.findMany({
      where: { created_at: { gte: timeFilter } },
      orderBy: { created_at: 'desc' },
    });

    // Aggregate by venue
    const byVenue = routingHistory.reduce((acc, r) => {
      const venue = r.selected_venue;
      if (!acc[venue]) {
        acc[venue] = { count: 0, totalTime: 0 };
      }
      acc[venue].count++;
      acc[venue].totalTime += r.routing_duration_ms || 0;
      return acc;
    }, {} as Record<string, { count: number; totalTime: number }>);

    // Aggregate by token
    const byToken = routingHistory.reduce((acc, r) => {
      const token = r.token_symbol;
      if (!acc[token]) {
        acc[token] = { count: 0, venues: {} as Record<string, number> };
      }
      acc[token].count++;
      acc[token].venues[r.selected_venue] = (acc[token].venues[r.selected_venue] || 0) + 1;
      return acc;
    }, {} as Record<string, { count: number; venues: Record<string, number> }>);

    // Calculate percentages
    const totalRoutings = routingHistory.length;
    const venueDistribution = Object.entries(byVenue).map(([venue, data]) => ({
      venue,
      count: data.count,
      percentage: totalRoutings > 0 ? (data.count / totalRoutings) * 100 : 0,
      avgRoutingTimeMs: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
    }));

    return {
      timeWindow,
      totalRoutings,
      venueDistribution,
      tokenDistribution: byToken,
      recentRouting: routingHistory.slice(0, 20).map(r => ({
        token: r.token_symbol,
        venue: r.selected_venue,
        reason: r.routing_reason,
        duration: r.routing_duration_ms,
        timestamp: r.created_at,
      })),
    };
  }
}

export const venueRouterMonitoring = new VenueRouterMonitoring();

