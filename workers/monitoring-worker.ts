#!/usr/bin/env ts-node
/**
 * Monitoring Worker
 * Runs periodic health checks and alerts on issues
 */

import { venueRouterMonitoring } from '../lib/venue-router-monitoring';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MonitoringResult {
  success: boolean;
  timestamp: Date;
  health: any;
  alerts: string[];
  metrics: any;
}

async function runMonitoring(): Promise<MonitoringResult> {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║              📊 AGENT WHERE MONITORING WORKER                 ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const alerts: string[] = [];

  try {
    // Step 1: Health Check
    console.log('[1/4] Running health check...\n');
    const health = await venueRouterMonitoring.getHealthReport();
    
    console.log(`   Overall Status: ${health.overallStatus.toUpperCase()}`);
    console.log(`   Hyperliquid: ${health.venues.hyperliquid.status} (${health.venues.hyperliquid.availableMarkets} markets)`);
    console.log(`   Ostium: ${health.venues.ostium.status} (${health.venues.ostium.availableMarkets} markets)`);
    console.log(`   Routing: ${health.routing.avgRoutingTimeMs}ms avg, ${health.routing.successRate}% success`);
    console.log(`   Database: ${health.database.status} (${health.database.responseTime}ms)`);
    
    // Check for critical issues
    if (health.overallStatus === 'critical') {
      alerts.push(`🔴 CRITICAL: System status is critical!`);
      health.recommendations.forEach(r => alerts.push(r));
    } else if (health.overallStatus === 'degraded') {
      alerts.push(`⚠️  WARNING: System is degraded`);
      health.recommendations.forEach(r => alerts.push(r));
    }

    // Step 2: Check Stale Market Data
    console.log('\n[2/4] Checking market data freshness...\n');
    const staleMarkets = await checkStaleMarkets();
    
    if (staleMarkets.length > 0) {
      console.log(`   ⚠️  Found ${staleMarkets.length} venues with stale data`);
      staleMarkets.forEach(sm => {
        console.log(`   ${sm.venue}: last synced ${sm.hoursSinceSync}h ago`);
        alerts.push(`📅 ${sm.venue} markets stale (${sm.hoursSinceSync}h). Run: npx tsx scripts/sync-${sm.venue.toLowerCase()}-markets.ts`);
      });
    } else {
      console.log(`   ✅ All market data is fresh`);
    }

    // Step 3: Check Position Monitoring
    console.log('\n[3/4] Checking position monitoring...\n');
    const positionHealth = await checkPositionMonitoring();
    
    console.log(`   Open Positions: ${positionHealth.total}`);
    console.log(`   Hyperliquid: ${positionHealth.byVenue.HYPERLIQUID || 0}`);
    console.log(`   Ostium: ${positionHealth.byVenue.OSTIUM || 0}`);
    console.log(`   Stale Positions: ${positionHealth.stalePositions}`);
    
    if (positionHealth.stalePositions > 0) {
      alerts.push(`⚠️  ${positionHealth.stalePositions} positions not updated in 10+ minutes. Check position monitor.`);
    }

    // Step 4: Check Recent Errors
    console.log('\n[4/4] Checking for recent errors...\n');
    const recentErrors = await checkRecentErrors();
    
    console.log(`   Errors (last hour): ${recentErrors.count}`);
    if (recentErrors.count > 0) {
      console.log(`   Recent errors:`);
      recentErrors.errors.slice(0, 3).forEach(e => {
        console.log(`   • ${e.event}: ${e.message}`);
      });
      
      if (recentErrors.count > 10) {
        alerts.push(`🔴 High error rate: ${recentErrors.count} errors in last hour`);
      }
    } else {
      console.log(`   ✅ No recent errors`);
    }

    // Collect metrics
    const metrics = {
      health: health.overallStatus,
      routingTimeMs: health.routing.avgRoutingTimeMs,
      successRate: health.routing.successRate,
      openPositions: positionHealth.total,
      staleMarkets: staleMarkets.length,
      recentErrors: recentErrors.count,
    };

    const duration = Date.now() - startTime;

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 MONITORING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Status: ${health.overallStatus.toUpperCase()}`);
    console.log(`   Alerts: ${alerts.length}`);
    console.log(`   Duration: ${duration}ms`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (alerts.length > 0) {
      console.log('🔔 ALERTS:\n');
      alerts.forEach(alert => console.log(`   ${alert}`));
      console.log('');
    }

    return {
      success: true,
      timestamp: new Date(),
      health,
      alerts,
      metrics,
    };

  } catch (error: any) {
    console.error('\n❌ Monitoring failed:', error.message);
    alerts.push(`🔴 CRITICAL: Monitoring worker failed - ${error.message}`);
    
    return {
      success: false,
      timestamp: new Date(),
      health: null,
      alerts,
      metrics: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check for stale market data
 */
async function checkStaleMarkets() {
  const venues = ['HYPERLIQUID', 'OSTIUM'];
  const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
  const results = [];

  for (const venue of venues) {
    const latestMarket = await prisma.venue_markets.findFirst({
      where: { venue: venue as any },
      orderBy: { last_synced: 'desc' },
      select: { last_synced: true },
    });

    if (latestMarket && latestMarket.last_synced) {
      const timeSinceSync = Date.now() - latestMarket.last_synced.getTime();
      const hoursSinceSync = Math.round(timeSinceSync / (60 * 60 * 1000));
      
      if (timeSinceSync > staleThreshold) {
        results.push({ venue, hoursSinceSync });
      }
    }
  }

  return results;
}

/**
 * Check position monitoring health
 */
async function checkPositionMonitoring() {
  const openPositions = await prisma.positions.findMany({
    where: { status: 'OPEN' },
    select: {
      venue: true,
      opened_at: true,
      // If position was opened > 10 min ago but current_price not updated
    },
  });

  const byVenue = openPositions.reduce((acc, p) => {
    acc[p.venue] = (acc[p.venue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count stale positions (opened > 10 min ago, likely not being monitored)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const stalePositions = openPositions.filter(p => 
    p.opened_at < tenMinutesAgo
  ).length;

  return {
    total: openPositions.length,
    byVenue,
    stalePositions,
  };
}

/**
 * Check recent errors
 */
async function checkRecentErrors() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const errors = await prisma.audit_logs.findMany({
    where: {
      event_name: { in: ['ROUTING_ERROR', 'TRADE_ERROR', 'VENUE_ERROR', 'POSITION_ERROR'] },
      occurred_at: { gte: oneHourAgo },
    },
    orderBy: { occurred_at: 'desc' },
    take: 20,
  });

  return {
    count: errors.length,
    errors: errors.map(e => ({
      event: e.event_name,
      message: (e.payload as any)?.error || 'Unknown error',
      timestamp: e.occurred_at,
    })),
  };
}

// Auto-run if executed directly
if (require.main === module) {
  runMonitoring()
    .then((result) => {
      if (result.success && result.alerts.length === 0) {
        console.log('✅ Monitoring completed successfully - all systems healthy');
        process.exit(0);
      } else {
        console.log(`⚠️  Monitoring completed with ${result.alerts.length} alerts`);
        process.exit(result.success ? 0 : 1);
      }
    })
    .catch((error) => {
      console.error('❌ Monitoring worker failed:', error);
      process.exit(1);
    });
}

export { runMonitoring };

