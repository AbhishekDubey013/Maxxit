/**
 * V3 Venue Router (Agent Where)
 * Intelligently routes trades to best available venue
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RoutingResult {
  selectedVenue: 'HYPERLIQUID' | 'OSTIUM';
  reason: string;
  checkedVenues: string[];
  venueAvailability: Record<string, boolean>;
  durationMs: number;
}

class VenueRouterV3 {
  /**
   * Route trade to best available venue
   */
  async routeToVenue(params: {
    tokenSymbol: string;
    agentId: string;
    requestedVenue: 'MULTI';
  }): Promise<RoutingResult> {
    const startTime = Date.now();
    console.log('[VenueRouterV3] 🎯 Routing:', params);

    try {
      // Get agent's routing config (or use global default)
      const config = await this.getRoutingConfig(params.agentId);
      console.log('[VenueRouterV3] Config:', config);

      const venueAvailability: Record<string, boolean> = {};
      const checkedVenues: string[] = [];

      // Check each venue in priority order
      for (const venue of config.venue_priority) {
        checkedVenues.push(venue);

        const isAvailable = await this.checkVenueAvailability(
          venue as 'HYPERLIQUID' | 'OSTIUM',
          params.tokenSymbol
        );

        venueAvailability[venue] = isAvailable;

        if (isAvailable) {
          const durationMs = Date.now() - startTime;
          console.log(`[VenueRouterV3] ✅ Selected ${venue} (${durationMs}ms)`);

          return {
            selectedVenue: venue as 'HYPERLIQUID' | 'OSTIUM',
            reason: `${venue}: pair available`,
            checkedVenues,
            venueAvailability,
            durationMs,
          };
        }
      }

      // No venue available
      throw new Error(
        `No venue available for ${params.tokenSymbol}. ` +
        `Checked: ${checkedVenues.join(', ')}`
      );
    } catch (error: any) {
      console.error('[VenueRouterV3] ❌ Routing failed:', error.message);
      throw error;
    }
  }

  /**
   * Get routing config for agent (or global default)
   */
  private async getRoutingConfig(agentId: string) {
    // Try agent-specific config first
    const agentConfig = await prisma.$queryRaw<any[]>`
      SELECT * FROM venue_routing_config_v3 
      WHERE agent_id = ${agentId}::uuid 
      LIMIT 1;
    `;

    if (agentConfig.length > 0) {
      return agentConfig[0];
    }

    // Fall back to global default
    const globalConfig = await prisma.$queryRaw<any[]>`
      SELECT * FROM venue_routing_config_v3 
      WHERE agent_id IS NULL 
      LIMIT 1;
    `;

    if (globalConfig.length > 0) {
      return globalConfig[0];
    }

    // Hardcoded fallback
    return {
      venue_priority: ['HYPERLIQUID', 'OSTIUM'],
      routing_strategy: 'FIRST_AVAILABLE',
      failover_enabled: true,
    };
  }

  /**
   * Check if token pair is available on venue
   */
  private async checkVenueAvailability(
    venue: 'HYPERLIQUID' | 'OSTIUM',
    tokenSymbol: string
  ): Promise<boolean> {
    try {
      const markets = await prisma.$queryRaw<any[]>`
        SELECT id FROM venue_markets 
        WHERE venue = ${venue}
        AND symbol = ${tokenSymbol}
        LIMIT 1;
      `;

      return markets.length > 0;
    } catch (error) {
      console.error(`[VenueRouterV3] Error checking ${venue}:`, error);
      return false;
    }
  }

  /**
   * Log routing decision to history
   */
  async logRoutingDecision(params: {
    signalId: string;
    tokenSymbol: string;
    requestedVenue: 'MULTI';
    routingResult: RoutingResult;
  }) {
    try {
      await prisma.$queryRaw`
        INSERT INTO venue_routing_history_v3 (
          signal_id,
          token_symbol,
          requested_venue,
          selected_venue,
          routing_reason,
          checked_venues,
          venue_availability,
          routing_duration_ms
        ) VALUES (
          ${params.signalId}::uuid,
          ${params.tokenSymbol},
          ${params.requestedVenue},
          ${params.routingResult.selectedVenue},
          ${params.routingResult.reason},
          ${params.routingResult.checkedVenues}::TEXT[],
          ${JSON.stringify(params.routingResult.venueAvailability)}::JSONB,
          ${params.routingResult.durationMs}
        );
      `;

      console.log('[VenueRouterV3] 📝 Routing decision logged');
    } catch (error: any) {
      console.error('[VenueRouterV3] ⚠️  Failed to log routing:', error.message);
      // Don't throw - this is just logging
    }
  }
}

export const venueRouterV3 = new VenueRouterV3();

